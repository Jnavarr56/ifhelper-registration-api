import * as e from 'express';
import * as jwt from 'jsonwebtoken';

import ConfirmationEmailer from '../utils/ConfirmationEmailer';
import RedisManager from '../utils/RedisManager';
import User from '../utils/User';

import BaseController from './BaseController';
import { ConfirmationCodePayload } from '../types/Token';

import {
	EMAIL_CONFIRMATION_CODE_TTL_SECS,
	EMAIL_CONFIRMATION_KEY_PREFIX
} from '../vars';

export default class ConfirmEmailController extends BaseController {
	protected async executeImpl(req: e.Request, res: e.Response): Promise<void> {
		const code: string | undefined = req.body.code;
		if (typeof code !== 'string') return this.missingParams(res, 'code');

		let userToConfirmID: string | undefined;

		let decodedPayload: ConfirmationCodePayload | undefined;

		const cache: RedisManager = new RedisManager(EMAIL_CONFIRMATION_KEY_PREFIX);
		const cachedValue: string | null = await cache.getKey(code);

		if (cachedValue) {
			const cachedValueNumber = Number(cachedValue);
			if (cachedValueNumber) {
				if (cachedValueNumber === 404) this.notFound(res);
				else if (cachedValueNumber === 409) this.conflict(res);
				else if (cachedValueNumber === 410) this.gone(res);
				else this.fail(res, new Error());
				return;
			}

			userToConfirmID = cachedValue;
		} else {
			try {
				const decoder: ConfirmationEmailer = new ConfirmationEmailer();
				decodedPayload = await decoder.decode(code);
				userToConfirmID = decodedPayload._id;
			} catch (error) {
				let errorToCache: number | undefined;

				if (error instanceof jwt.TokenExpiredError) {
					errorToCache = 410;
					this.gone(res);
				} else if (error instanceof jwt.JsonWebTokenError) {
					errorToCache = 404;
					this.notFound(res);
				} else {
					errorToCache = 500;
					this.fail(res, error);
				}
				cache.setKey(code, errorToCache.toString(), 60 * 5);
				return;
			}
		}

		const user: User = new User();
		await user.initByID(userToConfirmID);

		if (!user.exists()) {
			this.notFound(res);
			cache.setKey(code, '404', 60 * 5);
			return;
		}

		if (user.isConfirmed()) {
			this.conflict(res);
			cache.setKey(code, '409', 60 * 5);
			return;
		}

		await user.update({ email_confirmed: true });
		this.ok(res, { first_name: user.getFields().first_name });

		let ttl: number | undefined;
		if (decodedPayload) {
			ttl = Math.ceil(decodedPayload.exp - new Date().getTime() / 1000);
		} else ttl = EMAIL_CONFIRMATION_CODE_TTL_SECS;

		cache.setKey(code, '410', ttl);
		cache.deleteKey(user.getFields().email);
	}
}

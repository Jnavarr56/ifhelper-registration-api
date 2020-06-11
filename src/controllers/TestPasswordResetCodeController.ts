import * as e from 'express';
import * as jwt from 'jsonwebtoken';

import PasswordResetEmailer from '../util/PasswordResetEmailer';
import RedisManager from '../util/RedisManager';
import User from '../util/User';

import BaseController from './BaseController';
import { PasswordResetPayload } from '../types/Token';

import { PASSWORD_RESET_KEY_PREFIX } from '../vars';

export default class TestPasswordResetCodeController extends BaseController {
	protected async executeImpl(req: e.Request, res: e.Response): Promise<void> {
		// 1) make sure code parameter is in request and reject with 400 if not.
		const code: unknown = req.query.code;
		if (typeof code !== 'string') return this.missingParams(res, 'code');

		// 2) to hold manual decode results if not in cache.
		let codePayload: PasswordResetPayload | undefined;

		// 3) check cache for code.
		const cache: RedisManager = new RedisManager(PASSWORD_RESET_KEY_PREFIX);
		// const cachedValue: string | null = await cache.getKey(code);
		const cachedValue = null;

		if (cachedValue) {
			if (Number(cachedValue)) {
				// 3) if in cache and is number then map to an
				// http code response and send.
				if (cachedValue === '404') this.notFound(res);
				else if (cachedValue === '410') this.gone(res);
				else this.fail(res, new Error());
			} else {
				// 3) if in cache and is not number the code is valid.
				this.ok(res);
			}

			return;
		} else {
			// 3) if not in cache then attempt a manual decoding.
			try {
				codePayload = await new PasswordResetEmailer().decode(code);
			} catch (error) {
				let errorToCache: string | undefined;
				if (error instanceof jwt.TokenExpiredError) {
					errorToCache = '410';
					this.gone(res);
				} else if (error instanceof jwt.JsonWebTokenError) {
					errorToCache = '404';
					this.notFound(res);
				} else {
					errorToCache = '500';
					this.fail(res, error);
				}

				await cache.setKey(code, errorToCache, 60 * 5);
				return;
			}
		}

		// 4) attempt to locate the user that matches the id in the code
		// payload. if doesn't exist return 404.
		const user: User = new User();
		await user.initByID(codePayload._id);
		if (!user.exists()) {
			this.notFound(res);
			await cache.setKey(code, '404', 60 * 5);
			return;
		}

		//5) respond with 200 if all good.
		this.ok(res);

		// we can calculate that the amount of time that the
		// code can be cached as being at most 15 mins but never
		// more than its remaining lifespan.
		const ttl: number = Math.min(
			Math.ceil(codePayload.exp - new Date().getTime() / 1000),
			60 * 15
		);
		cache.setKey(code, user.getFields()._id, ttl);
	}
}

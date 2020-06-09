import * as e from 'express';
import * as jwt from 'jsonwebtoken';

import PasswordResetEmailer from '../util/PasswordResetEmailer';
import User from '../util/User';
import RedisManager from '../util/RedisManager';

import BaseController from './BaseController';
import { PasswordResetPayload } from '../types/Token';

import {
	PASSWORD_RESET_KEY_PREFIX,
	PASSWORD_RESET_CODE_TTL_SECS
} from '../vars';

export default class ResetPasswordController extends BaseController {
	protected async executeImpl(req: e.Request, res: e.Response): Promise<void> {
		// 1) make sure code and password are present and reject with 400 if not.
		const missingParams: string[] = ['code', 'password'].filter(
			(p) => req.body[p] === undefined
		);
		if (missingParams.length > 0) return this.missingParams(res, missingParams);
		const { code, password }: { code: string; password: string } = req.body;

		// 2) set aside to hold contents of payload in case manual decoding needed.
		let codePayload: PasswordResetPayload | undefined;
		// 3) set aside to hold string id of we will use to query users db.
		let userToResetID: string | undefined;

		// 4) check cache for code.
		const cache: RedisManager = new RedisManager(PASSWORD_RESET_KEY_PREFIX);
		const cachedValue: string | null = await cache.getKey(code);

		if (cachedValue) {
			if (Number(cachedValue)) {
				// 5) if in cache and is number then map to an
				// http code response and send.
				if (cachedValue === '404') this.notFound(res);
				else if (cachedValue === '410') this.gone(res);
				else this.fail(res, new Error());
				return;
			} else {
				// 5) if is in cache and is not number then this is relevant user id.
				userToResetID = cachedValue;
			}
		} else {
			try {
				// 5) if not in cache perform manual decoding and set query id to id in
				// decoding results.
				codePayload = await new PasswordResetEmailer().decode(code);
				userToResetID = codePayload._id;
			} catch (error) {
				// map error type to a response and cache
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

		// 3) attempt to locate the user that matches the id in the code
		// payload.
		const user: User = new User();
		await user.initByID(userToResetID);

		// 4) 404 if user doesn't exit.
		if (!user.exists()) {
			this.notFound(res);
			await cache.setKey(code, '404', 60 * 5);
			return;
		}

		// 6) attempt to reset user password.
		await user.update({ password });

		// 7) if it went well then return with a 200.
		this.ok(res, { first_name: user.getFields().first_name });

		let ttl: number | undefined;
		if (codePayload) {
			ttl = Math.ceil(codePayload.exp - Date.now() / 1000);
		} else {
			const remaining: number | null = await cache.getTTL(code);
			ttl = remaining
				? PASSWORD_RESET_CODE_TTL_SECS - (60 * 15 - remaining)
				: PASSWORD_RESET_CODE_TTL_SECS;
		}
		await cache.setKey(code, '410', ttl);
	}
}

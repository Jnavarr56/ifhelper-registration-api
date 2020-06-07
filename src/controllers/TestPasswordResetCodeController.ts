import * as e from 'express';
import * as jwt from 'jsonwebtoken';

import PasswordResetEmailer from '../utils/PasswordResetEmailer';
import RedisManager from '../utils/RedisManager';
import User from '../utils/User';

import BaseController from './BaseController';
import { PasswordResetPayload } from '../types/Token';

import {
	PASSWORD_RESET_KEY_PREFIX,
	PASSWORD_RESET_CODE_TTL_SECS
} from '../vars';

export default class TestPasswordResetCodeController extends BaseController {
	protected async executeImpl(req: e.Request, res: e.Response): Promise<void> {
		// 1) make sure code parameter is in request and reject with 400 if not.
		const code: unknown = req.query.code;
		if (typeof code !== 'string') return this.missingParams(res, 'code');

		// 2) to hold manual decode results.
		let codePayload: PasswordResetPayload | undefined;

		// 3) check cache for code.
		const cache: RedisManager = new RedisManager(PASSWORD_RESET_KEY_PREFIX);
		const cachedValue: string | null = await cache.getKey(code);

		if (cachedValue) {
			if (Number(cachedValue)) {
				// 3) if in cache and is number then map to an
				// http code response and send.
				if (cachedValue === '404') this.notFound(res);
				else if (cachedValue === '409') this.conflict(res);
				else if (cachedValue === '410') this.gone(res);
				else this.fail(res, new Error());
			} else {
				// 3) if in cache and is not number the code is valid.
				return this.ok(res);
			}

			return;
		} else {
			try {
				codePayload = await new PasswordResetEmailer().decode(code);
			} catch (error) {
				if (error instanceof jwt.TokenExpiredError) this.gone(res);
				else if (error instanceof jwt.JsonWebTokenError) this.notFound(res);
				else this.fail(res, error);
				return;
			}
		}

		// 5) attempt to locate the user that matches the id in the code
		// payload. if doesn't exist return 404.
		const user: User = new User();
		await user.initByID(codePayload._id);
		if (!user.exists()) {
			this.notFound(res);
			cache.setKey(code, '404', 60 * 5);
			return;
		}

		//6) respond with 200 if good.
		this.ok(res);

		const ttl: number = Math.min(
			Math.ceil(codePayload.exp - new Date().getTime() / 1000),
			60 * 15
		);
		cache.setKey(code, user.getFields()._id, ttl);
	}
}

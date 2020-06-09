import * as e from 'express';
import * as jwt from 'jsonwebtoken';

import ConfirmationEmailer from '../util/ConfirmationEmailer';
import RedisManager from '../util/RedisManager';
import User from '../util/User';

import BaseController from './BaseController';
import { ConfirmationCodePayload } from '../types/Token';

import {
	EMAIL_CONFIRMATION_CODE_TTL_SECS,
	EMAIL_CONFIRMATION_KEY_PREFIX
} from '../vars';

export default class ConfirmEmailController extends BaseController {
	protected async executeImpl(req: e.Request, res: e.Response): Promise<void> {
		// 1) make sure code parameter is in request body, send 400 if not.
		const code: string | undefined = req.body.code;
		if (typeof code !== 'string') return this.missingParams(res, 'code');

		// 2) set aside to hold a string we will use to query the user that
		// matches the code.
		let userToConfirmID: string | undefined;

		// 3) set aside to hold contents of the code in the event
		// we have to perform a manual decoding.
		let decodedPayload: ConfirmationCodePayload | undefined;

		// 4) check cache for the code.
		const cache: RedisManager = new RedisManager(EMAIL_CONFIRMATION_KEY_PREFIX);
		const cachedValue: string | null = await cache.getKey(code);

		if (cachedValue) {
			// 5) if in cache, see if is any of these numbers, in which case
			// it represents an error code. respond with that code.
			if (Number(cachedValue)) {
				if (cachedValue === '404') this.notFound(res);
				else if (cachedValue === '409') this.conflict(res);
				else if (cachedValue === '410') this.gone(res);
				else this.fail(res, new Error());
				return;
			}

			userToConfirmID = cachedValue;
		} else {
			// 5) try to decode token manually. if successful, then
			// extract _id property and use it as the id to query
			// the users api.
			try {
				decodedPayload = await new ConfirmationEmailer().decode(code);

				userToConfirmID = decodedPayload._id;
			} catch (error) {
				let httpCode: string | undefined;
				if (error instanceof jwt.TokenExpiredError) {
					httpCode = '410';
					this.gone(res);
				} else if (error instanceof jwt.JsonWebTokenError) {
					httpCode = '404';
					this.notFound(res);
				} else {
					httpCode = '500';
					this.fail(res, error);
				}

				// cache the error
				cache.setKey(code, httpCode, 60 * 5);
				return;
			}
		}

		// 6) try to locate user.
		const user: User = new User();
		await user.initByID(userToConfirmID);

		if (!user.exists()) {
			// 7) if doens't exist return 404.
			this.notFound(res);
			cache.setKey(code, '404', 60 * 5);
			return;
		} else if (user.isConfirmed()) {
			// 7) return conflict if user exists but is already confirmed.
			this.conflict(res);
			cache.setKey(code, '409', 60 * 5);
			return;
		}

		//8) confirm user email and send back user's first name.
		await user.update({ email_confirmed: true });
		this.ok(res, { first_name: user.getFields().first_name });

		// if token was decoded we got iat/exp so we can set it in
		// the cache for its exactly remaining life. otherwise, we
		// can calculate how long it has been alive by subtracting its
		// current ttl from 15 (the initial ttl) and subtracting that from
		// 1 hour.
		let ttl: number;
		if (decodedPayload) {
			ttl = Math.ceil(decodedPayload.exp - new Date().getTime() / 1000);
		} else {
			const remaining: number | null = await cache.getTTL(code);
			ttl = remaining
				? EMAIL_CONFIRMATION_CODE_TTL_SECS - (60 * 15 - remaining)
				: EMAIL_CONFIRMATION_CODE_TTL_SECS;
		}

		// since code has been used, set it in the cache and match it to
		// a "gone" error.
		cache.setKey(code, '410', ttl);
		// delete from confirm email timeout cache
		cache.deleteKey(user.getFields().email);
	}
}

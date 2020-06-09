import * as e from 'express';

import PasswordResetEmailer from '../util/PasswordResetEmailer';
import User from '../util/User';
import RedisManager from '../util/RedisManager';

import BaseController from './BaseController';

import {
	PASSWORD_RESET_KEY_PREFIX,
	PASSWORD_RESET_EMAIL_TIMEOUT_SECS
} from '../vars';

export default class SendPasswordResetEmailController extends BaseController {
	protected async executeImpl(req: e.Request, res: e.Response): Promise<void> {
		// 1) make sure that email parameter is present and if not return a 400.
		const email: string | undefined = req.body.email;
		if (!email) return this.missingParams(res, 'email');

		// 2) search the cache for this email. if present indicates email was
		// sent recently.
		const cache: RedisManager = new RedisManager(PASSWORD_RESET_KEY_PREFIX);
		if (await cache.getKey(email)) return this.tooManyRequests(res);

		// 3) try to locate the user via the supplied email parameter.
		const user: User = new User();
		await user.initByEmail(email);

		// 4) make sure user exists and send 404 if they do not.
		if (!user.exists()) return this.notFound(res);

		// 5) send email.
		new PasswordResetEmailer()
			.sendEmail(user)
			.then((passwordResetCode: string) => {
				// send 200 on receipt
				this.ok(res);

				const cache: RedisManager = new RedisManager(PASSWORD_RESET_KEY_PREFIX);

				/// cache the password reset code for 15 mins to speed up decoding process.
				cache.setKey(passwordResetCode, user.getFields()._id, 60 * 15);
				// set the email as a key in the cache for EMAIL_PASSWORD_RESET_EMAIL_TIMEOUT_SECS
				// to prevent too many requests.
				cache.setKey(
					email,
					new Date().toString(),
					PASSWORD_RESET_EMAIL_TIMEOUT_SECS
				);
			})
			.catch((error) => this.fail(res, error));
	}
}

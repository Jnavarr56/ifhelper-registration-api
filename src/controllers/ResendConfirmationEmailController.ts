import * as e from 'express';

import RedisManager from '../utils/RedisManager';
import ConfirmationEmailer from '../utils/ConfirmationEmailer';
import User from '../utils/User';

import BaseController from './BaseController';

import {
	EMAIL_CONFIRMATION_KEY_PREFIX,
	EMAIL_CONFIRMATION_EMAIL_TIMEOUT_SECS
} from '../vars';

export default class ResendConfirmationEmailController extends BaseController {
	protected async executeImpl(req: e.Request, res: e.Response): Promise<void> {
		// 1) make sure that email parameter is present and if not return a 400.
		const email: string | undefined = req.body.email;
		if (!email) return this.missingParams(res, 'email');

		// 2) if email is a key in cache, then email was sent recently, return 429.
		const cache: RedisManager = new RedisManager(EMAIL_CONFIRMATION_KEY_PREFIX);
		if (await cache.getKey(email)) return this.tooManyRequests(res);

		// 2) try to locate the user via the supplied email parameter.
		const user: User = new User();
		await user.initByEmail(email);

		// 3) check if user exists and send 404 if it does not.
		if (!user.exists()) return this.notFound(res);

		// 4) check if user's email is already confirmed and send 409 if it is.
		if (user.isConfirmed()) return this.conflict(res);

		// 5) send confirmation email.
		new ConfirmationEmailer()
			.sendEmail(user)
			.then(async (confirmationCode: string) => {
				// send 200 upon receipt.
				this.ok(res);

				// cache the code for 15 mins to speed up the decoding process.
				cache.setKey(confirmationCode, user.getFields()._id, 60 * 15);
				// set the email as a key in the cache for EMAIL_CONFIRMATION_EMAIL_TIMEOUT_SECS
				// to prevent too many requests.
				cache.setKey(
					email,
					new Date().toString(),
					EMAIL_CONFIRMATION_EMAIL_TIMEOUT_SECS
				);
			})
			.catch((error) => this.fail(res, error));
	}
}

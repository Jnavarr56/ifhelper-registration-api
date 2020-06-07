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

		const cache: RedisManager = new RedisManager(EMAIL_CONFIRMATION_KEY_PREFIX);
		if (await cache.getKey(email)) return this.tooManyRequests(res);

		// 2) try to locate the user via the supplied email parameter.
		const user: User = new User();
		await user.initByEmail(email);

		// 3) make sure user exists and send 404 if it does not.
		if (!user.exists()) return this.notFound(res);

		// 4) make sure user's email is confirmed and send 409 if it is not.
		if (user.isConfirmed()) return this.conflict(res);

		new Date(Date.now() + 1000 * 60 * 5).toString();
		// 5) send confirmation email.
		new ConfirmationEmailer()
			.sendEmail(user)
			.then(async (confirmationCode: string) => {
				this.ok(res);
				cache.setKey(confirmationCode, user.getFields()._id, 60 * 15);
				cache.setKey(
					email,
					new Date().toString(),
					EMAIL_CONFIRMATION_EMAIL_TIMEOUT_SECS
				);
			})
			.catch((error) => this.fail(res, error));
	}
}

import * as e from 'express';

import RedisManager from '../util/RedisManager';
import ConfirmationEmailer from '../util/ConfirmationEmailer';
import User from '../util/User';

import BaseController from './BaseController';

import {
	EMAIL_CONFIRMATION_KEY_PREFIX,
	EMAIL_CONFIRMATION_EMAIL_TIMEOUT_SECS
} from '../vars';

export default class SendUpdateEmailConfirmationController extends BaseController {
	protected async executeImpl(req: e.Request, res: e.Response): Promise<void> {
		// 1) make sure that email parameter is present and if not return a 400.
		const missingParams: string[] = ['user_id', 'new_email'].filter(
			(p) => req.body[p] === undefined
		);
		if (missingParams.length > 0) return this.missingParams(res, missingParams);
		const {
			user_id,
			new_email
		}: { user_id: string; new_email: string } = req.body;

		// 2) if email is a key in cache, then email was sent too recently, return 429.
		const cache: RedisManager = new RedisManager(
			EMAIL_CONFIRMATION_KEY_PREFIX + 'NEW_EMAIL'
		);
		const cachedVal: string | null = await cache.getKey(user_id + new_email);
		if (cachedVal) {
			return this.tooManyRequests(res, `Last sent at: ${new Date(cachedVal)}`);
		}

		// 2) try to locate the user via the supplied user_id parameter.
		const user: User = new User();
		await user.initByID(user_id);

		// 3) check if user exists and send 404 if it does not.
		if (!user.exists()) return this.notFound(res);

		// 4) check if user's email is already updated and send 409 if it is.
		if (user.getFields().email === new_email)
			return this.conflict(res, 'New email same as current email');

		// 5) make sure newEmail is available
		const userNewEmailCheck: User = new User();
		await userNewEmailCheck.initByEmail(new_email);
		if (userNewEmailCheck.exists()) {
			return this.conflict(res, ' New email unavailable');
		}

		// 5) send confirmation email.
		new ConfirmationEmailer()
			.sendEmail(user, new_email)
			.then(async (confirmationCode: string) => {
				// send 200 upon receipt.
				this.ok(res);

				// cache the code for 15 mins to speed up the decoding process.
				cache.setKey(confirmationCode, user_id + 'NEW_EMAIL' + new_email, 60 * 15);
				// set the new user id and new email as a key in the cache for EMAIL_CONFIRMATION_EMAIL_TIMEOUT_SECS
				// to prevent too many requests.
				cache.setKey(
					user_id + new_email,
					new Date().toString(),
					EMAIL_CONFIRMATION_EMAIL_TIMEOUT_SECS
				);
			})
			.catch((error) => this.fail(res, error));
	}
}

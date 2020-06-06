import * as e from 'express';

import PasswordResetEmailer from '../utils/PasswordResetEmailer';
import User from '../utils/User';

import BaseController from './BaseController';

export default class SendPasswordResetEmailController extends BaseController {
	protected async executeImpl(req: e.Request, res: e.Response): Promise<void> {
		// 1) make sure that email parameter is present and if not return a 400.
		const email: string | undefined = req.body.email;
		if (!email) return this.missingParams(res, 'email');

		// 2) try to locate the user via the supplied email parameter.
		const user: User = new User();
		await user.initByEmail(email);

		// 3) make sure user exists and send 404 if it does not.
		if (!user.exists()) return this.notFound(res);

		// 4) make sure user's email is confirmed and send 409 if it is not.
		if (user.isConfirmed()) return this.conflict(res);

		// 5) send confirmation email.
		new PasswordResetEmailer()
			.sendEmail(user)
			.then(() => this.ok(res))
			.catch((error) => this.fail(res, error));
	}
}

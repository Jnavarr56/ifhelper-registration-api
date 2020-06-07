import * as e from 'express';

import PasswordResetEmailer from '../utils/PasswordResetEmailer';
import User from '../utils/User';

import BaseController from './BaseController';

export default class SendPasswordResetEmailController extends BaseController {
	private static passwordResetEmailer: PasswordResetEmailer = new PasswordResetEmailer();
	protected async executeImpl(req: e.Request, res: e.Response): Promise<void> {
		// 1) make sure that email parameter is present and if not return a 400.
		const email: string | undefined = req.body.email;
		if (!email) return this.missingParams(res, 'email');

		// 2) try to locate the user via the supplied email parameter.
		const user: User = new User();
		await user.initByEmail(email);

		// 3) make sure user exists and send 404 if they do not.
		if (!user.exists()) return this.notFound(res);

		// 5) send email.
		SendPasswordResetEmailController.passwordResetEmailer
			.sendEmail(user)
			.then(() => this.ok(res))
			.catch((error) => this.fail(res, error));
	}
}

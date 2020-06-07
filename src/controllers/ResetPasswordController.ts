import * as e from 'express';
import * as jwt from 'jsonwebtoken';

import PasswordResetEmailer from '../utils/PasswordResetEmailer';
import User from '../utils/User';

import BaseController from './BaseController';
import { PasswordResetPayload } from '../types/Token';

export default class ResetPasswordController extends BaseController {
	private static passwordResetEmailer: PasswordResetEmailer = new PasswordResetEmailer();
	protected async executeImpl(req: e.Request, res: e.Response): Promise<void> {
		// 1) make sure code paramater and password parameter are in request and reject with 400 if not.
		const code: string | undefined = req.body.code;
		const password: string | undefined = req.body.password;
		if (!code || !password) return this.missingParams(res, ['code', 'password']);

		// 2) set aside to hold contents of payload in case manual decode needed.
		let codePayload: PasswordResetPayload | undefined;
		// 3) set aside to hold string id of user we will query.
		let userToResetID: string | undefined;

		// 4) check cache for code.
		try {
			codePayload = await ResetPasswordController.passwordResetEmailer.decode(
				code
			);
		} catch (error) {
			if (error instanceof jwt.TokenExpiredError) {
				// if code (token) expired than return 410.
				return this.gone(res);
			} else if (error instanceof jwt.JsonWebTokenError) {
				// if there was any other reason the jwt is invalid then return 404.
				return this.notFound(res);
			}
			// any other error would be an unknown issue so return 500.
			return this.fail(res, error);
		}

		// 3) attempt to locate the user that matches the id in the code
		// payload.
		const user: User = new User();
		await user.initByID(codePayload._id);

		// 4) 404 if user doesn't exit.
		if (!user.exists()) return this.notFound(res);

		// 6) attempt to reset user password.
		await user.update({ password });

		// 7) if it went well then return with a 200.
		this.ok(res, { first_name: user.getFields().first_name });
	}
}

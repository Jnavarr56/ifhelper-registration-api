import * as e from 'express';
import * as jwt from 'jsonwebtoken';

import ConfirmationEmailer from '../utils/ConfirmationEmailer';
import User from '../utils/User';

import BaseController from './BaseController';
import { ConfirmationCodePayload } from '../types/Token';

export default class ConfirmEmailController extends BaseController {
	protected async executeImpl(req: e.Request, res: e.Response): Promise<void> {
		// 1) make sure code paramater is in request and reject with 400 if not.
		const code: unknown = req.query.code;
		if (typeof code !== 'string') return this.missingParams(res, 'code');

		// 2) attempt to decode the code to obtain the relevant user id in the payload.
		let codePayload: ConfirmationCodePayload;

		try {
			codePayload = await new ConfirmationEmailer().decode(code);
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

		// 4) 404 if user doesn't exit, 409 if user already confirmed.
		if (!user.exists()) return this.notFound(res);
		if (user.isConfirmed()) return this.conflict(res);

		// 5) if user exists and isn't already confirmed attempt to
		// confirm them.
		await user.update({ email_confirmed: true });

		// 6) if it went well then send back the user's first name
		// with a 200.
		this.ok(res, { first_name: user.getFields().first_name });
	}
}

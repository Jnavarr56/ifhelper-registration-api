import * as e from 'express';

import ConfirmationEmailer from '../utils/ConfirmationEmailer';
import User from '../utils/User';

import { CreateUserInput } from '../types/User';

import BaseController from './BaseController';

export default class SignUpController extends BaseController {
	protected async executeImpl(req: e.Request, res: e.Response): Promise<void> {
		//1 ) extract request parameters and initialize a users client.
		const newUserData: CreateUserInput = req.body;
		const newUser = new User();

		// 2) attempt to create user with request parameters.
		// if can't then throw error. if error is not from
		// users api or it isn't related to params/syntax then
		// send 500 to client. otherwise, forward the actual error
		// to the client.
		try {
			await newUser.create(newUserData);
			if (!newUser.exists()) throw new Error('Problem Creating User');
		} catch (error) {
			if (!error.response || error.response.status !== 400)
				return this.fail(res, error);
			res.status(error.response.status).json(error.response.data);
			return;
		}

		// 3) initialize emailer and send email.
		new ConfirmationEmailer()
			.sendEmail(newUser)
			.then(() => this.ok(res))
			.catch((error) => this.fail(res, error));
	}
}

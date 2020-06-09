import * as e from 'express';

import ConfirmationEmailer from '../util/ConfirmationEmailer';
import User from '../util/User';
import RedisManager from '../util/RedisManager';

import { CreateUserInput } from '../types/User';

import BaseController from './BaseController';

import { EMAIL_CONFIRMATION_KEY_PREFIX } from '../vars';

export default class SignUpController extends BaseController {
	protected async executeImpl(req: e.Request, res: e.Response): Promise<void> {
		//1 ) extract request parameters and initialize a users client.
		const newUserData: CreateUserInput = req.body;
		const newUser = new User();

		// 2) attempt to create user with request parameters.
		try {
			await newUser.create(newUserData);
			if (!newUser.exists()) throw new Error('Problem creating user');
		} catch (error) {
			if (!error.response || error.response.status !== 400)
				return this.fail(res, error);
			// forward error from users api
			res.status(error.response.status).json(error.response.data);
			return;
		}

		// 3) send confirmation code email.
		new ConfirmationEmailer()
			.sendEmail(newUser)
			.then(async (confirmationCode: string) => {
				// send 200 upon email receipt.
				this.ok(res);

				// cache the code for 15 mins to speed up the decoding process.
				const cache: RedisManager = new RedisManager(EMAIL_CONFIRMATION_KEY_PREFIX);
				cache.setKey(confirmationCode, newUser.getFields()._id, 60 * 15);
			})
			.catch((error) => this.fail(res, error));
	}
}

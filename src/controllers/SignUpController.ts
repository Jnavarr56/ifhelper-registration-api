import * as e from 'express';

import ConfirmationEmailer from '../utils/ConfirmationEmailer';
import User from '../utils/User';
import RedisManager from '../utils/RedisManager';

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
			if (!newUser.exists()) throw new Error('Problem Creating User');
		} catch (error) {
			if (!error.response || error.response.status !== 400)
				return this.fail(res, error);
			// forward error from users api
			res.status(error.response.status).json(error.response.data);
			return;
		}

		// 3) Send confirmation code email.
		new ConfirmationEmailer()
			.sendEmail(newUser)
			.then(async (confirmationCode: string) => {
				this.ok(res);

				const cache: RedisManager = new RedisManager(EMAIL_CONFIRMATION_KEY_PREFIX);
				cache.setKey(confirmationCode, newUser.getFields()._id, 60 * 15);
			})
			.catch((error) => this.fail(res, error));
	}
}

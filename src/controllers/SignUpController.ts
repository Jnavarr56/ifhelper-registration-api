import * as e from 'express';
import axios, { AxiosResponse, AxiosError } from 'axios';

import { USERS_API } from '../vars';

import RabbitMQAuthMessenger from '../utils/RabbitMQAuthMessenger';
import BaseController from './BaseController';

export default class SignUpController extends BaseController {
	protected async executeImpl(req: e.Request, res: e.Response): Promise<void> {
		const authMessenger: RabbitMQAuthMessenger = new RabbitMQAuthMessenger();
		const token: string = await authMessenger.requestAuthorizationToken();

		const config = {
			headers: {
				Authorization: `Bearer ${token}`
			}
		};

		axios
			.get(USERS_API, config)
			.then((response: AxiosResponse) => {
				this.ok(res, response.data);
			})
			.catch(() => this.fail(res, new Error('Problem Creating Account')));
	}
}

import axios, { AxiosError } from 'axios';
import RabbitMQAuthMessenger from '../utils/RabbitMQAuthMessenger';

import {
	UserFields,
	CreateUserInput,
	UpdateUserInput,
	CreateUserResponse,
	UpdateUserResponse,
	QueryUsersResponse,
	GetUserResponse
} from '../types/User';
import { AuthorizedConfig } from '../types';

import { USERS_API } from '../vars';

export default class User {
	private user: UserFields | null = null;

	public exists(): boolean {
		return this.user !== null;
	}

	public getFields(): UserFields {
		if (!this.user) throw new Error('User Not Initialized');
		return this.user;
	}

	public isConfirmed(): boolean {
		if (!this.user) throw new Error('User Not Initialized');
		return this.user.email_confirmed;
	}

	private async generateAuthorizedConfig(): Promise<AuthorizedConfig> {
		const token = await RabbitMQAuthMessenger.requestAuthorizationToken();
		const config: AuthorizedConfig = {
			headers: { Authorization: `Bearer ${token}` }
		};
		return config;
	}

	public async create(newUserData: CreateUserInput): Promise<void> {
		const config: AuthorizedConfig = await this.generateAuthorizedConfig();
		return axios
			.post(USERS_API, newUserData, config)
			.then((response: CreateUserResponse) => {
				const newUser: UserFields = response.data.new_user;
				this.user = newUser;
			});
	}

	public async update(updatedUserData: UpdateUserInput): Promise<void> {
		if (!this.user) throw new Error('User Not Initialized');

		const config: AuthorizedConfig = await this.generateAuthorizedConfig();
		const URL = `${USERS_API}/${this.user._id}`;

		return axios
			.patch(URL, updatedUserData, config)
			.then((response: UpdateUserResponse) => {
				const updatedUser: UserFields = response.data.updated_user;
				this.user = updatedUser;
			});
	}

	public async initByEmail(email: string): Promise<void> {
		const config: AuthorizedConfig = await this.generateAuthorizedConfig();
		const queryURL = `${USERS_API}?email=${email}&limit=1`;

		return axios.get(queryURL, config).then((response: QueryUsersResponse) => {
			const queryResults: UserFields[] = response.data.query_results;
			const user: UserFields | null = queryResults[0] || null;
			this.user = user;
		});
	}

	public async initByID(id: string): Promise<void> {
		const config: AuthorizedConfig = await this.generateAuthorizedConfig();
		const queryURL = `${USERS_API}/${id}`;

		return axios
			.get(queryURL, config)
			.then((response: GetUserResponse) => {
				const user: UserFields = response.data;
				this.user = user;
			})
			.catch((error: AxiosError) => {
				if (!error.response || error.response.status !== 404) {
					throw error;
				}
			});
	}
}

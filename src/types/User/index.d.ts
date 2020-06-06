import { AxiosResponse } from 'axios';

export interface UserFields {
	_id: string;
	google_id: string | null;
	first_name: string;
	last_name: string;
	email: string;
	email_confirmed: boolean;
	password: string;
	active: boolean;
	access_level: 'BASIC' | 'ADMIN' | 'SYS_ADMIN';
	created_at: Date;
	updated_at: Date;
}

export interface CreateUserInput {
	first_name: UserFields['first_name'];
	last_name: UserFields['last_name'];
	email: UserFields['email'];
	password: UserFields['password'];
}

export interface UpdateUserInput {
	email?: UserFields['email'];
	email_confirmed?: UserFields['email_confirmed'];
	password?: UserFields['password'];
	active?: UserFields['active'];
}

export interface QueryUsersResponse extends AxiosResponse {
	data: {
		query_results: UserFields[];
	};
}

export interface GetUserResponse extends AxiosResponse {
	data: UserFields;
}

export interface CreateUserResponse extends AxiosResponse {
	data: {
		new_user: UserFields;
	};
}

export interface UpdateUserResponse extends AxiosResponse {
	data: {
		updated_user: UserFields;
	};
}

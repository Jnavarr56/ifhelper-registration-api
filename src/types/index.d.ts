import { AxiosRequestConfig } from 'axios';

export interface AuthorizedConfig extends AxiosRequestConfig {
	headers: {
		Authorization: string;
	};
}

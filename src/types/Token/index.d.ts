export interface CodePayload {
	_id: string;
	type: string;
}

export interface ConfirmationCodePayload extends CodePayload {
	type: 'CONFIRMATION';
	iat: number;
	exp: number;
}

export interface PasswordResetPayload extends CodePayload {
	type: 'PASSWORD_RESET';
	iat: number;
	exp: number;
}

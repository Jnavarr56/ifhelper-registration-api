export interface CodePayload {
	_id: string;
	type: string;
}

export interface ConfirmationCodePayload extends CodePayload {
	type: 'CONFIRMATION';
}

export interface PasswordResetPayload extends CodePayload {
	type: 'PASSWORD_RESET';
}

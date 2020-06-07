import * as dotenv from 'dotenv';

import { UserFields } from '../types/User';
import { CodePayload, PasswordResetPayload } from '../types/Token';
import { SendMailResponse } from '../types/Email';

import generatePasswordResetEmailHTML from '../email-templates/PasswordReset';
import User from './User';
import Emailer from './Emailer';

import {
	CLIENT_ORIGIN,
	CLIENT_PASSWORD_RESET_CALLBACK_PATH,
	PASSWORD_RESET_CODE_TTL_SECS
} from '../vars';

dotenv.config();

export default class PasswordResetEmailer extends Emailer {
	private generateURL(code: string): string {
		return `${CLIENT_ORIGIN}${CLIENT_PASSWORD_RESET_CALLBACK_PATH}?code=${code}`;
	}
	private getSecret(): string {
		const secret: string | undefined =
			process.env.EMAIL_CONFIRMATION_JWT_SECRET_KEY;
		if (!secret)
			throw new Error('No EMAIL_CONFIRMATION_JWT_SECRET_KEY in Environment');
		return secret;
	}

	public async sendEmail(user: User): Promise<string> {
		const userFields: UserFields = user.getFields();

		const userID: string = userFields._id;
		const userEmail: string = userFields.email;

		const payload: CodePayload = {
			_id: userID,
			type: 'PASSWORD_RESET'
		};
		const secret: string = this.getSecret();

		const code: string = await PasswordResetEmailer.generateBase64EncodedJWT(
			payload,
			secret,
			PASSWORD_RESET_CODE_TTL_SECS
		);

		const passwordResetCodeURL: string = this.generateURL(code);
		const personalizedHTML: string = generatePasswordResetEmailHTML(
			passwordResetCodeURL
		);

		return new Promise((resolve, reject) => {
			PasswordResetEmailer.transporter.sendMail(
				{
					to: userEmail,
					subject: 'Reset Your Password Your Email',
					html: personalizedHTML
				},
				(error: Error | null, info: SendMailResponse) => {
					if (error) reject(error);
					if (info.accepted.includes(userEmail)) resolve(code);
					reject(new Error('No Acccepted Receipt'));
				}
			);
		});
	}

	private isPasswordResetPayload(val: CodePayload): val is PasswordResetPayload {
		return (
			val.type === 'PASSWORD_RESET' &&
			typeof (val as PasswordResetPayload).exp === 'number' &&
			typeof (val as PasswordResetPayload).iat === 'number'
		);
	}
	public async decode(code: string): Promise<PasswordResetPayload> {
		const secret: string = this.getSecret();
		return Emailer.decodeBase64EncodedJWT(code, secret).then(
			(payload: CodePayload) => {
				if (!this.isPasswordResetPayload(payload))
					throw new Error('Payload Not Of Password Reset Type');
				return payload;
			}
		);
	}
}

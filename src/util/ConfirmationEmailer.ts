import * as dotenv from 'dotenv';

import { UserFields } from '../types/User';
import { CodePayload, ConfirmationCodePayload } from '../types/Token';
import { SendMailResponse } from '../types/Email';

import generateConfirmationEmailHTML from '../email-templates/Confirmation';
import generateUpdateConfirmationEmailHTML from '../email-templates/UpdateConfirmation';
import User from './User';
import Emailer from './Emailer';

import {
	CLIENT_ORIGIN,
	CLIENT_EMAIL_CONFIRMATION_CALLBACK_PATH,
	EMAIL_CONFIRMATION_CODE_TTL_SECS
} from '../vars';

dotenv.config();

export default class ConfirmationEmailer extends Emailer {
	private generateURL(code: string): string {
		return `${CLIENT_ORIGIN}${CLIENT_EMAIL_CONFIRMATION_CALLBACK_PATH}?code=${code}`;
	}
	private getSecret(): string {
		const secret: string | undefined =
			process.env.EMAIL_CONFIRMATION_JWT_SECRET_KEY;
		if (!secret)
			throw new Error('No EMAIL_CONFIRMATION_JWT_SECRET_KEY in Environment');
		return secret;
	}

	public async sendEmail(user: User, newEmail?: string): Promise<string> {
		const userFields: UserFields = user.getFields();

		const userID: string = userFields._id;
		const userFirstName: string = userFields.first_name;
		const userEmail: string = newEmail || userFields.email;

		const payload: CodePayload = {
			_id: userID,
			type: 'CONFIRMATION'
		};
		if (newEmail) payload.email = newEmail;
		const secret: string = this.getSecret();

		const code: string = await ConfirmationEmailer.generateBase64EncodedJWT(
			payload,
			secret,
			EMAIL_CONFIRMATION_CODE_TTL_SECS
		);

		const confirmationCodeURL: string = this.generateURL(code);
		const personalizedHTML: string = newEmail
			? generateUpdateConfirmationEmailHTML(code)
			: generateConfirmationEmailHTML(userFirstName, confirmationCodeURL);

		return new Promise((resolve, reject) => {
			ConfirmationEmailer.transporter.sendMail(
				{
					to: userEmail,
					subject: 'Confirm Your Email',
					html: personalizedHTML
				},
				(error: Error | null, info: SendMailResponse) => {
					if (error) reject(new Error('Problem Sending Email'));
					if (info.accepted.includes(userEmail)) resolve(code);
					reject(new Error('No Accepted Receipt'));
				}
			);
		});
	}

	private isConfirmationCodePayload(
		val: CodePayload
	): val is ConfirmationCodePayload {
		return val.type === 'CONFIRMATION' &&
			typeof (val as ConfirmationCodePayload).exp === 'number' &&
			typeof (val as ConfirmationCodePayload).iat === 'number' &&
			(val as ConfirmationCodePayload).email === undefined
			? true
			: typeof (val as ConfirmationCodePayload).email === 'string';
	}
	public async decode(code: string): Promise<ConfirmationCodePayload> {
		const secret: string = this.getSecret();
		return Emailer.decodeBase64EncodedJWT(code, secret).then(
			(payload: CodePayload) => {
				if (!this.isConfirmationCodePayload(payload))
					throw new Error('Payload Not Of Confirmation Type');
				return payload;
			}
		);
	}
}

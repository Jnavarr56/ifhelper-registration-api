import * as dotenv from 'dotenv';
import * as ndm from 'nodemailer';
import * as jwt from 'jsonwebtoken';
import { Base64 } from 'js-base64';

import User from '../util/User';

import { CodePayload } from '../types/Token';

dotenv.config();

export default abstract class Emailer {
	protected static transporter: ndm.Transporter = ndm.createTransport({
		service: 'gmail',
		auth: {
			user: process.env.GMAIL_ADDRESS,
			pass: process.env.GMAIL_PASSWORD
		}
	});

	public abstract async sendEmail(user: User): Promise<string>;
	public abstract async decode(code: string): Promise<CodePayload>;

	private static isCodePayload(val: unknown): val is CodePayload {
		const validID: boolean = typeof (val as CodePayload)._id === 'string';
		const validType: boolean = ['CONFIRMATION', 'PASSWORD_RESET'].includes(
			(val as CodePayload).type
		);

		return validID && validType;
	}

	protected static generateBase64EncodedJWT(
		payload: CodePayload,
		secret: string,
		expiresIn: number
	): Promise<string> {
		const options: jwt.SignOptions = { expiresIn, mutatePayload: true };
		return new Promise((resolve, reject) => {
			jwt.sign(
				payload,
				secret,
				options,
				(error: Error | null, token: string | undefined) => {
					if (error) return reject(error);
					if (!token) return reject(new Error('Token Undefined'));
					const base64EncodedToken: string = Base64.encode(token, true);
					resolve(base64EncodedToken);
				}
			);
		});
	}

	protected static decodeBase64EncodedJWT(
		base64EncodedJWT: string,
		secret: string
	): Promise<CodePayload> {
		const token: string = Base64.decode(base64EncodedJWT);
		return new Promise((resolve, reject) => {
			jwt.verify(
				token,
				secret,
				(error: null | jwt.VerifyErrors, tokenDecoded: unknown) => {
					if (error) reject(error);
					if (this.isCodePayload(tokenDecoded)) resolve(tokenDecoded);
					reject(new Error('Decoded Token Undefined'));
				}
			);
		});
	}
}

const axios = require("axios");
const morgan = require("morgan");
const express = require("express");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const bodyParser = require("body-parser");

const RedisCacheManager = require("./utils/RedisCacheManager");
const { generateSystemAuthToken } = require("./utils/tokens");
const {
	createUser,
	fetchUserByEmail,
	fetchUserById,
	confirmUserEmail,
	updateUserPassword
} = require("./utils/users");

const {
	sendPasswordResetEmail,
	sendConfirmationEmail
} = require("./utils/email");

const { signOutAllDevices } = require("./utils/auth");

require("dotenv").config();

const {
	PORT: ENV_PORT,
	REDIS_PORT: ENV_REDIS_PORT,
	EMAIL_CONFIRMATION_JWT_SECRET_KEY,
	PASSWORD_RESET_JWT_SECRET_KEY,
	GMAIL_ADDRESS,
	GMAIL_PASSWORD,
	REDIS_URL,
	USERS_API = 'http://server/api/users'
} = process.env;

const PORT = ENV_PORT || 3000;
const REDIS_PORT = ENV_REDIS_PORT || 6379;

const API_BASE_URL = typeof process.env.API_BASE_URL === "string" ? process.env.API_BASE_URL : "/api";
const PATHNAME = "/registration";
const API_NAME = API_BASE_URL + PATHNAME;

const tokenCache = new RedisCacheManager({
	port: REDIS_PORT,
	url: REDIS_URL,
	prefix: "AUTHENTICATION_TOKENS"
});

const emailAvailablityCache = new RedisCacheManager({
	port: REDIS_PORT,
	url: REDIS_URL,
	prefix: "EMAIL_AVAILABLITY"
});

const emailConfirmationCache = new RedisCacheManager({
	port: REDIS_PORT,
	url: REDIS_URL,
	prefix: "EMAIL_CONFIRMATION"
});

const resendConfirmationEmailCache = new RedisCacheManager({
	port: REDIS_PORT,
	url: REDIS_URL,
	prefix: "EMAIL_CONFIRMATION_RESEND"
});

const sendPasswordResetEmailCache = new RedisCacheManager({
	port: REDIS_PORT,
	url: REDIS_URL,
	prefix: "EMAIL_RESET"
});

const transporter = nodemailer.createTransport({
	service: "gmail",
	auth: {
		user: GMAIL_ADDRESS,
		pass: GMAIL_PASSWORD
	}
});

const app = express();

app
	.use(bodyParser.urlencoded({ extended: true }))
	.use(bodyParser.json())
	.use(morgan("dev"));

//public
app.get(API_NAME + "/verify-email-availability", async (req, res) => {
	const { email: emailQuery } = req.query;

	if (!emailQuery) {
		return res.status(400).send({ error_code: "EMAIL_PARAMETER_REQUIRED" });
	}

	
	const cachedQueryResult = await emailAvailablityCache.getKey(emailQuery);
	if (cachedQueryResult) return res.send(cachedQueryResult);
	
	const APIQueryURL = USERS_API + `?email=${emailQuery}&limit=1`;
	const token = await generateSystemAuthToken(tokenCache);
	const headers = { Authorization: `Bearer ${token}` };

	axios
		.get(APIQueryURL, { headers })
		.then(async (response) => {
			const { query_results } = response.data;
			const dataToSend = { available: !query_results.length };
			emailAvailablityCache.setKey(emailQuery, dataToSend, 30 * 60);
			res.send(dataToSend);
		})
		.catch((error) => res.status(500).send(error));
});

//public
app.post(API_NAME + "/sign-up", async (req, res) => {
	const { body: signUpData } = req;

	
	createUser(signUpData, tokenCache).then(async new_user => {
		await emailAvailablityCache.deleteKey(new_user.email);

		sendConfirmationEmail(new_user, transporter)
			.then(() => res.send({ new_user }))
			.catch(() => res.status(500).send({ error_code: "PROBLEM SENDING CONFIRMATION EMAIL" }));
	})
	.catch(error =>{
		const { status, data } = error.response;
		if (status !== 500) {
			return res.status(status).send(data);
		}

		throw new Error(error);
	});
});

//public
app.post(API_NAME + "/confirm-email", async (req, res) => {
	const { code } = req.body;

	if (!code) {
		return res.status(400).send({ error_code: "MISSING CONFIRMATION CODE" });
	}

	const cachedVal = await emailConfirmationCache.getKey(code);
	if (cachedVal) return res.send(cachedVal);

	jwt.verify(
		code,
		EMAIL_CONFIRMATION_JWT_SECRET_KEY,
		async (error, decodedCode) => {
			if (error) {
				const { name } = error;
				const error_code = name === "TokenExpiredError" ? "CODE EXPIRED" : "CODE_INVALID";
				const dataToSend = { error_code };
				await emailConfirmationCache.setKey(code, dataToSend, 60 * 30);
				return res.status(401).send(dataToSend);
			}

			const { user_id } = decodedCode;
			const user =  await fetchUserById(user_id, tokenCache);

			if (!user) {
				return res.status(401).send({ error_code: "CODE_INVALID" });
			} else if (user.email_confirmed) {
				return res.status(400).send({ error_code: "EMAIL ALREADY CONFIRMED" });
			} 

			confirmUserEmail(user_id, tokenCache).then(async () => {
				await emailConfirmationCache.setKey(
					code,
					{ error_code: "EMAIL ALREADY CONFIRMED" },
					60 * 15
				);
				res.send({
					message: "SUCCESSFULLY CONFIRMED EMAIL",
					user: {
						email: user.email,
						first_name: user.first_name,
						last_name: user.last_name
					}
				});
			}).catch(error => res.send(500));	
		}
	);
});

//public
app.post(API_NAME + "/resend-confirmation-email", async (req, res) => {
	const { email } = req.body;

	if (!email) {
		return res.status(400).send({ error_code: "MISSING EMAIL" });
	}

	const cachedVal = await resendConfirmationEmailCache.getKey(email);
	console.log(cachedVal);
	if (cachedVal) {
		return res.status(400).send({ error_code: "THROTTLE" });
	}

	const user = await fetchUserByEmail(email, tokenCache);
	if (!user) {
		return res.status(400).send({ error_code: "NO USER ASSOCIATED WITH EMAIL" });
	} else if (user.email_confirmed) {
		return res.status(400).send({ error_code: "EMAIL ALREADY CONFIRMED" });
	}

	sendConfirmationEmail(user, transporter)
		.then(async (response) => {
			await resendConfirmationEmailCache.setKey(
				user.email,
				{ sentAt: new Date() },
				60 * 5
			);
			return res.send({ message: "SUCCESS" });
		})
		.catch((error) => {
			return res
				.status(500)
				.send({ error_code: "PROBLEM SENDING CONFIRMATION EMAIL" });
		});
});

//public
app.post(API_NAME + "/send-password-reset-email", async (req, res) => {
	const { email } = req.body;

	if (!email) {
		return res.status(400).send({ error_code: "MISSING EMAIL" });
	}

	const cachedVal = await sendPasswordResetEmailCache.getKey(email);
	if (cachedVal) {
		return res.status(400).send({ error_code: "THROTTLE" });
	}

	const user = await fetchUserByEmail(email, tokenCache);
	if (!user) {
		return res.status(400).send({ error_code: "NO USER ASSOCIATED WITH EMAIL" });
	}

	sendPasswordResetEmail(user, transporter)
		.then(async (response) => {
			await sendPasswordResetEmailCache.setKey(
				user.email,
				{ sentAt: new Date() },
				60 * 5
			);
			return res.send({ message: "SUCCESS" });
		})
		.catch((error) => {
			console.log(error);
			return res
				.status(500)
				.send({ error_code: "PROBLEM SENDING PASSWORD RESET EMAIL" });
		});
});

//public
app.post(API_NAME + "/reset-password", async (req, res) => {
	const { code, password } = req.body;

	if (!code) {
		return res.status(400).send({ error_code: "MISSING CONFIRMATION CODE" });
	} else if (!password) {
		return res.status(400).send({ error_code: "MISSING NEW PASSWORD" });
	}

	const cachedVal = await sendPasswordResetEmailCache.getKey(code);
	if (cachedVal) {
		return res.status(400).send(cachedVal);
	}

	jwt.verify(code, PASSWORD_RESET_JWT_SECRET_KEY, async (error, decodedCode) => {
		if (error) {
			const error_code = error.name === "TokenExpiredError" ? "CODE EXPIRED" : "CODE_INVALID";
			const dataToSend = { error_code };
			await sendPasswordResetEmailCache.setKey(code, dataToSend, 60 * 15);
			return res.status(401).send(dataToSend);
		}

		const { user_id } = decodedCode;
		const user = await fetchUserById(user, tokenCache);
		const updatedUser = await updateUserPassword(user_id, password, tokenCache);

		if (!updatedUser) {
			return res.status(400).send({ error_code: "USER DOES NOT EXIST" });
		}

		await sendPasswordResetEmailCache.setKey(code, { error_code: "PASSWORD ALREADY UPDATED" }, 60 * 15);
		await signOutAllDevices(updated_user._id, tokenCache);
		
		return res.send({
			message: "SUCCESSFULLY UPDATED PASSWORD",
			user: {
				email: user.email,
				first_name: user.first_name,
				last_name: user.last_name
			}
		});
	});
});

(async () => {
	await emailAvailablityCache.deleteAllKeys();
	await emailConfirmationCache.deleteAllKeys();
	await resendConfirmationEmailCache.deleteAllKeys();
	await sendPasswordResetEmailCache.deleteAllKeys();

	
	app.listen(PORT, () => {
		console.log(`Registration API running on port ${PORT}!`);
	});
})();

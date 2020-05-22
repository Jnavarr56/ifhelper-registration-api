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
	GMAIL_PASSWORD
} = process.env;

const PORT = ENV_PORT || 3000;
const REDIS_PORT = ENV_REDIS_PORT || 6379;

const USERS_API = "http://localhost:5000/users";

const tokenCache = new RedisCacheManager({
	port: REDIS_PORT,
	prefix: "AUTHENTICATION_TOKENS"
});

const emailAvailablityCache = new RedisCacheManager({
	port: REDIS_PORT,
	prefix: "EMAIL_AVAILABLITY"
});

const emailConfirmationCache = new RedisCacheManager({
	port: REDIS_PORT,
	prefix: "EMAIL_CONFIRMATION"
});

const resendConfirmationEmailCache = new RedisCacheManager({
	port: REDIS_PORT,
	prefix: "EMAIL_CONFIRMATION_RESEND"
});

const sendPasswordResetEmailCache = new RedisCacheManager({
	port: REDIS_PORT,
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
app.get("/verify-email-availability", async (req, res) => {
	const { email: emailQuery } = req.query;

	if (!emailQuery) {
		return res.status(400).send({ error_code: "EMAIL_PARAMETER_REQUIRED" });
	}

	// Check for queried email in cache.
	const { cachedVal, cacheError } = await emailAvailablityCache.getKey(
		emailQuery
	);

	// If queried email in cache, extract and send.
	if (cachedVal !== null && !cacheError) {
		return res.send(cachedVal);
	} else if (cacheError) {
		console.trace("PROBLEM READING CACHE", cacheError);
	}

	// If queried email NOT in cache, query USERS_API.
	const APIQueryURL = USERS_API + `?email=${emailQuery}&limit=1`;

	const token = await generateSystemAuthToken(tokenCache);
	const headers = { Authorization: `Bearer ${token}` };

	axios
		.get(APIQueryURL, { headers })
		.then(async (response) => {
			const { query_results } = response.data;

			// Determine if email is available.
			const emailIsAvailable = !query_results.length;

			// Cache result and send to requester.
			const dataToSend = { available: emailIsAvailable };

			const { status, cacheError } = await emailAvailablityCache.setKey(
				emailQuery,
				dataToSend,
				30 * 60
			);

			if (status !== "OK" || cacheError) {
				console.trace("PROBLEM SETTING CACHE", `STATUS: ${status}`, cacheError);
			}

			res.send(dataToSend);
		})
		.catch((error) => {
			const { data } = error.response;
			console.trace("PROBLEM VERIFYING EMAIL AVAILABLITY", data);
			res.status(500).send(data);
		});
});

//public
app.post("/sign-up", async (req, res) => {
	const { body: signUpData } = req;

	const { error, newUser: new_user } = await createUser(signUpData, tokenCache);

	if (error) {
		const { data, status } = error;
		const error_code = data.error_code || "PROBLEM CREATING USER";
		console.trace(error_code, data);
		return res.status(status).send({ error_code });
	}

	await emailAvailablityCache.deleteKey(new_user.email);

	sendConfirmationEmail(new_user, transporter)
		.then(() => res.send({ new_user }))
		.catch((error) => {
			const error_code = "PROBLEM SENDING CONFIRMATION EMAIL";
			console.trace(error_code, error);
			res.status(500).send({ error_code });
		});
});

//public
app.post("/confirm-email", async (req, res) => {
	const { code } = req.body;

	if (!code) {
		return res.status(400).send({ error_code: "MISSING CONFIRMATION CODE" });
	}

	const { cachedVal } = await emailConfirmationCache.getKey(code);

	if (cachedVal) {
		return res.send(cachedVal);
	}

	jwt.verify(
		code,
		EMAIL_CONFIRMATION_JWT_SECRET_KEY,
		async (error, decodedCode) => {
			if (error) {
				const { name } = error;

				let error_code;
				if (name === "TokenExpiredError") {
					error_code = "CODE EXPIRED";
				} else {
					error_code = "CODE INVALID";
				}

				const dataToSend = { error_code };

				await emailConfirmationCache.setKey(code, dataToSend, 60 * 30);

				return res.status(401).send(dataToSend);
			}

			const { user_id } = decodedCode;

			const { user, error: userFetchError } = await fetchUserById(
				user_id,
				tokenCache
			);

			if (userFetchError) {
				const { status, data: error, error_code } = userFetchError;
				console.trace(error_code, error);
				return res.status(status).send({ error_code: "PROBLEM RETRIEVING USER" });
			}

			if (user.email_confirmed) {
				return res.status(400).send({ error_code: "EMAIL ALREADY CONFIRMED" });
			}

			const { updated_user, error: userUpdateError } = await confirmUserEmail(
				user_id,
				tokenCache
			);

			if (!updated_user) {
				return res.status(400).send({ error_code: "USER DOES NOT EXIST" });
			} else if (userUpdateError) {
				const { status, data: error, error_code } = userUpdateError;
				console.trace(error_code, error);
				return res.status(status).send({ error_code, error });
			}

			await emailConfirmationCache.setKey(
				code,
				{ message: "EMAIL ALREADY CONFIRMED" },
				60 * 15
			);

			return res.send({
				message: "SUCCESSFULLY CONFIRMED EMAIL",
				user: {
					email: user.email,
					first_name: user.first_name,
					last_name: user.last_name
				}
			});
		}
	);
});

//public
app.post("/resend-confirmation-email", async (req, res) => {
	const { email } = req.body;

	if (!email) {
		return res.status(400).send({ error_code: "MISSING EMAIL" });
	}

	const { cachedVal } = await resendConfirmationEmailCache.getKey(email);

	if (cachedVal) {
		return res.status(400).send({ error_code: "THROTTLE" });
	}

	const { user, error: userFetchError } = await fetchUserByEmail(
		email,
		tokenCache
	);
	if (!user) {
		return res.status(400).send({ error_code: "NO USER ASSOCIATED WITH EMAIL" });
	} else if (user.email_confirmed) {
		return res.status(400).send({ error_code: "EMAIL ALREADY CONFIRMED" });
	} else if (userFetchError) {
		const { data: error, status, error_code } = userFetchError;
		console.trace(error_code, error);
		return res.status(status).send({ error_code, error });
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
app.post("/send-password-reset-email", async (req, res) => {
	const { email } = req.body;

	if (!email) {
		return res.status(400).send({ error_code: "MISSING EMAIL" });
	}

	const { cachedVal } = await sendPasswordResetEmailCache.getKey(email);

	if (cachedVal) {
		return res.status(400).send({ error_code: "THROTTLE" });
	}

	const { user, error: userFetchError } = await fetchUserByEmail(
		email,
		tokenCache
	);
	if (!user) {
		return res.status(400).send({ error_code: "NO USER ASSOCIATED WITH EMAIL" });
	} else if (userFetchError) {
		const { data: error, status, error_code } = userFetchError;
		console.trace(error_code, error);
		return res.status(status).send({ error_code, error });
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
app.post("/reset-password", async (req, res) => {
	const { code, password } = req.body;

	if (!code) {
		return res.status(400).send({ error_code: "MISSING CONFIRMATION CODE" });
	} else if (!password) {
		return res.status(400).send({ error_code: "MISSING NEW PASSWORD" });
	}

	const { cachedVal } = await sendPasswordResetEmailCache.getKey(code);

	if (cachedVal) {
		return res.status(400).send(cachedVal);
	}

	jwt.verify(code, PASSWORD_RESET_JWT_SECRET_KEY, async (error, decodedCode) => {
		if (error) {
			const { name } = error;

			let error_code;
			if (name === "TokenExpiredError") {
				error_code = "CODE EXPIRED";
			} else {
				error_code = "CODE INVALID";
			}

			const dataToSend = { error_code };

			await sendPasswordResetEmailCache.setKey(code, dataToSend, 60 * 15);

			return res.status(401).send(dataToSend);
		}

		const { user_id } = decodedCode;

		const { user, error: userFetchError } = await fetchUserById(
			user_id,
			tokenCache
		);

		if (userFetchError) {
			const { status, data: error, error_code } = userFetchError;
			console.trace(error_code, error);
			return res.status(status).send({ error_code: "PROBLEM RETRIEVING USER" });
		}

		const { updated_user, error: userUpdateError } = await updateUserPassword(
			user_id,
			password,
			tokenCache
		);

		if (!updated_user) {
			return res.status(400).send({ error_code: "USER DOES NOT EXIST" });
		} else if (userUpdateError) {
			const { status, data: error, error_code } = userUpdateError;
			console.trace(error_code, error);
			return res.status(status).send({ error_code, error });
		}

		await sendPasswordResetEmailCache.setKey(
			code,
			{ message: "PASSWORD ALREADY UPDATED" },
			60 * 15
		);

		try {
			await signOutAllDevices(updated_user._id, tokenCache);
		} catch (error) {
			const { data, status } = error.response;
			console.log(data, status);
			return res
				.status(500)
				.send({ error_code: "PROBLEM INVALIDATING OTHER SESSIONS" });
		}

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

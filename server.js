const axios = require("axios");
const morgan = require("morgan");
const express = require("express");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const bodyParser = require("body-parser");

const RedisCacheManager = require("./utils/RedisCacheManager");
const { generateSystemAuthToken } = require("./utils/tokens");
const { createUser } = require("./utils/users");

require("dotenv").config();

const PORT = process.env.PORT || 3000;
const REDIS_PORT = process.env.REDIS_PORT || 6379;

const USERS_API = "http://localhost:4000/users";

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

const resendEmailConfirmationCache = new RedisCacheManager({
	port: REDIS_PORT,
	prefix: "EMAIL_CONFIRMATION_RESEND"
});

const transporter = nodemailer.createTransport({
	service: "gmail",
	auth: {
		user: process.env.GMAIL_ADDRESS,
		pass: process.env.GMAIL_PASSWORD
	}
});

const EMAIL_CONFIRMATION_JWT_SECRET_KEY = "IFHELPER_EMAIL_CONFIRMATION";

const sendConfirmationEmail = (user) => {
	return new Promise((resolve, reject) => {
		const confirmationCode = jwt.sign(
			{ user_id: user._id },
			EMAIL_CONFIRMATION_JWT_SECRET_KEY,
			{ expiresIn: 60 * 60 }
		);

		const mailOptions = {
			to: user.email,
			subject: "IFHelper Email Confirmation",
			html: `
                <p>Welcome to IFHelper ${user.first_name}!</p>
                <br />
                <p>
                    Click 
                        <a href="http://localhost:${PORT}/confirm-email?code=${confirmationCode}">
                        here
                        </a>
                    to confirm your email.
                </p> 
                <br/ >
                <p>This code will only last for 1 hour so be quick!</p>
            `
		};

		transporter.sendMail(mailOptions, (error, info) => {
			if (error) {
				reject(error);
			} else {
				resolve(info);
			}
		});
	});
};

const fetchUserById = async (id) => {
	// Fetch user by id.

	// If no user  with id return null.
	// If error then return formatted data object.

	const token = await generateSystemAuthToken(tokenCache);

	const headers = { Authorization: `Bearer ${token}` };

	const APIQueryURL = `${USERS_API}/${id}`;
	return axios
		.get(APIQueryURL, { headers })
		.then(({ data: { user } }) => ({ user }))
		.catch(({ response: { data, status } }) => {
			return {
				error: {
					data,
					status,
					error_code: data.error_code || "PROBLEM RETRIEVING USER"
				}
			};
		});
};

const fetchUserByEmail = async (email) => {
	const token = await generateSystemAuthToken(tokenCache);
	const headers = {
		Authorization: `Bearer ${token}`
	};

	const APIQueryURL = `${USERS_API}?email=${email}&limit=1`;

	return axios
		.get(APIQueryURL, { headers })
		.then(({ data }) => ({ user: data.query_results[0] || null }))
		.catch(({ response: { data, status } }) => ({
			error: { data, status, error_code: "PROBLEM RETRIEVING USER" }
		}));
};

const confirmUserEmail = async (id) => {
	// If no user  with id return null.
	// If error then return formatted data object.

	const token = await generateSystemAuthToken(tokenCache);

	const headers = { Authorization: `Bearer ${token}` };

	const APIQueryURL = `${USERS_API}/${id}`;
	return axios
		.patch(APIQueryURL, { email_confirmed: true }, { headers })
		.then(({ data: { updated_user } }) => ({ updated_user }))
		.catch(({ response: { data, status } }) => {
			if (status === 404) {
				return null;
			}

			return {
				error: {
					data,
					status,
					error_code: "PROBLEM CONFIRMING USER EMAIL"
				}
			};
		});
};

const app = express();

app
	.use(bodyParser.urlencoded({ extended: true }))
	.use(bodyParser.json())
	.use(morgan("dev"));

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

	sendConfirmationEmail(new_user)
		.then(() => res.send({ new_user }))
		.catch((error) => {
			const error_code = "PROBLEM SENDING CONFIRMATION EMAIL";
			console.trace(error_code, error);
			res.status(500).send({ error_code });
		});
});

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

			const { user, error: userFetchError } = await fetchUserById(user_id);

			if (userFetchError) {
				const { status, data: error, error_code } = userFetchError;
				console.trace(error_code, error);
				return res.status(status).send({ error_code: "PROBLEM RETRIEVING USER" });
			}

			if (user.email_confirmed) {
				return res.status(400).send({ error_code: "EMAIL ALREADY CONFIRMED" });
			}

			const { updated_user, error: userUpdateError } = await confirmUserEmail(
				user_id
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

app.post("/resend-confirmation-email", async (req, res) => {
	const { email } = req.body;

	if (!email) {
		return res.status(400).send({ error_code: "MISSING EMAIL" });
	}

	const { cachedVal } = await resendEmailConfirmationCache.getKey(email);

	if (cachedVal) {
		return res.status(400).send({ error_code: "THROTTLE" });
	}

	const { user, error: userFetchError } = await fetchUserByEmail(email);
	if (!user) {
		return res.status(400).send({ error_code: "NO USER ASSOCIATED WITH EMAIL" });
	} else if (user.email_confirmed) {
		return res.status(400).send({ error_code: "EMAIL ALREADY CONFIRMED" });
	} else if (userFetchError) {
		const { data: error, status, error_code } = userFetchError;
		console.trace(error_code, error);
		return res.status(status).send({ error_code, error });
	}

	sendConfirmationEmail(user)
		.then(async (response) => {
			await resendEmailConfirmationCache.setKey(
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

// app.get('/confirm-email', async (req, res) => {
//     const { code } = req.query;

//     if (!code) {
//         return res.status(400).send({ error_code: "MISSING CONFIRMATION CODE" });
//     }

//     const { cachedVal } = await emailConfirmationCache.getKey(code);

//     if (cachedVal) {
//         if ()
//         return res.send(cachedVal);
//     }

//     jwt.verify(code, EMAIL_CONFIRMATION_JWT_SECRET_KEY, async (error, decodedCode) => {

//         if (error) {
//             const { name } = error;

// 			let error_code;
// 			if (name === "TokenExpiredError") {
//                 error_code = "CODE EXPIRED";
// 			} else {
// 				error_code = "CODE INVALID";
//             }

//             const dataToSend = { error_code };

//             await emailConfirmationCache.setKey(code, dataToSend, 60 * 60);

// 			return res.status(401).send(dataToSend);
//         }

//         const { user_id } = decodedCode;

//         const {
//             user,
//             error: userFetchError
//         } = await fetchUserById(user_id);

//         if (!user) {
//             return res.status(400).send({ error_code: "USER DOES NOT EXIST" });
//         } else if (userFetchError){
//             const { status, data: error, error_code } = userFetchError;
//             console.trace(error_code, error);
//             return res.status(status).send({ error_code, error });
//         }

//         if (user.email_confirmed) {
//             return res.status(400).send({ error_code: "EMAIL ALREADY CONFIRMED" });
//         }

//         const {
//             updated_user,
//             error: userUpdateError
//         } = await confirmUserEmail(user_id);

//         if (!updated_user) {
//             return res.status(400).send({ error_code: "USER DOES NOT EXIST" });
//         } else if (userUpdateError) {
//             const { status, data: error, error_code } = userUpdateError;
//             console.trace(error_code, error);
//             return res.status(status).send({ error_code, error });
//         }

//         await emailConfirmationCache.setKey(code, dataToSend, 60 * 60);

//         return res.send({message: "SUCCESSFULLY CONFIRMED EMAIL" });

//     });
// });

(async () => {
	await emailAvailablityCache.deleteAllKeys();
	await emailConfirmationCache.deleteAllKeys();

	app.listen(PORT, () => {
		console.log(`Registration API running on port ${PORT}!`);
	});
})();

const axios = require("axios");
const { generateSystemAuthToken } = require("./tokens");

const USERS_API = "http://localhost:5000/users";

const createUser = async (signUpData, tokenCache) => {
	const token = await generateSystemAuthToken(tokenCache);

	const headers = { Authorization: `Bearer ${token}` };

	return axios
		.post(USERS_API, signUpData, { headers })
		.then(({ data: { new_user: newUser } }) => ({ newUser }))
		.catch(({ response: { data, status } }) => ({ error: { status, data } }));
};

const fetchUserById = async (id, tokenCache) => {
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

const fetchUserByEmail = async (email, tokenCache) => {
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

const confirmUserEmail = async (id, tokenCache) => {
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

const updateUserPassword = async (id, password, tokenCache) => {
	// If no user  with id return null.
	// If error then return formatted data object.

	const token = await generateSystemAuthToken(tokenCache);

	const headers = { Authorization: `Bearer ${token}` };

	const APIQueryURL = `${USERS_API}/${id}`;
	return axios
		.patch(APIQueryURL, { password }, { headers })
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

module.exports = {
	createUser,
	fetchUserById,
	fetchUserByEmail,
	confirmUserEmail,
	updateUserPassword
};

const axios = require("axios");
const { generateSystemAuthToken } = require("./tokens");
const { USERS_API } = require('../vars');

require("dotenv").config();

const createUser = async (signUpData, tokenCache) => {
	const token = await generateSystemAuthToken(tokenCache);
	const headers = { Authorization: `Bearer ${token}` };

	return axios
		.post(USERS_API, signUpData, { headers })
		.then(({ data: { new_user } }) => new_user)
};

const fetchUserById = async (id, tokenCache) => {
	const token = await generateSystemAuthToken(tokenCache);
	const headers = { Authorization: `Bearer ${token}` };
	const APIQueryURL = `${USERS_API}/${id}`;

	return axios
		.get(APIQueryURL, { headers })
		.then(({ data: user }) => user)
		.catch(error => {
			const { status, data }= error;
			if (status === 404) {
				return null;
			} else {
				throw new Error(error);
			}
		});
};

const fetchUserByEmail = async (email, tokenCache) => {
	const token = await generateSystemAuthToken(tokenCache);
	const headers = { Authorization: `Bearer ${token}` };
	const APIQueryURL = `${USERS_API}?email=${email}&limit=1`;

	return axios
		.get(APIQueryURL, { headers })
		.then(({ data }) => data.query_results[0] || null);
};

const confirmUserEmail = async (id, tokenCache) => {
	const token = await generateSystemAuthToken(tokenCache);
	const headers = { Authorization: `Bearer ${token}` };
	const APIQueryURL = `${USERS_API}/${id}`;

	return new Promise((resolve, reject) => {
		axios
		.patch(APIQueryURL, { email_confirmed: true }, { headers })
		.then(({ data: { updated_user } }) => resolve(updated_user))
		.catch(error => reject(error));
	});
};

const updateUserPassword = async (id, password, tokenCache) => {
	const token = await generateSystemAuthToken(tokenCache);
	const headers = { Authorization: `Bearer ${token}` };
	const APIQueryURL = `${USERS_API}/${id}`;

	return axios
		.patch(APIQueryURL, { password }, { headers })
		.then(({ data: { updated_user } }) => updated_user)
		.catch(error => {
			if (error.response.status === 404) {
				return null;
			}
			throw new Error(error);
		});
};

module.exports = {
	createUser,
	fetchUserById,
	fetchUserByEmail,
	confirmUserEmail,
	updateUserPassword
};

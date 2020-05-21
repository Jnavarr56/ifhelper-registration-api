const axios = require("axios");
const { generateSystemAuthToken } = require("./tokens");

const USERS_API = "http://localhost:4000/users";

const createUser = async (signUpData, tokenCache) => {
	const token = await generateSystemAuthToken(tokenCache);

	const headers = { Authorization: `Bearer ${token}` };

	return axios
		.post(USERS_API, signUpData, { headers })
		.then(({ data: { new_user: newUser } }) => ({ newUser }))
		.catch(({ response: { data, status } }) => ({ error: { status, data } }));
};

module.exports = { createUser };

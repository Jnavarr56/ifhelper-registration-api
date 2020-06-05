const axios = require('axios');
const { generateSystemAuthToken } = require('./tokens');
const { AUTH_API } = require('../vars');

const signOutAllDevices = async (user_id, tokenCache) => {
	const token = await generateSystemAuthToken(tokenCache, {
		authenticated_user: { _id: user_id }
	});

	const headers = { Authorization: `Bearer ${token}` };
	const postURL = AUTH_API + '/sign-out-all-devices';

	return axios.post(postURL, {}, { headers });
};

module.exports = { signOutAllDevices };

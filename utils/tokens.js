const cryptoRandomString = require("crypto-random-string");

const generateSystemAuthToken = async (tokenCacheManager, payloadOpts = {}) => {
	const sysAuthToken = cryptoRandomString({ length: 10, type: "base64" });
	const payload = { access_type: "SYSTEM", ...payloadOpts };

	const { cacheError, status } = await tokenCacheManager.setKey(
		sysAuthToken,
		payload,
		60 * 60
	);

	if (cacheError || status !== "OK") {
		console.trace(cacheError, status);
		throw new Error(cacheError);
	}

	return sysAuthToken;
};

module.exports = { generateSystemAuthToken };

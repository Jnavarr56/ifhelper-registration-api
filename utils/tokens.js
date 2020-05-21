const jwt = require("jsonwebtoken");
const cryptoRandomString = require("crypto-random-string");

require("dotenv").config();

const generateSystemAuthToken = async (tokenCacheManager) => {
	const sysAuthToken =
		"SYS" + cryptoRandomString({ length: 10, type: "base64" });
	const payload = { access_type: "SYSTEM" };

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

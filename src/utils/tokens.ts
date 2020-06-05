// const cryptoRandomString = require("crypto-random-string");

// const generateSystemAuthToken = async (tokenCacheManager, payloadOpts = {}) => {
// 	const sysAuthToken = cryptoRandomString({ length: 10, type: "base64" });
// 	const payload = { access_type: "SYSTEM", ...payloadOpts };

// 	await tokenCacheManager.setKey(
// 		sysAuthToken,
// 		payload,
// 		60 * 60
// 	);

// 	return sysAuthToken;
// };

// module.exports = { generateSystemAuthToken };

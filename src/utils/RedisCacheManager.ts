// const redis = require("redis");

// class RedisCacheManager {
// 	constructor(redisCacheOpts) {
// 		if (!redisCacheOpts.prefix) {
// 			throw new Error("Prefix Required");
// 		}

// 		this.opts = redisCacheOpts;
// 		this.redisClient = redis.createClient(redisCacheOpts);
// 	}

// 	get client() {
// 		return this.redisClient;
// 	}

// 	setKey(key, payload, secs) {
// 		return new Promise((resolve, reject) => {
// 			this.redisClient.set(
// 				key,
// 				JSON.stringify(payload),
// 				"EX",
// 				secs,
// 				(cacheError) => {
// 					if (cacheError) reject(cacheError);
// 					resolve()
// 				}
// 			);
// 		});
// 	}

// 	getKey(key) {
// 		return new Promise((resolve, reject) => {
// 			this.redisClient.get(key, (cacheError, cachedVal) => {
// 				if (cacheError) reject(cacheError);
// 				resolve(JSON.parse(cachedVal));
// 			});
// 		});
// 	}

// 	deleteKey(key) {
// 		return new Promise((resolve, reject) => {
// 			this.redisClient.del(key, (err, n) => {
// 				if (err) reject(err);
// 				resolve(n)
// 			});
// 		});
// 	}

// 	deleteAllKeys() {
// 		return new Promise((resolve, reject) => {
// 			this.redisClient.keys(this.opts.prefix + "*", (err, rows) => {
// 				if (err) reject(err);
// 				if (rows.length > 0) {
// 					this.redisClient.del(
// 						rows.map((row) => row.replace(this.opts.prefix, "")),
// 						(err) => {
// 							if (err) reject(err);
// 							resolve();
// 						}
// 					);
// 				} else {
// 					resolve();
// 				}
// 			});
// 		});
// 	}
// }

// module.exports = RedisCacheManager;

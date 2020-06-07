import * as dotenv from 'dotenv';
import redis, { RedisClient } from 'redis';
import { REDIS_PORT, REDIS_URL } from '../vars';

dotenv.config();

export default class RedisClientInitializer {
	private static client: RedisClient | null = null;

	public static getClient(): RedisClient {
		if (!RedisClientInitializer.client) {
			throw new Error('Singleton must call init() first.');
		}

		return RedisClientInitializer.client;
	}

	public static init(): Promise<void> {
		RedisClientInitializer.client = redis.createClient({
			port: REDIS_PORT,
			url: REDIS_URL,
			password: process.env.REGISTRATION_REDIS_DB_PASSWORD
		});
		return new Promise((resolve, reject) => {
			if (!RedisClientInitializer.client) return reject();
			RedisClientInitializer.client.on('ready', resolve);
			RedisClientInitializer.client.on('error', reject);
		});
	}
}

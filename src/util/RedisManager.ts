import RedisClientInitializer from './RedisClientInitializer';
import { RedisClient } from 'redis';

export default class RedisManager {
	private prefix: string;

	public constructor(prefix: string) {
		this.prefix = prefix;
	}

	private prefixKey(key: string): string {
		return this.prefix + key;
	}

	private getClient(): RedisClient {
		return RedisClientInitializer.getClient();
	}

	public setKey(key: string, value: string, secs?: number): Promise<void> {
		return new Promise((resolve, reject) => {
			const callback: (error: Error | null, reply: 'OK' | undefined) => void = (
				error: Error | null,
				reply: 'OK' | undefined
			) => {
				if (error) reject(error);
				if (reply !== 'OK') reject();
				resolve();
			};

			if (secs) {
				this.getClient().set(this.prefixKey(key), value, 'EX', secs, callback);
			} else {
				this.getClient().set(this.prefixKey(key), value, callback);
			}
		});
	}

	public getKey(key: string): Promise<string | null> {
		return new Promise((resolve, reject) => {
			this.getClient().get(
				this.prefixKey(key),
				(error: Error | null, cachedValStr: string | null) => {
					if (error) reject(error);
					if (!cachedValStr) resolve(null);
					resolve(cachedValStr);
				}
			);
		});
	}

	public getTTL(key: string): Promise<number | null> {
		return new Promise((resolve, reject) => {
			this.getClient().ttl(
				this.prefixKey(key),
				(error: Error | null, secs: number) => {
					if (error) reject(error);
					resolve(secs < 0 ? null : secs);
				}
			);
		});
	}

	public deleteKey(key: string): Promise<number> {
		return new Promise((resolve, reject) => {
			this.getClient().del(
				this.prefixKey(key),
				(error: Error | null, numItemsDeleted: number) => {
					if (error) reject(error);
					resolve(numItemsDeleted);
				}
			);
		});
	}

	public deleteAllKeys(): Promise<number | void> {
		return new Promise((resolve, reject) => {
			this.getClient().keys(
				this.prefixKey('*'),
				(error: Error | null, rows: string[]) => {
					if (error) reject(error);
					if (rows.length === 0) resolve();
					this.getClient().del(
						rows,
						(error: Error | null, numItemsDeleted: number) => {
							if (error) reject(error);
							if (numItemsDeleted !== rows.length) {
								reject(new Error(`Could Delete Prefixed Keys: ${rows.join(', ')}`));
							}
							resolve(numItemsDeleted);
						}
					);
				}
			);
		});
	}
}

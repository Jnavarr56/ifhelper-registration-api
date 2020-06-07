import app from './app';
import { PORT } from './vars';

import RabbitMQAuthMessenger from './utils/RabbitMQAuthMessenger';
import RedisClientInitializer from './utils/RedisClientInitializer';

// (async () => {
RabbitMQAuthMessenger.init().then(async () => {
	await RedisClientInitializer.init();
	app.listen(PORT, () => {
		console.log(
			`Registration API running on port ${PORT} of http://registration-api`
		);
	});
});

// })();

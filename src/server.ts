import app from './app';
import { PORT } from './vars';

import RabbitMQAuthMessenger from './util/RabbitMQAuthMessenger';
import RedisClientInitializer from './util/RedisClientInitializer';

(async function () {
	await RabbitMQAuthMessenger.init();
	await RedisClientInitializer.init();
	app.listen(PORT, () => {
		console.log(
			`Registration API running on port ${PORT} of http://registration-api`
		);
	});
})();

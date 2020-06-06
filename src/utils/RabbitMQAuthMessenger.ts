import * as a from 'amqplib';
import { RABBIT_MQ_URL, AUTHORIZATION_QUEUE_NAME } from '../vars';
import * as e from 'events';

export default class RabbitMQAuthMessenger {
	private static channel: a.Channel | null = null;
	private static queue: string | null = null;
	private static responseEmitter: e.EventEmitter = new e.EventEmitter();

	public static async init(): Promise<void> {
		if (!RabbitMQAuthMessenger.channel || !RabbitMQAuthMessenger.queue) {
			const connection: a.Connection = await a.connect(RABBIT_MQ_URL);
			const channel: a.Channel = await connection.createChannel();
			RabbitMQAuthMessenger.channel = channel;
			const queue: string = await channel
				.assertQueue('', { exclusive: true })
				.then((qok: a.Replies.AssertQueue): string => qok.queue);
			RabbitMQAuthMessenger.queue = queue;
			RabbitMQAuthMessenger.channel.consume(
				RabbitMQAuthMessenger.queue,
				(msg: a.ConsumeMessage | null) => {
					if (msg && RabbitMQAuthMessenger.responseEmitter)
						RabbitMQAuthMessenger.responseEmitter.emit(
							msg.properties.correlationId,
							msg.content
						);
				},
				{ noAck: true }
			);
		}
	}

	public async requestAuthorizationToken(): Promise<string> {
		return new Promise((resolve, reject) => {
			if (!RabbitMQAuthMessenger.channel || !RabbitMQAuthMessenger.queue) {
				return reject('No Channel Initialized');
			}

			const correlationId: string =
				Math.random().toString(36).substring(2, 15) +
				Math.random().toString(36).substring(2, 15);
			RabbitMQAuthMessenger.responseEmitter.once(
				correlationId,
				(content: Buffer) => {
					resolve(content.toString());
				}
			);

			RabbitMQAuthMessenger.channel.sendToQueue(
				AUTHORIZATION_QUEUE_NAME,
				new Buffer(''),
				{
					correlationId,
					replyTo: RabbitMQAuthMessenger.queue
				}
			);
		});
	}
}

import express, { Application } from 'express';
import cors, { CorsOptions } from 'cors';
import morgan from 'morgan';
import bodyParser from 'body-parser';
import * as dotenv from 'dotenv';

import routes from './routes';
import { CLIENT_ORIGIN, PATHNAME } from './vars';

dotenv.config();

const app: Application = express();

const corsOpts: CorsOptions = {
	credentials: true,
	origin: CLIENT_ORIGIN,
	allowedHeaders: [
		'Access-Control-Allow-Credentials',
		'Authorization',
		'Content-Type'
	]
};

app
	.use(bodyParser.urlencoded({ extended: true }))
	.use(bodyParser.json())
	.use(morgan('dev'))
	.use(cors(corsOpts));

app.options('*', cors(corsOpts));

app.use(PATHNAME, routes);

export default app;

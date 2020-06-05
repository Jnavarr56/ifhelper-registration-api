import SignUpController from './controllers/SignUpController';
import * as e from 'express';

const router: e.Router = e.Router();

router.get('/sign-up', (req: e.Request, res: e.Response) =>
	new SignUpController().execute(req, res)
);

export default router;

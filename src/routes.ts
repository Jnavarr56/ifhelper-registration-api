import * as e from 'express';
import SignUpController from './controllers/SignUpController';
import ResendConfirmationEmailController from './controllers/ResendConfirmationEmailController';
import ConfirmEmailController from './controllers/ConfirmEmailController';
import SendPasswordResetEmailController from './controllers/SendPasswordResetEmailController';
import TestPasswordResetCodeController from './controllers/TestPasswordResetCodeController';

const router: e.Router = e.Router();

router.post('/sign-up', (req: e.Request, res: e.Response) =>
	new SignUpController().execute(req, res)
);

router.post('/resend-confirmation-email', (req: e.Request, res: e.Response) =>
	new ResendConfirmationEmailController().execute(req, res)
);

router.get('/confirm-email', (req: e.Request, res: e.Response) =>
	new ConfirmEmailController().execute(req, res)
);

router.post('/send-password-reset-email', (req: e.Request, res: e.Response) =>
	new SendPasswordResetEmailController().execute(req, res)
);

router.get('/test-password-reset-code', (req: e.Request, res: e.Response) =>
	new TestPasswordResetCodeController().execute(req, res)
);

export default router;

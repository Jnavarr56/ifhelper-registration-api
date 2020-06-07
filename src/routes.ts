import * as e from 'express';
import SignUpController from './controllers/SignUpController';
import ResendConfirmationEmailController from './controllers/ResendConfirmationEmailController';
import ConfirmEmailController from './controllers/ConfirmEmailController';
import SendPasswordResetEmailController from './controllers/SendPasswordResetEmailController';
import TestPasswordResetCodeController from './controllers/TestPasswordResetCodeController';
import ResetPasswordController from './controllers/ResetPasswordController';

const router: e.Router = e.Router();

router.post('/sign-up', (req: e.Request, res: e.Response) =>
	new SignUpController().execute(req, res)
);

router.post('/resend-confirmation-email', (req: e.Request, res: e.Response) =>
	new ResendConfirmationEmailController().execute(req, res)
);

router.post('/confirm-email', (req: e.Request, res: e.Response) =>
	new ConfirmEmailController().execute(req, res)
);

router.post('/send-password-reset-email', (req: e.Request, res: e.Response) =>
	new SendPasswordResetEmailController().execute(req, res)
);

router.get('/test-password-reset-code', (req: e.Request, res: e.Response) =>
	new TestPasswordResetCodeController().execute(req, res)
);

router.post('/reset-password', (req: e.Request, res: e.Response) =>
	new ResetPasswordController().execute(req, res)
);

export default router;

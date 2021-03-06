export const PORT = 80;
export const REDIS_PORT = 6379;
export const REDIS_URL = 'redis://registration-api-cache';
export const RABBIT_MQ_URL = 'amqp://messenger';
export const AUTHORIZATION_QUEUE_NAME = 'AUTHORIZATION_QUEUE';
export const PATHNAME = '/api/registration';
export const USERS_API = 'http://users-api/api/users';
export const AUTH_API = 'http://authentication-api/api/authentication';
export const EMAIL_CONFIRMATION_KEY_PREFIX = 'EMAIL_CONFIRMATION_CODE';
export const EMAIL_CONFIRMATION_CODE_TTL_SECS = 60 * 5;
export const EMAIL_CONFIRMATION_EMAIL_TIMEOUT_SECS = 60 * 5;
export const PASSWORD_RESET_KEY_PREFIX = 'EMAIL_CONFIRMATION_CODE';
export const PASSWORD_RESET_CODE_TTL_SECS = 3600;
export const PASSWORD_RESET_EMAIL_TIMEOUT_SECS = 60 * 5;
export const CLIENT_ORIGIN = 'http://localhost:3000';
export const CLIENT_PASSWORD_RESET_CALLBACK_PATH = '/reset-password';
export const CLIENT_EMAIL_CONFIRMATION_CALLBACK_PATH = '/confirm-email';

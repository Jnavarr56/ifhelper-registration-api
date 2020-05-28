const PORT = 80;
const REDIS_PORT = 6379;
const REDIS_URL = 'redis://cache'
const PATHNAME = "/api/registration";
const USERS_API = 'http://users-api/api/users';
const AUTH_API = "http://authentication-api/api/authentication";

module.exports = { PORT, REDIS_PORT, REDIS_URL, PATHNAME, USERS_API, AUTH_API };
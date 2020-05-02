module.exports = {
  DEBUG: process.env.DEBUG,
  NODE_ENV: process.env.NODE_ENV,
  SERVER_PORT: process.env.PORT || 5000,
  EMAIL_USER: process.env.EMAIL_USER,
  EMAIL_PASSWORD: process.env.EMAIL_PASSWORD,
  DATABASE_URL: process.env.DATABASE_URL || 'postgres://rfis:12345@localhost:5432/online',
  URL_PREFIX: process.env.URL_PREFIX,
};

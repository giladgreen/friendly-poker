
module.exports = {
  debug: (...args) => {
    // eslint-disable-next-line no-console
    console.log('DEBUG', ...args);
  },
  info: (...args) => {
    // eslint-disable-next-line no-console
    console.log(...args);
  },
  warn: (...args) => {
    // eslint-disable-next-line no-console
    console.warn(...args);
  },
  error: (...args) => {
    // eslint-disable-next-line no-console
    console.error('>>>', ...args);
  },
};

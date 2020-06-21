
module.exports = {
  debug: (...args) => {
    // eslint-disable-next-line no-console
    console.log('DEBUG | ', ...args);
  },
  info: (...args) => {
    // eslint-disable-next-line no-console
    console.log('INFO | ', ...args);
  },
  warn: (...args) => {
    // eslint-disable-next-line no-console
    console.warn('\x1b[33m%s\x1b[0m', 'WARN | ', ...args);
  },
  error: (...args) => {
    // eslint-disable-next-line no-console
    console.error('\x1b[31m', 'ERROR | ', ...args);
  },
};


module.exports = function terminate(server, options = { coredump: false, timeout: 500 }) {
  const exit = (code) => {
    options.coredump ? process.abort() : process.exit(code);
  };

  return (code, reason) => (err, promise) => {
    console.log(`process exiting with code: ${code}, reason: ${reason}`);

    if (err && err instanceof Error) {
      console.log(err.message, err.stack);
    }

    try {
      server.close(exit);
    } catch (e) {
    }
    setTimeout(exit, options.timeout).unref();
  };
};

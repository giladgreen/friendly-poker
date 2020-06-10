async function sleep(milli) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve();
    }, milli);
  });
}
module.exports = sleep;

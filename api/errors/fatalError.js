
class FatalError extends Error {
  constructor(message) {
    super(message);
    this.name = 'FatalError';
  }
}
module.exports = FatalError;


class BadRequest extends Error {
  constructor(message) {
    super(message);
    this.name = 'BadRequestError';
  }
}
module.exports = BadRequest;

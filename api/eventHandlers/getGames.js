const GameHelper = require('../helpers/game');

function onGetGamesEvent(socket, { playerId }) {
  GameHelper.onGetGamesEvent(socket, { playerId });
}

module.exports = {
  onGetGamesEvent,
};

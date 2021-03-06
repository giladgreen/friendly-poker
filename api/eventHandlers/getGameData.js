const logger = require('../services/logger');
const { getPlayerCopyOfGame } = require('../helpers/gameCopy');
const { extractRequestGameAndPlayer } = require('../helpers/handlers');
const sendGame = require('../helpers/SendGame');

const Mappings = require('../Maps');

function onGetGameDataEvent(socket, { gameId, playerId }) {
  logger.info(`onGetGameDataEvent will get game data for game id: ${gameId}, and sent it to player: ${playerId}`);

  try {
    extractRequestGameAndPlayer({
      socket, gameId, playerId, shouldBelongToGame: false,
    });

    const gamePrivateCopy = getPlayerCopyOfGame(playerId, Mappings.getGameById(gameId));
    sendGame(socket, gamePrivateCopy, 'gameupdate');
  } catch (e) {
    logger.error('onGetGameDataEvent ', e.message);
    logger.error('error.stack ', e.stack);

    if (socket) socket.emit('onerror', { message: 'failed to get game data', reason: e.message, forceReload: true });
  }
}

module.exports = {
  onGetGameDataEvent,
};

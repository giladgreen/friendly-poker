const GameHelper = require('../helpers/game');
const logger = require('../services/logger');
const Mappings = require('../Maps');
const { extractRequestGameAndPlayer } = require('../helpers/handlers');

function onDeleteGameEvent(socket, { playerId, gameId }) {
  logger.info('onDeleteGameEvent ', { playerId, gameId });

  try {
    extractRequestGameAndPlayer({
      socket, gameId, playerId, adminOperation: true,
    });

    GameHelper.deleteGameInDB(gameId);
    Mappings.DeleteGameByGameId(gameId);
    GameHelper.publishPublicGames();
  } catch (e) {
    logger.error('failed to create game, error', e.message);
    if (socket) socket.emit('onerror', { message: 'failed to delete game', reason: e.message });
  }
}

module.exports = {
  onDeleteGameEvent,
};

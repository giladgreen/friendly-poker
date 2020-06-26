const GameHelper = require('../helpers/game');
const logger = require('../services/logger');
const Mappings = require('../Maps');
const { extractRequestGameAndPlayer } = require('../helpers/handlers');

function onDeleteGameEvent(socket, { playerId, gameId }) {
  logger.info('onDeleteGameEvent ', { playerId, gameId });

  try {
    const { game } = extractRequestGameAndPlayer({
      socket, gameId, playerId, adminOperation: true,
    });

    game.players
      .filter(p => p)
      .map(p => Mappings.GetSocketByPlayerId(p.id))
      .filter(s => s).forEach((s) => {
        s.emit('forcequit');
      });

    GameHelper.deleteGameInDB(gameId);
    Mappings.DeleteGameByGameId(gameId);
    GameHelper.publishPublicGames();
  } catch (e) {
    logger.error('failed to create game, error', e.message);
    logger.error('error.stack ', e.stack);
    if (socket) socket.emit('onerror', { message: 'failed to delete game', reason: e.message });
  }
}

module.exports = {
  onDeleteGameEvent,
};

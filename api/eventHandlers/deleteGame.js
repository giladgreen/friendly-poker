const GameHelper = require('../helpers/game');
const logger = require('../services/logger');
const Mappings = require('../Maps');

function onDeleteGameEvent(socket, { playerId, gameId }) {
  logger.info('onDeleteGameEvent ', { playerId, gameId });
  socket.playerId = playerId;

  Mappings.SaveSocketByPlayerId(playerId, socket);

  try {
    const game = Mappings.getGameById(gameId);
    if (!game) {
      throw new Error('game not found');
    }
    const admin = game.players.find(p => p.admin);
    if (admin.id !== playerId) {
      throw new Error('only admin can delete game');
    }
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

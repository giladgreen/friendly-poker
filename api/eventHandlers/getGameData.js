const logger = require('../services/logger');
const { getPlayerCopyOfGame } = require('../helpers/gameCopy');

const Mappings = require('../Maps');

function onGetGameDataEvent(socket, { gameId, playerId }) {
  logger.info('onGetGameDataEvent ');
  socket.playerId = playerId;
  Mappings.SaveSocketByPlayerId(playerId, socket);
  logger.info(`onGetGameDataEvent will get game data for game id: ${gameId}, and sent it to player: ${playerId}`);

  try {
    const gamePrivateCopy = getPlayerCopyOfGame(playerId, Mappings.getGameById(gameId));
    logger.info('onGetGameDataEvent ready to send game data..');

    socket.emit('gameupdate', gamePrivateCopy);
  } catch (e) {
    logger.error('onGetGameDataEvent error:', e.message);
    if (socket) socket.emit('onerror', { message: 'failed to get game data', reason: e.message, forceReload: true });
  }
}

module.exports = {
  onGetGameDataEvent,
};

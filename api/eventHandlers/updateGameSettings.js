const logger = require('../services/logger');
const Mappings = require('../Maps');

function onUpdateGameSettingsEvent(socket, {
  gameId, dateTime, playerId, time, smallBlind, bigBlind,
}) {
  logger.info('onUpdateGameSettingsEvent ', gameId, dateTime, playerId, time, smallBlind, bigBlind);

  try {
    socket.playerId = playerId;
    Mappings.SaveSocketByPlayerId(playerId, socket);

    const game = Mappings.getGameById(gameId);
    if (!game) {
      throw new Error('did not find game');
    }
    const player = game.players.find(p => p.id === playerId);
    if (!player) {
      throw new Error('did not find player');
    }
    if (!player.creator) {
      throw new Error('non creator player cannot change game settings');
    }

    game.timePendingChane = time;
    game.smallBlindPendingChane = smallBlind;
    game.bigBlindPendingChane = bigBlind;
  } catch (e) {
    logger.error('failed to join game. ', e.message);
    if (socket) socket.emit('onerror', { message: 'failed to update game settings', reason: e.message });
  }
}

module.exports = {
  onUpdateGameSettingsEvent,
};

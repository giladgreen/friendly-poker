const logger = require('../services/logger');
const { updateGamePlayers } = require('../helpers/game');
const { extractRequestGameAndPlayer } = require('../helpers/handlers');

function onSitBackEvent(socket, { playerId, gameId, now }) {
  try {
    logger.info('onSitBackEvent');
    const { game, player } = extractRequestGameAndPlayer({
      socket, gameId, playerId,
    });

    player.sitOut = true;
    player.justJoined = true;

    const msg = `${player.name} will re-joined next hand`;
    game.messages.push({
      action: 'sitback', popupMessage: msg, log: msg, now,
    });

    updateGamePlayers(game);
  } catch (e) {
    logger.error('onSitBackEvent error', e.message);
    logger.error('error.stack ', e.stack);

    if (socket) socket.emit('onerror', { message: 'failed to sit back', reason: e.message });
  }
}

module.exports = {
  onSitBackEvent,
};

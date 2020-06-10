const logger = require('../services/logger');
const { updateGamePlayers } = require('../helpers/game');
const { extractRequestGameAndPlayer, validateGameWithMessage } = require('../helpers/handlers');


function onUserMessageEvent(socket, {
  playerId, gameId, message, now,
}) {
  try {
    logger.info('onUserMessageEvent', { playerId, gameId, message });
    const { game, player } = extractRequestGameAndPlayer({
      socket, gameId, playerId,
    });
    validateGameWithMessage(game, ' before onUserMessageEvent');

    const playerIndex = game.players.findIndex(p => p && p.id === playerId);
    game.messages.push({
      action: 'usermessage', name: player.name, text: message, playerIndex, now,
    });
    validateGameWithMessage(game, ' after onUserMessageEvent');

    updateGamePlayers(game);
  } catch (e) {
    logger.error('onUserMessageEvent error:', e);
    if (socket) socket.emit('onerror', { message: 'failed to send user message', reason: e.message });
  }
}

module.exports = {
  onUserMessageEvent,
};

const logger = require('../services/logger');
const { updateGamePlayers } = require('../helpers/game');
const { extractRequestGameAndPlayer } = require('../helpers/handlers');


function onUserMessageEvent(socket, {
  playerId, gameId, message, now,
}) {
  try {
    logger.info('onUserMessageEvent');
    const { game, player } = extractRequestGameAndPlayer({
      socket, gameId, playerId,
    });

    const playerIndex = game.players.findIndex(p => p.id === playerId);
    game.messages.push({
      action: 'usermessage', name: player.name, text: message, playerIndex, now,
    });

    updateGamePlayers(game);
  } catch (e) {
    logger.error(`onUserMessageEvent error:${e.message}`);
    if (socket) socket.emit('onerror', { message: 'failed to send user message', reason: e.message });
  }
}

module.exports = {
  onUserMessageEvent,
};

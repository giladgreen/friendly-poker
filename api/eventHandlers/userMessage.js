const logger = require('../services/logger');
const { updateGamePlayers } = require('../helpers/game');
const Mappings = require('../Maps');

function onUserMessageEvent(socket, { playerId, gameId, message }) {
  try {
    logger.info('onUserMessageEvent');
    socket.playerId = playerId;
    Mappings.SaveSocketByPlayerId(playerId, socket);

    const game = Mappings.getGameById(gameId);
    if (!game) {
      throw new Error('did not found game');
    }
    const player = game.players.find(p => p.id === playerId);
    if (!player) {
      throw new Error('did not found player');
    }
    const playerIndex = game.players.findIndex(p => p.id === playerId);
    game.messages.push({
      action: 'usermessage', name: player.name, text: message, playerIndex,
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

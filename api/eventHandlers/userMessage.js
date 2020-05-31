const logger = require('../services/logger');
const { updateGamePlayers } = require('../helpers/game');
const Mappings = require('../Maps');
const BadRequest = require('../errors/badRequest');

function onUserMessageEvent(socket, {
  playerId, gameId, message, now,
}) {
  try {
    logger.info('onUserMessageEvent');
    socket.playerId = playerId;
    Mappings.SaveSocketByPlayerId(playerId, socket);

    const game = Mappings.getGameById(gameId);
    if (!game) {
      throw new BadRequest('did not find game');
    }
    const player = game.players.find(p => p.id === playerId);
    if (!player) {
      throw new BadRequest('did not find player');
    }
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

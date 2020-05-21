const logger = require('../services/logger');
const { updateGamePlayers } = require('../helpers/game');
const Mappings = require('../Maps');

function onSitBackEvent(socket, { playerId, gameId, now }) {
  try {
    logger.info('onSitBackEvent');
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

    game.pendingPlayers.push(playerId);
    const msg = `${player.name} will re-joined next hand`;
    game.messages.push({
      action: 'sitback', popupMessage: msg, log: msg, now,
    });

    updateGamePlayers(game);
  } catch (e) {
    logger.error(`onSitBackEvent error:${e.message}`);
    if (socket) socket.emit('onerror', { message: 'failed to sit back', reason: e.message });
  }
}

module.exports = {
  onSitBackEvent,
};

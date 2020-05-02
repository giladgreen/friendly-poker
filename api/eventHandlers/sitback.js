const logger = require('../services/logger');
const { updateGamePlayers } = require('../helpers/game');
const Mappings = require('../Maps');

function onSitBackEvent(socket, { playerId, gameId }) {
  try {
    logger.info('onSitBackEvent');
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

    delete player.sitOut;

    game.messages.push({
      action: 'sitback', name: player.name, popupMessage: `${player.name} as re-joined te game`,
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

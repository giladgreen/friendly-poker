const logger = require('../services/logger');
const Mappings = require('../Maps');
const { extractRequestGameAndPlayer } = require('../helpers/handlers');

const { updateGamePlayers } = require('../helpers/game');

function onDeclineRebuyEvent(socket, {
  gameId, playerId, rebuyPlayerId, amount, declineMessage,
}) {
  logger.info('onDeclineRebuyEvent ');

  try {
    const { game } = extractRequestGameAndPlayer({
      socket, gameId, playerId, adminOperation: true,
    });

    game.pendingRebuy = game.pendingRebuy.filter(data => data.id !== rebuyPlayerId || data.amount !== amount);
    updateGamePlayers(game);

    const playerSocket = Mappings.GetSocketByPlayerId(rebuyPlayerId);
    if (playerSocket) {
      playerSocket.emit('rebuyrequestdeclined', declineMessage);
    }
  } catch (e) {
    if (socket) socket.emit('onerror', { message: 'failed to decline rebuy', reason: e.message });
  }
}

module.exports = {
  onDeclineRebuyEvent,
};

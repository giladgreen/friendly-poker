const logger = require('../services/logger');

const { extractRequestGameAndPlayer } = require('../helpers/handlers');
const { updateGamePlayers } = require('../helpers/game');
const GamesService = require('../services/games');
const BadRequest = require('../errors/badRequest');


function onApproveRebuyEvent(socket, {
  gameId, playerId, rebuyPlayerId, amount, now,
}) {
  logger.info('onApproveRebuyEvent ', {
    gameId, playerId, rebuyPlayerId, amount,
  });

  try {
    const { game } = extractRequestGameAndPlayer({
      socket, gameId, playerId, adminOperation: true,
    });

    const pendingRequest = game.pendingRebuy.find(data => (data.id === rebuyPlayerId) && data.amount === amount);
    if (!pendingRequest) {
      throw new BadRequest(`did not find matching pending rebuy request: ${JSON.stringify({ rebuyPlayerId, amount })}`);
    }
    const player = game.players.find(p => p && p.id === pendingRequest.id);
    if (!player) {
      throw new BadRequest('rebuy approval - did not find player in players list');
    }
    player.justDidRebuyAmount = pendingRequest.amount;
    game.pendingRebuy = game.pendingRebuy.filter(data => (data.id !== rebuyPlayerId) || data.amount !== amount);
    if (player.fold || player.sitOut) {
      GamesService.handlePlayerRebuyMidHand(game, player, now);
    }

    updateGamePlayers(game);
  } catch (e) {
    logger.error('onApproveRebuyEvent error', e.message);
    logger.error('error.stack ', e.stack);
    if (socket) socket.emit('onerror', { message: 'failed to approve rebuy', reason: e.message });
  }
}

module.exports = {
  onApproveRebuyEvent,
};

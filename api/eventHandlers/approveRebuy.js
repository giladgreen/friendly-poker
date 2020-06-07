const logger = require('../services/logger');
const GamesService = require('../services/games');

const { extractRequestGameAndPlayer } = require('../helpers/handlers');
const { updateGamePlayers } = require('../helpers/game');
const BadRequest = require('../errors/badRequest');


function onApproveRebuyEvent(socket, {
  gameId, playerId, rebuyPlayerId, amount, now,
}) {
  logger.info('onApproveRebuyEvent ');

  try {
    const { game } = extractRequestGameAndPlayer({
      socket, gameId, playerId, adminOperation: true,
    });

    const pendingRequest = game.pendingRebuy.find(data => data.playerId === rebuyPlayerId && data.amount === amount);
    if (!pendingRequest) {
      throw new BadRequest(`did not find matching pending rebuy request: ${JSON.stringify({ rebuyPlayerId, amount })}`);
    }
    pendingRequest.approved = true;
    GamesService.gamePendingRebuys(game, now);

    updateGamePlayers(game);
  } catch (e) {
    if (socket) socket.emit('onerror', { message: 'failed to approve rebuy', reason: e.message });
  }
}

module.exports = {
  onApproveRebuyEvent,
};

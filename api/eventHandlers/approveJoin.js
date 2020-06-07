const logger = require('../services/logger');
const GamesService = require('../services/games');
const { extractRequestGameAndPlayer } = require('../helpers/handlers');
const { updateGamePlayers } = require('../helpers/game');
const BadRequest = require('../errors/badRequest');


function onApproveJoinEvent(socket, {
  gameId, playerId, joinedPlayerId, balance, now
}) {
  logger.info('onApproveJoinEvent ');

  try {
    const { game } = extractRequestGameAndPlayer({
      socket, gameId, playerId, adminOperation: true,
    });

    const pendingRequest = game.pendingJoin.find(data => data.playerId === joinedPlayerId && data.balance === balance);
    if (!pendingRequest) {
      throw new BadRequest('did not find matching pending join request');
    }
    pendingRequest.approved = true;
    GamesService.gamePendingJoinings(game, now);
    updateGamePlayers(game);
  } catch (e) {
    if (socket) socket.emit('onerror', { message: 'failed to approve Join', reason: e.message });
  }
}

module.exports = {
  onApproveJoinEvent,
};

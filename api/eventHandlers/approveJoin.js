const logger = require('../services/logger');
const GamesService = require('../services/games');
const { extractRequestGameAndPlayer } = require('../helpers/handlers');
const { updateGamePlayers } = require('../helpers/game');
const BadRequest = require('../errors/badRequest');


function onApproveJoinEvent(socket, {
  gameId, playerId, joinedPlayerId, balance, now,
}) {
  logger.info('onApproveJoinEvent ', {
    gameId, playerId, joinedPlayerId, balance,
  });

  try {
    const { game } = extractRequestGameAndPlayer({
      socket, gameId, playerId, adminOperation: true,
    });

    if (game.players.filter(p => Boolean(p)).length >= game.maxPlayers) {
      throw new BadRequest('table is full');
    }

    const pendingRequest = game.pendingJoin.find(data => data.id === joinedPlayerId && data.balance === balance);
    if (!pendingRequest) {
      throw new BadRequest('did not find matching pending join request');
    }

    GamesService.handlePlayerJoinMidHand(game, pendingRequest, now);
    game.pendingJoin = game.pendingJoin.filter(data => data.id !== joinedPlayerId);
    if (game.startDate && game.paused && game.pausedByServer) {
      logger.info('calling startNewHand');
      GamesService.startNewHand(game, now);
      GamesService.resetHandTimer(game);
    }

    updateGamePlayers(game);
  } catch (e) {
    logger.error('onApproveJoinEvent error', e.message);
    logger.error('error.stack ', e.stack);
    if (socket) socket.emit('onerror', { message: 'failed to approve Join', reason: e.message });
  }
}

module.exports = {
  onApproveJoinEvent,
};

const logger = require('../services/logger');
const { updateGamePlayers } = require('../helpers/game');
const GamesService = require('../services/games');
const { onPlayerActionEvent } = require('./playerAction');
const BadRequest = require('../errors/badRequest');
const { extractRequestGameAndPlayer, validateGameWithMessage } = require('../helpers/handlers');

function onResumeGameEvent(socket, { gameId, playerId, now }) {
  logger.info('onResumeGameEvent ', { gameId, playerId, now });

  try {
    const { game } = extractRequestGameAndPlayer({
      socket, gameId, playerId, adminOperation: true,
    });
    validateGameWithMessage(game, ' before onResumeGameEvent');

    if (game.pausedByServer) {
      const playersCount = game.pausingHand
        ? game.players.filter(player => player && !player.sitOut)
        : game.players.filter(player => player && (!player.sitOut || player.justJoined) && (player.balance || player.justDidRebuyAmount));

      if (playersCount < 2) {
        throw new BadRequest('game cant be resume yet');
      } else {
        delete game.paused;
        delete game.pausedByServer;
        if (game.startDate && game.handOver) {
          logger.info('calling startNewHand');
          GamesService.startNewHand(game, now);
          GamesService.resetHandTimer(game, onPlayerActionEvent);
        }
      }
    } else {
      delete game.paused;
      if (!game.pausingHand) {
        logger.info('calling startNewHand');
        GamesService.startNewHand(game, now);
      }
      GamesService.resetHandTimer(game, onPlayerActionEvent);
      game.messages.push({
        action: 'game_resumed', popupMessage: 'Game Resumed', log: 'Game Resumed', now,
      });
    }

    validateGameWithMessage(game, ' after onResumeGameEvent');

    updateGamePlayers(game);
  } catch (e) {
    logger.error('onResumeGameEvent error', e);

    if (socket) socket.emit('onerror', { message: 'failed to resume game', reason: e.message });
  }
}

module.exports = {
  onResumeGameEvent,
};

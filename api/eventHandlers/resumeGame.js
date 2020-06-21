const logger = require('../services/logger');
const { updateGamePlayers } = require('../helpers/game');
const GamesService = require('../services/games');
const BadRequest = require('../errors/badRequest');
const { extractRequestGameAndPlayer } = require('../helpers/handlers');

function onResumeGameEvent(socket, { gameId, playerId, now }) {
  logger.info('onResumeGameEvent ', { gameId, playerId, now });

  try {
    const { game } = extractRequestGameAndPlayer({
      socket, gameId, playerId, adminOperation: true,
    });

    if (game.pausedByServer) {
      logger.info('resuming game paused by server');
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
          GamesService.resetHandTimer(game);
        }
      }
    } else {
      logger.info('resuming game paused by admin');
      delete game.paused;
      if (!game.pausingHand) {
        logger.info('game was paused not in the middle of a hand - calling startNewHand');
        GamesService.startNewHand(game, now);
      }
      const secondsPassed = game.secondsPassedFromLastActionOnPause || 1;
      logger.info(`seconds Passed since last action: ${secondsPassed}, game.currentTimerTime was ${game.currentTimerTime}`);
      game.currentTimerTime = game.currentTimerTime - secondsPassed < 5 ? 5 : game.currentTimerTime - secondsPassed;

      GamesService.resetHandTimer(game);
      game.messages.push({
        action: 'game_resumed', popupMessage: 'Game Resumed', log: 'Game Resumed', now,
      });
    }


    updateGamePlayers(game);
  } catch (e) {
    logger.error('onResumeGameEvent error', e.message);
    logger.error('error.stack ', e.stack);

    if (socket) socket.emit('onerror', { message: 'failed to resume game', reason: e.message });
  }
}

module.exports = {
  onResumeGameEvent,
};

const logger = require('../services/logger');
const { extractRequestGameAndPlayer } = require('../helpers/handlers');
const { updateGamePlayers } = require('../helpers/game');
const GamesService = require('../services/games');
const BadRequest = require('../errors/badRequest');

function onPauseGameEvent(socket, { gameId, playerId, now }) {
  logger.info('onPauseGameEvent ');

  try {
    const { game } = extractRequestGameAndPlayer({
      socket, gameId, playerId, adminOperation: true,
    });

    if (game.paused) {
      throw new BadRequest('game already paused');
    }

    game.pausingHand = game.startDate && !game.handOver;

    game.paused = true;
    game.lastAction = game.lastAction || (new Date()).getTime();
    const secondsPassed = Math.floor(((new Date()).getTime() - game.lastAction) / 1000);
    game.secondsPassedFromLastActionOnPause = secondsPassed;
    game.messages.push({
      action: 'game_paused', popupMessage: 'Game Paused', log: 'Game Paused', now,
    });
    GamesService.pauseHandTimer(game);

    updateGamePlayers(game);
  } catch (e) {
    logger.error('onPauseGameEvent error', e.message);
    logger.error('error.stack ', e.stack);

    if (socket) socket.emit('onerror', { message: 'failed to pause game', reason: e.message });
  }
}

module.exports = {
  onPauseGameEvent,
};

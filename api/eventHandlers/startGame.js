const logger = require('../services/logger');
const { updateGamePlayers } = require('../helpers/game');
const GamesService = require('../services/games');
const BadRequest = require('../errors/badRequest');
const { extractRequestGameAndPlayer, validateGameWithMessage } = require('../helpers/handlers');

function onStartGameEvent(socket, { gameId, now, playerId }) {
  logger.info('onStartGameEvent ');

  try {
    const { game } = extractRequestGameAndPlayer({
      socket, gameId, playerId, adminOperation: true,
    });


    if (game.players.filter(p => Boolean(p)).length < 2) {
      throw new BadRequest('not enough players');
    }

    GamesService.startNewHand(game, now);
    game.messages = [{
      action: 'game_started',
      popupMessage: 'Game Started',
      log: 'Game Started',
      now,
    }];
    game.startDate = now;
    game.lastAction = (new Date()).getTime();
    GamesService.resetHandTimer(game);

    validateGameWithMessage(game, ' after onStartGameEvent');

    updateGamePlayers(game);
    game.messages = [];
  } catch (e) {
    logger.error('onStartGameEvent error', e.message);
    logger.error('error.stack ', e.stack);

    if (socket) socket.emit('onerror', { message: 'failed to start game', reason: e.message });
  }
}

module.exports = {
  onStartGameEvent,
};

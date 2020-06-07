const logger = require('../services/logger');
const { onPlayerActionEvent } = require('./playerAction');
const { updateGamePlayers } = require('../helpers/game');
const GamesService = require('../services/games');
const BadRequest = require('../errors/badRequest');
const { extractRequestGameAndPlayer } = require('../helpers/handlers');

function onStartGameEvent(socket, { gameId, now, playerId }) {
  logger.info('onStartGameEvent ');

  try {
    const { game } = extractRequestGameAndPlayer({
      socket, gameId, playerId, adminOperation: true,
    });


    if (game.players.length < 2) {
      throw new BadRequest('not enough players');
    }

    GamesService.startNewHand(game, now);
    GamesService.resetHandTimer(game, onPlayerActionEvent);
    game.messages = [{
      action: 'game_started',
      popupMessage: 'Game Started',
      log: 'Game Started',
      now,
    }];
    game.startDate = now;
    game.lastAction = (new Date()).getTime();
    updateGamePlayers(game);
    game.messages = [];
  } catch (e) {
    if (socket) socket.emit('onerror', { message: 'failed to start game', reason: e.message });
  }
}

module.exports = {
  onStartGameEvent,
};

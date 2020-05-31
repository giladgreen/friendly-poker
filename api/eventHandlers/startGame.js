const logger = require('../services/logger');
const { onPlayerActionEvent } = require('./playerAction');
const { updateGamePlayers } = require('../helpers/game');
const GamesService = require('../services/games');
const Mappings = require('../Maps');
const BadRequest = require('../errors/badRequest');

function onStartGameEvent(socket, { gameId, now, playerId }) {
  logger.info('onStartGameEvent ');

  try {
    socket.playerId = playerId;
    Mappings.SaveSocketByPlayerId(playerId, socket);
    const game = Mappings.getGameById(gameId);
    if (game.players.length < 2) {
      throw new BadRequest('not enough players');
    }
    if (!game.players.some(p => p.id === playerId)) {
      throw new BadRequest('non game player');
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

const logger = require('../services/logger');
const { onPlayerActionEvent } = require('./playerAction');
const { updateGamePlayers } = require('../helpers/game');
const GamesService = require('../services/games');
const Mappings = require('../Maps');

function onStartGameEvent(socket, { gameId, dateTime, playerId }) {
  logger.info('onStartGameEvent ');

  try {
    socket.playerId = playerId;
    Mappings.SaveSocketByPlayerId(playerId, socket);
    const game = Mappings.getGameById(gameId);
    if (game.players.length < 2) {
      throw new Error('not enough players');
    }
    if (!game.players.some(p => p.id === playerId)) {
      throw new Error('non game player');
    }

    GamesService.startNewHand(game, dateTime);
    GamesService.resetHandTimer(game, onPlayerActionEvent);
    const starterPlayer = game.players.find(p => p.id === playerId);
    game.messages = [{
      action: 'game_started',
      name: starterPlayer.name,
    }];
    game.startDate = dateTime;
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

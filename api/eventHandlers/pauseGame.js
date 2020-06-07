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
    if (!game.handOver) {
      game.pausingHand = true;
    }
    game.paused = true;
    game.messages.push({
      action: 'game_paused', popupMessage: 'Game Paused', log: 'Game Paused', now,
    });
    GamesService.pauseHandTimer(game);

    updateGamePlayers(game);
  } catch (e) {
    if (socket) socket.emit('onerror', { message: 'failed to pause game', reason: e.message });
  }
}

module.exports = {
  onPauseGameEvent,
};

const logger = require('../services/logger');
const { updateGamePlayers } = require('../helpers/game');
const GamesService = require('../services/games');
const { extractRequestGameAndPlayer } = require('../helpers/handlers');

function onSkipHandEvent(socket, { gameId, now, playerId }) {
  logger.info('onSkipHandEvent ', { gameId, now, playerId });

  try {
    const { game } = extractRequestGameAndPlayer({
      socket, gameId, playerId, adminOperation: true,
    });

    game.players.filter(p => Boolean(p)).forEach((p) => {
      p.balance += p.pot.reduce((total, num) => total + num, 0);
      p.pot = [0, 0, 0, 0];
    });
    game.pot = 0;
    GamesService.startNewHand(game, now);
    GamesService.resetHandTimer(game);

    game.messages.push({
      action: 'skiphand', popupMessage: 'Admin Forced Skipped to next hand', log: 'Admin Forced Skipped to next hand', now,
    });

    updateGamePlayers(game);
    game.messages = [];
  } catch (e) {
    logger.error('onSkipHandEvent error', e.message);
    logger.error('error.stack ', e.stack);

    if (socket) socket.emit('onerror', { message: 'failed to skip hand', reason: e.message });
  }
}

module.exports = {
  onSkipHandEvent,
};

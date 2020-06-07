const logger = require('../services/logger');
const { onPlayerActionEvent } = require('./playerAction');
const { updateGamePlayers } = require('../helpers/game');
const GamesService = require('../services/games');
const { extractRequestGameAndPlayer } = require('../helpers/handlers');

function onSkipHandEvent(socket, { gameId, now, playerId }) {
  logger.info('onSkipHandEvent ');

  try {
    const { game } = extractRequestGameAndPlayer({
      socket, gameId, playerId, adminOperation: true,
    });


    game.players.forEach((p) => { p.balance += p.pot.reduce((total, num) => total + num, 0); });
    game.pot = 0;
    GamesService.startNewHand(game, now);
    GamesService.resetHandTimer(game, onPlayerActionEvent);

    game.messages.push({
      action: 'skiphand', popupMessage: 'Admin Forced Skipped to next hand', log: 'Admin Forced Skipped to next hand', now,
    });

    updateGamePlayers(game);
    game.messages = [];
  } catch (e) {
    if (socket) socket.emit('onerror', { message: 'failed to skip hand', reason: e.message });
  }
}

module.exports = {
  onSkipHandEvent,
};

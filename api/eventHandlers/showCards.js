const logger = require('../services/logger');
const { updateGamePlayers } = require('../helpers/game');
const BadRequest = require('../errors/badRequest');
const { extractRequestGameAndPlayer } = require('../helpers/handlers');

function onUserShowedCardsEvent(socket, {
  playerId, gameId,
}) {
  try {
    logger.info('onUserShowedCardsEvent');
    const { game } = extractRequestGameAndPlayer({
      socket, gameId, playerId,
    });

    if (!game.handOver) {
      throw new BadRequest('cant show mid-hand');
    }

    game.showPlayersHands.push(playerId);
    updateGamePlayers(game);
  } catch (e) {
    logger.error(`onUserShowedCardsEvent error:${e.message}`);
    if (socket) socket.emit('onerror', { message: 'failed to show hand', reason: e.message });
  }
}

module.exports = {
  onUserShowedCardsEvent,
};

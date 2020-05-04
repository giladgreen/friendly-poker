const logger = require('../services/logger');
const { updateGamePlayers } = require('../helpers/game');
const Mappings = require('../Maps');

function onUserShowedCardsEvent(socket, {
  playerId, gameId,
}) {
  try {
    logger.info('onUserShowedCardsEvent');
    socket.playerId = playerId;
    Mappings.SaveSocketByPlayerId(playerId, socket);

    const game = Mappings.getGameById(gameId);
    if (!game) {
      throw new Error('did not find game');
    }
    if (!game.handOver) {
      throw new Error('cant show mid-hand');
    }
    const player = game.players.find(p => p.id === playerId);
    if (!player) {
      throw new Error('did not find player');
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

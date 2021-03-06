const logger = require('../services/logger');
const { extractRequestGameAndPlayer } = require('../helpers/handlers');

const { updateGamePlayers } = require('../helpers/game');
const BadRequest = require('../errors/badRequest');
const { FOLD } = require('../consts');

function onStandupEvent(socket, { playerId, gameId }) {
  try {
    logger.info('onStandupEvent');
    const { game, player } = extractRequestGameAndPlayer({
      socket, gameId, playerId,
    });

    if (player.sitOut) {
      throw new BadRequest('already sitting out');
    }

    if (game.handOver) {
      player.sitOut = true;
    } else {
      if (!player.fold) {
        game.timerRefCb(socket, {
          op: FOLD,
          amount: 0,
          gameId: game.id,
          hand: game.hand,
          playerId,
          force: true,
        });
      }
      game.pendingStandUp.push(playerId);
    }


    updateGamePlayers(game);
  } catch (e) {
    logger.error('onStandupEvent error', e.message);
    logger.error('error.stack ', e.stack);

    if (socket) socket.emit('onerror', { message: 'failed to stand up', reason: e.message });
  }
}

module.exports = {
  onStandupEvent,
};

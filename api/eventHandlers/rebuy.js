/* eslint-disable no-await-in-loop */
const GamesService = require('../services/games');
const logger = require('../services/logger');
const { updateGamePlayers } = require('../helpers/game');
const BadRequest = require('../errors/badRequest');
const { extractRequestGameAndPlayer } = require('../helpers/handlers');


async function onRebuyEvent(socket, {
  playerId, gameId, amount, now,
}) {
  try {
    logger.info('onRebuyEvent', {
      playerId, gameId, amount, now,
    });

    const { game, player } = extractRequestGameAndPlayer({
      socket, gameId, playerId,
    });

    const adminPlayer = game.players.find(p => p && p.admin);
    if (!adminPlayer) {
      throw new BadRequest('did not find admin player');
    }
    if (game.requireRebuyApproval && playerId !== adminPlayer.id) {
      game.pendingRebuy.push({
        id: playerId, amount, name: player.name,
      });
    } else {
      player.justDidRebuyAmount = amount;

      if (player.fold || player.sitOut || (player.balance === 0 && game.handOver)) {
        GamesService.handlePlayerRebuyMidHand(game, player, now);
      }


      if (game.startDate && game.paused && game.pausedByServer) {
        logger.info('calling startNewHand');
        GamesService.startNewHand(game, now);
        GamesService.resetHandTimer(game);
      }
    }

    updateGamePlayers(game);
  } catch (e) {
    logger.error('onRebuyEvent error', e.message);
    logger.error('error.stack ', e.stack);
    if (socket) socket.emit('onerror', { message: 'failed to rebuy', reason: e.message });
  }
}

module.exports = {
  onRebuyEvent,
};

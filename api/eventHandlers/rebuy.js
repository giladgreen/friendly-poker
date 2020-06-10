/* eslint-disable no-await-in-loop */
const logger = require('../services/logger');
const { updateGamePlayers } = require('../helpers/game');
const BadRequest = require('../errors/badRequest');
const { extractRequestGameAndPlayer, validateGameWithMessage } = require('../helpers/handlers');

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
    validateGameWithMessage(game, ' before onRebuyEvent');

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
      const msg = `${player.name} did a rebuy of ${amount}`;
      game.messages.push({
        action: 'rebuy', name: player.name, amount, popupMessage: msg, log: msg,
      });
    }
    validateGameWithMessage(game, ' after onRebuyEvent');

    updateGamePlayers(game);
  } catch (e) {
    logger.error('onRebuyEvent error', e);
    if (socket) socket.emit('onerror', { message: 'failed to rebuy', reason: e.message });
  }
}

module.exports = {
  onRebuyEvent,
};

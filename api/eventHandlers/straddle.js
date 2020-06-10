const logger = require('../services/logger');

const BadRequest = require('../errors/badRequest');

const { extractRequestGameAndPlayer, validateGameWithMessage } = require('../helpers/handlers');

const getNextPlayerIndex = (players, index) => ((index + 1 < players.length) ? index + 1 : 0);

const getNextActivePlayerIndex = (players, index) => {
  let nextPlayerIndex = getNextPlayerIndex(players, index);
  let count = 0;
  while (!players[nextPlayerIndex] || (players[nextPlayerIndex].sitOut && !players[nextPlayerIndex].justJoined)) {
    nextPlayerIndex = getNextPlayerIndex(players, nextPlayerIndex);
    count++;

    if (count > players.length + 1) {
      return null;
    }
  }
  return nextPlayerIndex;
};

function getNextStraddleId(players) {
  const dealerIndex = players.findIndex(p => p && p.dealer);
  const newDealerIndex = getNextActivePlayerIndex(players, dealerIndex);
  const newSmallIndex = getNextActivePlayerIndex(players, newDealerIndex);
  const newBigIndex = getNextActivePlayerIndex(players, newSmallIndex);
  const newStraddleIndex = getNextActivePlayerIndex(players, newBigIndex);
  const id = players[newStraddleIndex] ? players[newStraddleIndex].id : '-';
  return id;
}

function onStraddle(socket, {
  playerId, gameId,
}) {
  try {
    logger.info('onStraddle');
    const { game, player } = extractRequestGameAndPlayer({
      socket, gameId, playerId,

    });
    validateGameWithMessage(game, ' before onStraddle');

    if (!game.straddleEnabled) {
      throw new BadRequest('straddle not enabled');
    }
    if (playerId !== getNextStraddleId(game.players)) {
      throw new BadRequest('player is not in straddle position on next hand');
    }

    if (player.balance < 2 * game.bigBlind) {
      throw new BadRequest("player doesn't have enough");
    }

    if (game.players.filter(p => p && !p.sitOut).length < 3) {
      throw new BadRequest("can't starddle when less then 3 players");
    }

    game.players.filter(p => Boolean(p)).forEach((p) => {
      delete p.straddle;
    });
    player.straddle = true;
    logger.info(`player is now Straddle:${player.name}`);

    validateGameWithMessage(game, ' after onStraddle');
  } catch (e) {
    logger.error('onStraddle error', e);

    if (socket) socket.emit('onerror', { message: 'failed to Straddle', reason: e.message });
  }
}

module.exports = {
  onStraddle,
};

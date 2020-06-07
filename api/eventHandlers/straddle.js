const _ = require('lodash');
const logger = require('../services/logger');
const PlayerHelper = require('../helpers/players');
const BadRequest = require('../errors/badRequest');

const { extractRequestGameAndPlayer } = require('../helpers/handlers');

function getNextStraddleId({ players }) {
  const bigIndex = _.findIndex(players, player => player.big);

  const newUTGIndex = PlayerHelper.getNextGamePlayerIndex(players, bigIndex);
  const newStraddleIndex = PlayerHelper.getNextGamePlayerIndex(players, newUTGIndex);
  const newStraddle = players[newStraddleIndex];
  return newStraddle.id;
}

function onStraddle(socket, {
  playerId, gameId,
}) {
  try {
    logger.info('onStraddle');
    const { game, player } = extractRequestGameAndPlayer({
      socket, gameId, playerId,

    });

    if (!game.straddleEnabled) {
      throw new BadRequest('straddle not enabled');
    }

    if (playerId !== getNextStraddleId(game)) {
      throw new BadRequest('player is not in straddle position on next hand');
    }

    if (player.balance < 2 * game.bigBlind) {
      throw new BadRequest("player doesn't have enough");
    }

    if (game.players.filter(p => !p.sitOut).length < 3) {
      throw new BadRequest("can't starddle when less then 3 players");
    }

    game.players.forEach((p) => {
      delete p.straddle;
    });
    player.straddle = true;
    logger.info(`player is now Straddle:${player.name}`);
  } catch (e) {
    logger.error(`onStraddle error:${e.message}`);
    if (socket) socket.emit('onerror', { message: 'failed to Straddle', reason: e.message });
  }
}

module.exports = {
  onStraddle,
};

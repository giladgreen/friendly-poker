const logger = require('../services/logger');
const PlayerHelper = require('../helpers/players');
const BadRequest = require('../errors/badRequest');
const Mappings = require('../Maps');


function getStraddleId({ players }) {
  let bigIndex = -1;
  players.forEach((player, index) => {
    if (player.big) {
      bigIndex = index;
    }
  });

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
    socket.playerId = playerId;
    Mappings.SaveSocketByPlayerId(playerId, socket);

    const game = Mappings.getGameById(gameId);
    if (!game) {
      throw new BadRequest('did not find game');
    }
    const player = game.players.find(p => p.id === playerId);
    if (!player) {
      throw new BadRequest('did not find player');
    }

    if (!game.straddleEnabled) {
      throw new BadRequest('straddle not enabled');
    }

    if (playerId !== getStraddleId(game)) {
      throw new BadRequest('player is not in the straddle position');
    }

    if (player.balance < 2 * game.bigBlind) {
      throw new BadRequest("player doesn't have enough");
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

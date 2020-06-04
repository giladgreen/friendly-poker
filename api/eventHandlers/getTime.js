const logger = require('../services/logger');
const { updateGamePlayers } = require('../helpers/game');
const GamesService = require('../services/games');
const { onPlayerActionEvent } = require('./playerAction');

const BadRequest = require('../errors/badRequest');
const Mappings = require('../Maps');

function onGetTime(socket, {
  playerId, gameId,
}) {
  try {
    logger.info('onGetTime');
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

    if (!game.timeBankEnabled) {
      throw new BadRequest('timeBank not enabled');
    }

    if (player.timeBank < 20) {
      throw new BadRequest('player does not have enough in his time bank');
    }

    player.timeBank -= 20;

    logger.info(`${player.name} is using 20 sec from his time bank, new time bank value:${player.timeBank}`);
    if (game.lastAction) {
      const secondsPassed = Math.floor(((new Date()).getTime() - game.lastAction) / 1000);
      game.currentTimerTime = game.currentTimerTime - secondsPassed + 20;
    } else {
      game.currentTimerTime = 25;
    }
    game.lastAction = (new Date()).getTime();
    GamesService.resetHandTimer(game, onPlayerActionEvent);
    updateGamePlayers(game);
  } catch (e) {
    logger.error(`onStraddle error:${e.message}`);
    if (socket) socket.emit('onerror', { message: 'failed to Get Time', reason: e.message });
  }
}

module.exports = {
  onGetTime,
};

const logger = require('../services/logger');
const { updateGamePlayers } = require('../helpers/game');
const GamesService = require('../services/games');
const { extractRequestGameAndPlayer, validateGameWithMessage } = require('../helpers/handlers');
const BadRequest = require('../errors/badRequest');
const {
  TIME_BANK_DEFAULT,
} = require('../consts');

function onGetTimeFromBank(socket, {
  playerId, gameId,
}) {
  try {
    logger.info('onGetTimeFromBank', { playerId, gameId });
    const { game, player } = extractRequestGameAndPlayer({
      socket, gameId, playerId,
    });
    validateGameWithMessage(game, ' before onGetTimeFromBank');


    if (!game.timeBankEnabled) {
      throw new BadRequest('timeBank not enabled');
    }

    if (player.timeBank < TIME_BANK_DEFAULT) {
      throw new BadRequest(`player does not have enough in his time bank: ${player.timeBank}`);
    }

    if (!player.active) {
      throw new BadRequest('non active player should not get more time..');
    }

    player.timeBank -= TIME_BANK_DEFAULT;

    logger.info(`${player.name} is using ${TIME_BANK_DEFAULT} sec from his time bank, new time bank value:${player.timeBank}`);
    if (game.lastAction) {
      const secondsPassed = Math.floor(((new Date()).getTime() - game.lastAction) / 1000);
      game.currentTimerTime = game.currentTimerTime - secondsPassed + 20;
    } else {
      game.currentTimerTime = 25;
    }
    game.lastAction = (new Date()).getTime();
    GamesService.resetHandTimer(game);

    validateGameWithMessage(game, ' after onGetTimeFromBank');

    updateGamePlayers(game);
  } catch (e) {
    logger.error('onGetTimeFromBank ', e.message);
    logger.error('error.stack ', e.stack);

    if (socket) socket.emit('onerror', { message: 'failed to Get Time', reason: e.message });
  }
}

module.exports = {
  onGetTimeFromBank,
};

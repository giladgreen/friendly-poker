const logger = require('../services/logger');
const GamesService = require('../services/games');
const { extractRequestGameAndPlayer } = require('../helpers/handlers');

const { updateGamePlayers } = require('../helpers/game');
const BadRequest = require('../errors/badRequest');

function onStandupEvent(socket, { playerId, gameId, now }) {
  try {
    logger.info('onStandupEvent');
    const { game, player } = extractRequestGameAndPlayer({
      socket, gameId, playerId,
    });
    if (player.sitOut) {
      throw new BadRequest('already sitting out');
    }
    player.sitOut = true;

    if (game.players.filter(p => !p.sitOut).length < 2) {
      game.paused = true;
      GamesService.pauseHandTimer(game);
    }
    const msg = `${player.name} is sitting out`;
    game.messages.push({
      action: 'stand', popupMessage: msg, log: msg, now,
    });

    updateGamePlayers(game);
  } catch (e) {
    logger.error(`onStandupEvent error:${e.message}`);
    if (socket) socket.emit('onerror', { message: 'failed to stand up', reason: e.message });
  }
}

module.exports = {
  onStandupEvent,
};

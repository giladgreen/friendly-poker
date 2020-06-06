const logger = require('../services/logger');
const GamesService = require('../services/games');

const { updateGamePlayers } = require('../helpers/game');
const Mappings = require('../Maps');
const BadRequest = require('../errors/badRequest');

function onStandupEvent(socket, { playerId, gameId, now }) {
  try {
    logger.info('onStandupEvent');
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

const logger = require('../services/logger');
const { updateGamePlayers } = require('../helpers/game');
const GameHelper = require('../helpers/game');
const Mappings = require('../Maps');
const BadRequest = require('../errors/badRequest');

function onPauseGameEvent(socket, { gameId, playerId, now }) {
  logger.info('onPauseGameEvent ');

  try {
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
    if (!player.admin) {
      throw new BadRequest('non admin player cannot pause game');
    }

    game.paused = true;
    game.messages.push({
      action: 'game_paused', popupMessage: 'Game Paused', log: 'Game Paused', now,
    });
    GameHelper.pauseHandTimer(game);
    updateGamePlayers(game);
  } catch (e) {
    if (socket) socket.emit('onerror', { message: 'failed to pause game', reason: e.message });
  }
}

module.exports = {
  onPauseGameEvent,
};

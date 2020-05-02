const logger = require('../services/logger');
const { updateGamePlayers } = require('../helpers/game');
const GameHelper = require('../helpers/game');
const Mappings = require('../Maps');

function onPauseGameEvent(socket, { gameId, playerId }) {
  logger.info('onPauseGameEvent ');

  try {
    socket.playerId = playerId;
    Mappings.SaveSocketByPlayerId(playerId, socket);
    const game = Mappings.getGameById(gameId);
    game.paused = true;
    game.messages.push({ action: 'game_paused', popupMessage: 'game paused' });
    GameHelper.pauseHandTimer(game);
    updateGamePlayers(game);
  } catch (e) {
    if (socket) socket.emit('onerror', { message: 'failed to pause game', reason: e.message });
  }
}

module.exports = {
  onPauseGameEvent,
};

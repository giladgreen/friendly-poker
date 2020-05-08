const logger = require('../services/logger');
const { onPlayerActionEvent } = require('./playerAction');
const { updateGamePlayers } = require('../helpers/game');
const GamesService = require('../services/games');
const Mappings = require('../Maps');

function onSkipHandEvent(socket, { gameId, dateTime, playerId }) {
  logger.info('onSkipHandEvent ');

  try {
    socket.playerId = playerId;
    Mappings.SaveSocketByPlayerId(playerId, socket);
    const game = Mappings.getGameById(gameId);
    if (!game) {
      throw new Error('game not found');
    }
    const player = game.players.find(p => p.id === playerId);
    if (!player) {
      throw new Error('did not find player');
    }
    if (!player.admin) {
      throw new Error('non admin player cannot skip hand');
    }

    GamesService.startNewHand(game, dateTime);
    GamesService.resetHandTimer(game, onPlayerActionEvent);

    game.messages.push({
      action: 'skiphand', name: player.name, popupMessage: 'admin skipped to next hand',
    });

    updateGamePlayers(game);
    game.messages = [];
  } catch (e) {
    if (socket) socket.emit('onerror', { message: 'failed to skip hand', reason: e.message });
  }
}

module.exports = {
  onSkipHandEvent,
};

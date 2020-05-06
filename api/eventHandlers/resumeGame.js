const logger = require('../services/logger');
const { updateGamePlayers } = require('../helpers/game');
const PlayerHelper = require('../helpers/players');
const GamesService = require('../services/games');
const { onPlayerActionEvent } = require('./playerAction');

const Mappings = require('../Maps');

function onResumeGameEvent(socket, { gameId, playerId, now }) {
  logger.info('onResumeGameEvent ');

  try {
    socket.playerId = playerId;
    Mappings.SaveSocketByPlayerId(playerId, socket);
    const game = Mappings.getGameById(gameId);

    if (game.pausedByServer) {
      const playersCount = PlayerHelper.getActivePlayersStillInGame(game).filter(p => p.balance > 0).length;
      if (playersCount < 2) {
        throw new Error('game cant be resume yet');
      } else {
        delete game.paused;
        delete game.pausedByServer;
        if (game.startDate) {
          GamesService.startNewHand(game, now);
          GamesService.resetHandTimer(game, onPlayerActionEvent);
        }
      }
    } else {
      delete game.paused;
      GamesService.resetHandTimer(game, onPlayerActionEvent);
      game.messages.push({ action: 'game_resumed', popupMessage: 'game resumed' });
    }


    updateGamePlayers(game);
  } catch (e) {
    if (socket) socket.emit('onerror', { message: 'failed to resume game', reason: e.message });
  }
}

module.exports = {
  onResumeGameEvent,
};

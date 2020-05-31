const logger = require('../services/logger');
const { updateGamePlayers } = require('../helpers/game');
const PlayerHelper = require('../helpers/players');
const GamesService = require('../services/games');
const { onPlayerActionEvent } = require('./playerAction');
const BadRequest = require('../errors/badRequest');

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
        throw new BadRequest('game cant be resume yet');
      } else {
        delete game.paused;
        delete game.pausedByServer;
        if (game.startDate) {
          logger.info('calling startNewHand');
          GamesService.startNewHand(game, now);
          GamesService.resetHandTimer(game, onPlayerActionEvent);
        }
      }
    } else {
      delete game.paused;
      logger.info('calling startNewHand');
      GamesService.startNewHand(game, now);
      GamesService.resetHandTimer(game, onPlayerActionEvent);
      game.messages.push({
        action: 'game_resumed', popupMessage: 'Game Resumed', log: 'Game Resumed', now,
      });
    }


    updateGamePlayers(game);
  } catch (e) {
    if (socket) socket.emit('onerror', { message: 'failed to resume game', reason: e.message });
  }
}

module.exports = {
  onResumeGameEvent,
};

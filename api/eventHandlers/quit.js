const logger = require('../services/logger');
const GamesService = require('../services/games');
const GameHelper = require('../helpers/game');
const Mappings = require('../Maps');
const { extractRequestGameAndPlayer } = require('../helpers/handlers');
const { onPlayerActionEvent } = require('./playerAction');

const { updateGamePlayers, handlePlayerQuit } = require('../helpers/game');
const BadRequest = require('../errors/badRequest');

const {
  FOLD,
} = require('../consts');


function onQuitEvent(socket, { playerId, gameId, now }) {
  try {
    logger.info('onQuitEvent', { playerId, gameId });
    const { game, player } = extractRequestGameAndPlayer({
      socket, gameId, playerId,
    });

    logger.info(`onQuitEvent ${player.name}, (is admin: ${player.admin})`);
    if (player.admin) {
      if (game.players.filter(p => p && p.id !== playerId).length > 0) {
        throw new BadRequest("admin can't quit while there are still other players");
      } else {
        logger.info('deleting the game data from memory and db');
        GameHelper.deleteGameInDB(gameId);
        Mappings.DeleteGameByGameId(gameId);
        socket.emit('forcequit');
        return;
      }
    }
    logger.info('quit - non admin player');
    if (!game.startDate || game.handOver || player.sitOut) {
      logger.info('quit - game not started / hand is over');
      handlePlayerQuit(game, player, now);
      if (game.startDate && game.players.filter(p => p && !p.sitOut).length < 2) {
        game.paused = true;
        GamesService.pauseHandTimer(game);
      }
    } else {
      logger.info('quit - hand not over');

      if (!player.fold) {
        if (player.active) {
          onPlayerActionEvent(socket, {
            now, gameId, playerId, hand: game.hand, op: FOLD, amount: 0, force: true,
          });
        } else {
          player.status = 'Quit';
          delete player.needToTalk;
          player.fold = true;
        }
      }


      game.pendingQuit.push(playerId);
    }

    updateGamePlayers(game);
  } catch (e) {
    logger.error('onQuitEvent error', e.message);
    logger.error('error.stack ', e.stack);

    if (socket) socket.emit('onerror', { message: 'failed to quit', reason: e.message });
  }
}

module.exports = {
  onQuitEvent,
};

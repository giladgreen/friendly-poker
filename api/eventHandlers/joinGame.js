const sendGame = require('../helpers/SendGame');

const logger = require('../services/logger');
const GamesService = require('../services/games');
const { updateGamePlayers } = require('../helpers/game');
const { extractRequestGameAndPlayer, isBot } = require('../helpers/handlers');

const BadRequest = require('../errors/badRequest');
const {
  TIME_BANK_INITIAL_VALUE,
} = require('../consts');

async function onJoinGameEvent(socket, {
  gameId, playerId, name, balance, now, positionIndex, isMobile,
}) {
  logger.info('onJoinGameEvent ', {
    gameId, playerId, name, balance, now, positionIndex, isMobile,
  });

  try {
    const { game } = extractRequestGameAndPlayer({
      socket, gameId,
    });

    if (balance < 1) {
      sendGame(socket, game, 'joinrequestdeclined');

      throw new BadRequest(`illegal amount:${balance}`);
    }
    if (game.players.filter(p => Boolean(p)).length >= game.maxPlayers) {
      sendGame(socket, game, 'joinrequestdeclined');

      throw new BadRequest('table is full');
    }
    if (game.players.some(p => p && p.id === playerId)) {
      logger.warn('player already in game ', name);
      updateGamePlayers(game);
      return;
    }

    const bot = isBot({ name });
    const NOW = (new Date()).getTime();
    const playerData = {
      id: playerId,
      name,
      balance,
      isMobile,
      bot,
      positionIndex,
      sitOut: true,
      justJoined: true,
      handsWon: 0,
      pot: [0],
      timeBank: TIME_BANK_INITIAL_VALUE,
    };

    if (game.requireRebuyApproval) {
      game.pendingJoin.push(playerData);
      socket.emit('operationpendingapproval');
      game.messages.push({
        action: 'pendingjoin', popupMessage: `${name} has requested to join the game`, now,
      });
    } else {
      GamesService.handlePlayerJoinMidHand(game, playerData, now);
    }

    updateGamePlayers(game);
  } catch (e) {
    logger.error('failed to join game. ', e.message);
    logger.error('error.stack ', e.stack);
    if (socket) socket.emit('onerror', { message: 'failed to join game', reason: e.message });
  }
}

module.exports = {
  onJoinGameEvent,
};

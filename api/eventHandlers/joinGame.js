
/* eslint-disable no-await-in-loop */
const logger = require('../services/logger');
const { updateGamePlayers } = require('../helpers/game');
const { extractRequestGameAndPlayer, isBot, validateGameWithMessage } = require('../helpers/handlers');

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
    validateGameWithMessage(game, ' before onJoinGameEvent');

    if (balance < 1) {
      socket.emit('joinrequestdeclined', game);
      throw new BadRequest(`illegal amount:${balance}`);
    }
    if (game.players.filter(p => Boolean(p)).length >= game.maxPlayers) {
      socket.emit('joinrequestdeclined', game);
      throw new BadRequest('table is full');
    }
    if (game.players.some(p => p && p.id === playerId)) {
      updateGamePlayers(game);
      return;
    }

    // eslint-disable-next-line no-loop-func
    while (game.players.some(p => p && p.name === name)) {
      name = `${name} (2)`;
      name = name.replace('(2) (2)', '(3)');
      name = name.replace('(3) (2)', '(4)');
      name = name.replace('(4) (2)', '(5)');
      name = name.replace('(5) (2)', '(6)');
      name = name.replace('(6) (2)', '(7)');
    }

    const bot = isBot({ name });

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
      const msg = `${name} has join the game, initial balance of ${balance}`;

      game.messages.push({
        action: 'join', log: msg, popupMessage: `${name} has join the game`,
      });

      if (game.players[positionIndex]) {
        positionIndex = game.players.findIndex(p => !p);
      }
      game.players[positionIndex] = playerData;
      game.moneyInGame += balance;

      game.playersData.push({
        id: playerId,
        name,
        totalBuyIns: balance,
        buyIns: [{ amount: balance, time: now }],
      });
    }

    validateGameWithMessage(game, ' after onJoinGameEvent');

    updateGamePlayers(game);
  } catch (e) {
    logger.error('failed to join game. ', e);
    if (socket) socket.emit('onerror', { message: 'failed to join game', reason: e.message });
  }
}

module.exports = {
  onJoinGameEvent,
};

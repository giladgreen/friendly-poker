const logger = require('../services/logger');
const { extractRequestGameAndPlayer, validateGameWithMessage } = require('../helpers/handlers');
const { updateGamePlayers } = require('../helpers/game');
const BadRequest = require('../errors/badRequest');


function onApproveJoinEvent(socket, {
  gameId, playerId, joinedPlayerId, balance, now,
}) {
  logger.info('onApproveJoinEvent ', {
    gameId, playerId, joinedPlayerId, balance,
  });

  try {
    const { game } = extractRequestGameAndPlayer({
      socket, gameId, playerId, adminOperation: true,
    });
    validateGameWithMessage(game, ' before onApproveJoinEvent');

    if (game.players.filter(p => Boolean(p)).length >= game.maxPlayers) {
      game.pendingJoin = [];
      throw new BadRequest('table is full');
    }

    const pendingRequest = game.pendingJoin.find(data => data.id === joinedPlayerId && data.balance === balance);
    if (!pendingRequest) {
      logger.info(game.pendingJoin.map(data => JSON.stringify(data)).join(' ,  '));
      throw new BadRequest('did not find matching pending join request');
    }

    // eslint-disable-next-line no-loop-func
    while (game.players.some(p => p && p.name === pendingRequest.name)) {
      pendingRequest.name = `${pendingRequest.name} (2)`;
      pendingRequest.name = pendingRequest.name.replace('(2) (2)', '(3)');
      pendingRequest.name = pendingRequest.name.replace('(3) (2)', '(4)');
      pendingRequest.name = pendingRequest.name.replace('(4) (2)', '(5)');
      pendingRequest.name = pendingRequest.name.replace('(5) (2)', '(6)');
      pendingRequest.name = pendingRequest.name.replace('(6) (2)', '(7)');
    }
    if (game.players[pendingRequest.positionIndex]) {
      pendingRequest.positionIndex = game.players.findIndex(p => !p);
    }

    const msg = `${pendingRequest.name} has join the game, initial balance of ${pendingRequest.balance}`;
    game.messages.push({
      action: 'join', log: msg, popupMessage: `${pendingRequest.name} has join the game`,
    });

    game.players[pendingRequest.positionIndex] = pendingRequest;
    game.moneyInGame += balance;
    game.playersData.push({
      id: playerId,
      name: pendingRequest.name,
      totalBuyIns: balance,
      buyIns: [{ amount: balance, time: now }],
    });

    game.pendingJoin = game.pendingJoin.filter(data => data.id !== joinedPlayerId);

    validateGameWithMessage(game, ' after onApproveJoinEvent');

    updateGamePlayers(game);
  } catch (e) {
    logger.error('onApproveJoinEvent error', e);
    if (socket) socket.emit('onerror', { message: 'failed to approve Join', reason: e.message });
  }
}

module.exports = {
  onApproveJoinEvent,
};

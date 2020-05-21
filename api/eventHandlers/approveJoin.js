const logger = require('../services/logger');
const Mappings = require('../Maps');
const { updateGamePlayers } = require('../helpers/game');


function onApproveJoinEvent(socket, {
  gameId, playerId, joinedPlayerId, balance, now,
}) {
  logger.info('onApproveJoinEvent ');

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
      throw new Error('non admin player cannot approve join');
    }

    const pendingRequest = game.pendingJoin.find(data => data.playerId === joinedPlayerId && data.balance === balance);
    if (!pendingRequest) {
      throw new Error('did not find matching pending join request');
    }
    pendingRequest.approved = true;
    if (game.pendingJoin && game.pendingJoin.length > 0) {
      game.pendingJoin.filter(data => data.approved).forEach((pendingJoinItem) => {
        const msg = `${pendingJoinItem.name} has join the game, initial balance of ${pendingJoinItem.balance}`;
        game.messages.push({
          action: 'join', log: msg, popupMessage: `${pendingJoinItem.name} has join the game`, now,
        });

        if (game.players.some(p => p.name === pendingJoinItem.name)) {
          pendingJoinItem.name = `${pendingJoinItem.name} (2)`;
        }

        game.players.splice(pendingJoinItem.positionIndex, 0, {
          id: pendingJoinItem.playerId,
          name: pendingJoinItem.name,
          balance: pendingJoinItem.balance,
          sitOut: true,
          handsWon: 0,
          pot: [0],
          justJoined: true,
        });

        game.moneyInGame += pendingJoinItem.balance;
        game.pendingPlayers.push(pendingJoinItem.playerId);

        game.playersData.push({
          id: pendingJoinItem.playerId,
          name: pendingJoinItem.name,
          totalBuyIns: pendingJoinItem.balance,
          buyIns: [{ amount: pendingJoinItem.balance, time: now }],
        });
      });
    }
    game.pendingJoin = game.pendingJoin.filter(data => !data.approved);

    updateGamePlayers(game);
  } catch (e) {
    if (socket) socket.emit('onerror', { message: 'failed to approve Join', reason: e.message });
  }
}

module.exports = {
  onApproveJoinEvent,
};

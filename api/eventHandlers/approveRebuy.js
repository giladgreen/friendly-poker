const logger = require('../services/logger');
const Mappings = require('../Maps');
const { updateGamePlayers } = require('../helpers/game');


function onApproveRebuyEvent(socket, {
  gameId, playerId, rebuyPlayerId, amount, now,
}) {
  logger.info('onApproveRebuyEvent ');

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
      throw new Error('non admin player cannot approve Rebuy');
    }

    const pendingRequest = game.pendingRebuy.find(data => data.playerId === rebuyPlayerId && data.amount === amount);
    if (!pendingRequest) {
      throw new Error('did not find matching pending rebuy request');
    }
    pendingRequest.approved = true;

    if (game.pendingRebuy && game.pendingRebuy.length > 0) {
      game.pendingRebuy.filter(data => data.approved).forEach((pendingRebuyItem) => {
        const playerToAddMoneyTo = game.players.find(p => p.id === pendingRebuyItem.playerId);
        if (playerToAddMoneyTo) {
          playerToAddMoneyTo.balance += pendingRebuyItem.amount;
          if (playerToAddMoneyTo.sitOut && playerToAddMoneyTo.sitOutByServer) {
            game.pendingPlayers.push(pendingRebuyItem.playerId);
            delete playerToAddMoneyTo.sitOutByServer;
          }
          const playerData = game.playersData.find(p => p.id === pendingRebuyItem.playerId);
          playerData.buyIns.push({ amount: pendingRebuyItem.amount, time: now });
          playerData.totalBuyIns += pendingRebuyItem.amount;

          game.moneyInGame += pendingRebuyItem.amount;

          game.messages.push({
            action: 'rebuy', name: playerToAddMoneyTo.name, amount, popupMessage: `${playerToAddMoneyTo.name}, rebuy: ${pendingRebuyItem.amount}`, log: true,
          });
        }
      });
    }
    game.pendingRebuy = game.pendingRebuy.filter(data => !data.approved);

    updateGamePlayers(game);
  } catch (e) {
    if (socket) socket.emit('onerror', { message: 'failed to approve rebuy', reason: e.message });
  }
}

module.exports = {
  onApproveRebuyEvent,
};

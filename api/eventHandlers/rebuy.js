const logger = require('../services/logger');
const { updateGamePlayers } = require('../helpers/game');
const Mappings = require('../Maps');

function onRebuyEvent(socket, {
  playerId, gameId, amount, now,
}) {
  try {
    logger.info('onRebuyEvent', amount);
    socket.playerId = playerId;
    Mappings.SaveSocketByPlayerId(playerId, socket);

    const game = Mappings.getGameById(gameId);
    if (!game) {
      throw new Error('did not find game');
    }
    const player = game.players.find(p => p.id === playerId);
    if (!player) {
      throw new Error('did not find player');
    }
    if (!game.paused && !game.handOver && player.balance !== 0 && !player.sitOut && !player.fold) {
      throw new Error('can not perform rebuy mid-hand');
    }
    player.balance += amount;
    if (player.sitOut && player.sitOutByServer) {
      delete player.sitOut;
      delete player.sitOutByServer;
    }
    const playerData = game.playersData.find(p => p.id === playerId);
    playerData.buyIns.push({ amount, time: now });


    game.messages.push({
      action: 'rebuy', name: player.name, amount, popupMessage: `${player.name} did a rebuy of ${amount}`,
    });

    updateGamePlayers(game);
  } catch (e) {
    logger.error(`onRebuyEvent error:${e.message}`);
    if (socket) socket.emit('onerror', { message: 'failed to rebuy', reason: e.message });
  }
}

module.exports = {
  onRebuyEvent,
};

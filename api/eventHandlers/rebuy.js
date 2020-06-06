const logger = require('../services/logger');
const { updateGamePlayers } = require('../helpers/game');
const Mappings = require('../Maps');
const BadRequest = require('../errors/badRequest');

function onRebuyEvent(socket, {
  playerId, gameId, amount, now,
}) {
  try {
    logger.info('onRebuyEvent', amount);
    socket.playerId = playerId;
    Mappings.SaveSocketByPlayerId(playerId, socket);

    const game = Mappings.getGameById(gameId);
    if (!game) {
      throw new BadRequest('did not find game');
    }
    const player = game.players.find(p => p.id === playerId);
    if (!player) {
      throw new BadRequest('did not find player');
    }
    if (!game.paused && !game.handOver && player.balance !== 0 && !player.sitOut && !player.fold) {
      throw new BadRequest('can not perform rebuy mid-hand');
    }

    const adminPlayer = game.players.find(p => p.admin);
    if (!adminPlayer) {
      throw new BadRequest('did not find admin player');
    }
    if (game.requireRebuyApproval && playerId !== adminPlayer.id) {
      const adminSocket = Mappings.GetSocketByPlayerId(adminPlayer.id);
      if (!adminSocket) {
        throw new BadRequest('did not find admin socket');
      }

      game.pendingRebuy.push({
        playerId, amount, name: player.name,
      });
      game.messages.push({
        action: 'pendingrebuy', popupMessage: `${player.name} has requested to rebuy: ${amount}`, now,
      });
    } else {
      player.balance += amount;
      if (player.sitOut && player.sitOutByServer) {
        game.pendingPlayers.push(playerId);
        delete player.sitOutByServer;
      }
      const playerData = game.playersData.find(p => p.id === playerId);
      playerData.buyIns.push({ amount, time: now });
      playerData.totalBuyIns += amount;
      game.moneyInGame += amount;
      const msg = `${player.name} did a rebuy of ${amount}`;

      game.messages.push({
        action: 'rebuy', name: player.name, amount, popupMessage: msg, log: msg,
      });
    }

    updateGamePlayers(game);
  } catch (e) {
    logger.error(`onRebuyEvent error:${e.message}`);
    if (socket) socket.emit('onerror', { message: 'failed to rebuy', reason: e.message });
  }
}

module.exports = {
  onRebuyEvent,
};

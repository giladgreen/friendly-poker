const logger = require('../services/logger');
const Mappings = require('../Maps');
const { updateGamePlayers } = require('../helpers/game');
const BadRequest = require('../errors/badRequest');

function onDeclineRebuyEvent(socket, {
  gameId, playerId, rebuyPlayerId, amount,
}) {
  logger.info('onDeclineRebuyEvent ');

  try {
    socket.playerId = playerId;
    Mappings.SaveSocketByPlayerId(playerId, socket);
    const game = Mappings.getGameById(gameId);
    if (!game) {
      throw new BadRequest('game not found');
    }
    const player = game.players.find(p => p.id === playerId);
    if (!player) {
      throw new BadRequest('did not find player');
    }
    if (!player.admin) {
      throw new BadRequest('non admin player cannot decline Rebuy');
    }

    game.pendingRebuy = game.pendingRebuy.filter(data => data.playerId !== rebuyPlayerId || data.amount !== amount);
    updateGamePlayers(game);

    const playerSocket = Mappings.GetSocketByPlayerId(rebuyPlayerId);
    if (playerSocket) {
      playerSocket.emit('rebuyrequestdeclined');
    }
  } catch (e) {
    if (socket) socket.emit('onerror', { message: 'failed to decline rebuy', reason: e.message });
  }
}

module.exports = {
  onDeclineRebuyEvent,
};

const logger = require('../services/logger');
const Mappings = require('../Maps');
const { updateGamePlayers } = require('../helpers/game');
const { getPlayerCopyOfGame } = require('../helpers/gameCopy');
function onDeclineJoinEvent(socket, {
  gameId, playerId, joinedPlayerId, balance,
}) {
  logger.info('onDeclineJoinEvent ');

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
      throw new Error('non admin player cannot decline join');
    }

    game.pendingJoin = game.pendingJoin.filter(data => data.playerId !== joinedPlayerId || data.balance !== balance);
    updateGamePlayers(game);

    const playerSocket = Mappings.GetSocketByPlayerId(joinedPlayerId);
    if (playerSocket) {
      const gamePrivateCopy = getPlayerCopyOfGame(joinedPlayerId, game);
      playerSocket.emit('joinrequestdeclined', gamePrivateCopy);
    }
  } catch (e) {
    if (socket) socket.emit('onerror', { message: 'failed to decline Join', reason: e.message });
  }
}

module.exports = {
  onDeclineJoinEvent,
};

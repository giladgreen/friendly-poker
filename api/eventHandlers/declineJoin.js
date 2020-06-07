const logger = require('../services/logger');
const { extractRequestGameAndPlayer } = require('../helpers/handlers');
const { updateGamePlayers } = require('../helpers/game');
const { getPlayerCopyOfGame } = require('../helpers/gameCopy');
const Mappings = require('../Maps');

function onDeclineJoinEvent(socket, {
  gameId, playerId, joinedPlayerId, balance, declineMessage,
}) {
  logger.info(`onDeclineJoinEvent. joinedPlayerId:${joinedPlayerId}`);

  try {
    const { game } = extractRequestGameAndPlayer({
      socket, gameId, playerId, adminOperation: true,
    });

    game.pendingJoin = game.pendingJoin.filter(data => data.id !== joinedPlayerId || data.balance !== balance);
    updateGamePlayers(game);

    const playerSocket = Mappings.GetSocketByPlayerId(joinedPlayerId);
    if (playerSocket) {
      const gamePrivateCopy = getPlayerCopyOfGame(joinedPlayerId, game);
      gamePrivateCopy.declineMessage = declineMessage;
      playerSocket.emit('joinrequestdeclined', gamePrivateCopy);
    }
  } catch (e) {
    if (socket) socket.emit('onerror', { message: 'failed to decline Join', reason: e.message });
  }
}

module.exports = {
  onDeclineJoinEvent,
};

const logger = require('../services/logger');
const { extractRequestGameAndPlayer } = require('../helpers/handlers');
const { updateGamePlayers } = require('../helpers/game');
const { getPlayerCopyOfGame } = require('../helpers/gameCopy');
const Mappings = require('../Maps');
const sendGame = require('../helpers/SendGame');

function onDeclineJoinEvent(socket, {
  gameId, playerId, joinedPlayerId, balance, declineMessage,
}) {
  logger.info('onDeclineJoinEvent', {
    gameId, playerId, joinedPlayerId, balance, declineMessage,
  });

  try {
    const { game } = extractRequestGameAndPlayer({
      socket, gameId, playerId, adminOperation: true,
    });

    game.pendingJoin = game.pendingJoin.filter(data => data.id !== joinedPlayerId);
    updateGamePlayers(game);

    const playerSocket = Mappings.GetSocketByPlayerId(joinedPlayerId);
    if (playerSocket) {
      const gamePrivateCopy = getPlayerCopyOfGame(joinedPlayerId, game);
      gamePrivateCopy.declineMessage = declineMessage;
      sendGame(playerSocket, gamePrivateCopy, 'joinrequestdeclined');
    }
  } catch (e) {
    logger.error('onDeclineJoinEvent ', e.message);
    logger.error('error.stack ', e.stack);
    if (socket) socket.emit('onerror', { message: 'failed to decline Join', reason: e.message });
  }
}

module.exports = {
  onDeclineJoinEvent,
};

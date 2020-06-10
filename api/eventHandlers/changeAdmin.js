const logger = require('../services/logger');
const { updateGamePlayers } = require('../helpers/game');
const { extractRequestGameAndPlayer, validateGameWithMessage } = require('../helpers/handlers');

const BadRequest = require('../errors/badRequest');

function onChangeAdminEvent(socket, {
  playerId, gameId, newAdminId, now,
}) {
  try {
    logger.info('onChangeAdminEvent', { playerId, gameId, newAdminId });
    const { game, adminPlayer } = extractRequestGameAndPlayer({
      socket, gameId, playerId, adminOperation: true,
    });
    validateGameWithMessage(game, ' before onChangeAdminEvent');

    const newAdmin = game.players.find(p => p && p.id === newAdminId);
    if (!newAdmin) {
      throw new BadRequest(`did not find player to make admin: ${newAdminId}`);
    }
    newAdmin.admin = true;
    delete adminPlayer.admin;
    const msg = `${newAdmin.name} is now the game admin`;
    game.messages.push({
      action: 'newadmin', popupMessage: msg, log: msg, now,
    });
    validateGameWithMessage(game, ' after onChangeAdminEvent');

    updateGamePlayers(game);
  } catch (e) {
    logger.error('onChangeAdminEvent error', e);

    if (socket) socket.emit('onerror', { message: 'failed to change admin', reason: e.message });
  }
}

module.exports = {
  onChangeAdminEvent,
};

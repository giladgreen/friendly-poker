const logger = require('../services/logger');
const { updateGamePlayers } = require('../helpers/game');
const { extractRequestGameAndPlayer } = require('../helpers/handlers');

const BadRequest = require('../errors/badRequest');

function onChangeAdminEvent(socket, {
  playerId, gameId, newAdminId, now,
}) {
  try {
    logger.info('onChangeAdminEvent');
    const { game, adminPlayer } = extractRequestGameAndPlayer({
      socket, gameId, playerId, adminOperation: true,
    });

    const newAdmin = game.players.find(p => p.id === newAdminId);
    if (!newAdmin) {
      throw new BadRequest(`did not find player to make admin: ${newAdminId}`);
    }
    newAdmin.admin = true;
    delete adminPlayer.admin;
    const msg = `${newAdmin.name} is now the game admin`;
    game.messages.push({
      action: 'newadmin', popupMessage: msg, log: msg, now,
    });

    updateGamePlayers(game);
  } catch (e) {
    logger.error(`onChangeAdminEvent error:${e.message}`);
    if (socket) socket.emit('onerror', { message: 'failed to change admin', reason: e.message });
  }
}

module.exports = {
  onChangeAdminEvent,
};

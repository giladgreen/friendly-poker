const logger = require('../services/logger');
const { updateGamePlayers } = require('../helpers/game');
const Mappings = require('../Maps');

function onChangeAdminEvent(socket, {
  playerId, gameId, newAdminId,
}) {
  try {
    logger.info('onChangeAdminEvent');
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

    if (!player.admin) {
      throw new Error('only admin can kick a user out');
    }

    const newAdmin = game.players.find(p => p.id === newAdminId);
    if (!newAdmin) {
      throw new Error('did not find player to make admin');
    }
    newAdmin.admin = true;
    delete player.admin;

    game.messages.push({
      action: 'newadmin', name: newAdmin.name, popupMessage: `${newAdmin.name} is now the game admin`,
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

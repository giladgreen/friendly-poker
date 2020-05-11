const logger = require('../services/logger');
const { updateGamePlayers } = require('../helpers/game');
const Mappings = require('../Maps');

function onSetCreatorAsAdminEvent(socket, {
  playerId, gameId,
}) {
  try {
    logger.info('onSetCreatorAsAdminEvent');
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

    if (player.admin) {
      throw new Error('already admin');
    }

    if (!player.creator) {
      throw new Error('non creator');
    }

    const curAdmin = game.players.find(p => p.admin);
    delete curAdmin.admin;

    player.admin = true;

    game.messages.push({
      action: 'newadmin', name: player.name, popupMessage: `${player.name} is now the game admin`,
    });

    updateGamePlayers(game);
  } catch (e) {
    logger.error(`onChangeAdminEvent error:${e.message}`);
    if (socket) socket.emit('onerror', { message: 'failed to set creator as admin', reason: e.message });
  }
}

module.exports = {
  onSetCreatorAsAdminEvent,
};

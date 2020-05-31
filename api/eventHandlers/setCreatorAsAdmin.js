const logger = require('../services/logger');
const { updateGamePlayers } = require('../helpers/game');
const Mappings = require('../Maps');
const BadRequest = require('../errors/badRequest');

function onSetCreatorAsAdminEvent(socket, {
  playerId, gameId, now,
}) {
  try {
    logger.info('onSetCreatorAsAdminEvent');
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

    if (player.admin) {
      throw new BadRequest('already admin');
    }

    if (!player.creator) {
      throw new BadRequest('non creator');
    }

    const curAdmin = game.players.find(p => p.admin);
    delete curAdmin.admin;

    player.admin = true;
    const msg = `${player.name} is now the Game Admin`;
    game.messages.push({
      action: 'newadmin', popupMessage: msg, log: msg, now,
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

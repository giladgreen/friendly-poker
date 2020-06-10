const logger = require('../services/logger');
const { updateGamePlayers } = require('../helpers/game');
const BadRequest = require('../errors/badRequest');
const { extractRequestGameAndPlayer, validateGameWithMessage } = require('../helpers/handlers');

function onSetCreatorAsAdminEvent(socket, {
  playerId, gameId, now,
}) {
  try {
    logger.info('onSetCreatorAsAdminEvent', { playerId, gameId, now });
    const { game, player } = extractRequestGameAndPlayer({
      socket, gameId, playerId,
    });
    validateGameWithMessage(game, ' before onSetCreatorAsAdminEvent');


    if (player.admin) {
      throw new BadRequest('already admin');
    }

    if (!player.creator) {
      throw new BadRequest('non creator');
    }

    const curAdmin = game.players.find(p => p && p.admin);
    delete curAdmin.admin;

    player.admin = true;
    const msg = `${player.name} is now the Game Admin`;
    game.messages.push({
      action: 'newadmin', popupMessage: msg, log: msg, now,
    });
    validateGameWithMessage(game, ' after onSetCreatorAsAdminEvent');

    updateGamePlayers(game);
  } catch (e) {
    logger.error('onChangeAdminEvent error', e);
    if (socket) socket.emit('onerror', { message: 'failed to set creator as admin', reason: e.message });
  }
}

module.exports = {
  onSetCreatorAsAdminEvent,
};

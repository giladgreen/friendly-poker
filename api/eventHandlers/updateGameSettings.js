const logger = require('../services/logger');
const Mappings = require('../Maps');
const { updateGamePlayers } = require('../helpers/game');
const BadRequest = require('../errors/badRequest');

function onUpdateGameSettingsEvent(socket, {
  gameId, now, playerId, time, smallBlind, bigBlind, newBalances = [], requireRebuyApproval, straddleEnabled, timeBankEnabled,
}) {
  logger.info('onUpdateGameSettingsEvent ', gameId, now, playerId, time, smallBlind, bigBlind, requireRebuyApproval, straddleEnabled, timeBankEnabled, newBalances);

  try {
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
    if (!player.admin) {
      throw new BadRequest('non admin player cannot change game settings');
    }

    if (game.startDate) {
      // change next hand
      game.smallBlindPendingChange = smallBlind;
      game.bigBlindPendingChange = bigBlind;
      game.requireRebuyApprovalPendingChange = requireRebuyApproval;
      game.straddleEnabledPendingChange = straddleEnabled;
      game.timeBankEnabledPendingChange = timeBankEnabled;
      game.timePendingChange = timeBankEnabled ? 20 : time;
    } else {
      // change now
      game.time = timeBankEnabled ? 20 : time;
      game.smallBlind = smallBlind;
      game.bigBlind = bigBlind;
      game.requireRebuyApproval = requireRebuyApproval;
      game.straddleEnabled = straddleEnabled;
      game.timeBankEnabled = timeBankEnabled;
    }


    newBalances.forEach(({ fromPlayerId, toPlayerId, amount }) => {
      const fromPlayer = game.players.find(p => p.id === fromPlayerId);
      const toPlayer = game.players.find(p => p.id === toPlayerId);
      if (!fromPlayer || !toPlayer) {
        throw new BadRequest('player not found');
      }
      if (fromPlayer.balance < amount) {
        throw new BadRequest('origin player does not have enough money');
      }

      fromPlayer.balance -= amount;
      toPlayer.balance += amount;
      const msg = `admin moved ${amount} from ${fromPlayer.name} to ${toPlayer.name}`;
      logger.info(msg);
      game.messages.push({
        action: 'balance transfer', name: player.name, popupMessage: msg, log: msg, now,
      });
    });

    const msg = `admin changed game settings. Small-Blind:${smallBlind}, Big-Blind:${bigBlind}, time:${time}`;
    game.messages.push({
      action: 'settings change', log: msg, popupMessage: 'admin changed game settings', now,
    });

    updateGamePlayers(game);
    game.messages = [];
  } catch (e) {
    logger.error('failed to join game. ', e.message);
    if (socket) socket.emit('onerror', { message: 'failed to update game settings', reason: e.message });
  }
}

module.exports = {
  onUpdateGameSettingsEvent,
};

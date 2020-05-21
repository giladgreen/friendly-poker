const logger = require('../services/logger');
const Mappings = require('../Maps');
const { updateGamePlayers } = require('../helpers/game');

function onUpdateGameSettingsEvent(socket, {
  gameId, now, playerId, time, smallBlind, bigBlind, newBalances = [],
}) {
  logger.info('onUpdateGameSettingsEvent ', gameId, now, playerId, time, smallBlind, bigBlind, newBalances);

  try {
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
      throw new Error('non admin player cannot change game settings');
    }

    game.timePendingChane = time;
    game.smallBlindPendingChane = smallBlind;
    game.bigBlindPendingChane = bigBlind;


    newBalances.forEach(({ fromPlayerId, toPlayerId, amount }) => {
      const fromPlayer = game.players.find(p => p.id === fromPlayerId);
      const toPlayer = game.players.find(p => p.id === toPlayerId);
      if (!fromPlayer || !toPlayer) {
        throw new Error('player not found');
      }
      if (fromPlayer.balance < amount) {
        throw new Error('origin player does not have enough money');
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

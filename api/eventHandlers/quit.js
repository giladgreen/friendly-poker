const logger = require('../services/logger');
const { updateGamePlayers } = require('../helpers/game');
const Mappings = require('../Maps');

function onQuitEvent(socket, { playerId, gameId, now }) {
  try {
    logger.info('onQuitEvent');
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

    const playerData = game.playersData.find(p => p.id === playerId);
    playerData.cashOut = { amount: player.balance, time: now };


    game.players = game.players.filter(p => p.id !== playerId);
    if (game.players.filter(p => !p.sitOut).length < 2) {
      game.paused = true;
    }
    game.messages.push({
      action: 'quit', name: player.name, popupMessage: `${player.name} is quit te game`,
    });

    updateGamePlayers(game);
  } catch (e) {
    logger.error(`onQuitEvent error:${e.message}`);
    if (socket) socket.emit('onerror', { message: 'failed to quit', reason: e.message });
  }
}

module.exports = {
  onQuitEvent,
};

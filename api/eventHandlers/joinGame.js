const logger = require('../services/logger');
const { updateGamePlayers } = require('../helpers/game');
const { MAX_TABLE_PLAYERS } = require('../consts');
const Mappings = require('../Maps');

function onJoinGameEvent(socket, {
  gameId, playerId, name, balance, now,
}) {
  logger.info('onJoinGameEvent ');

  try {
    socket.playerId = playerId;
    Mappings.SaveSocketByPlayerId(playerId, socket);

    const game = Mappings.getGameById(gameId);
    if (game.players.length >= MAX_TABLE_PLAYERS) {
      throw new Error('table is full');
    }
    if (game.players.some(p => p.id === playerId)) {
      throw new Error('already joined game');
    }
    game.messages.push({ action: 'join', name, balance, log: true, popupMessage: `${name} has join the game` });

    game.players.push({
      id: playerId,
      name,
      balance,
    });

    game.playersData.push({
      id: playerId,
      name,
      buyIns: [{ amount: balance, time: now }],
    });

    updateGamePlayers(game);
  } catch (e) {
    logger.error('failed to join game. ', e.message);
    if (socket) socket.emit('onerror', { message: 'failed to join game', reason: e.message });
  }
}

module.exports = {
  onJoinGameEvent,
};

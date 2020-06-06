const logger = require('../services/logger');
const { updateGamePlayers } = require('../helpers/game');
const Mappings = require('../Maps');
const BadRequest = require('../errors/badRequest');

function onJoinGameEvent(socket, {
  gameId, playerId, name, balance, now, positionIndex, isMobile
}) {
  logger.info('onJoinGameEvent ');

  try {
    socket.playerId = playerId;
    Mappings.SaveSocketByPlayerId(playerId, socket);

    const game = Mappings.getGameById(gameId);
    if (game.players.length >= game.maxPlayers) {
      throw new BadRequest('table is full');
    }
    if (game.players.some(p => p.id === playerId)) {
      throw new BadRequest('already joined game');
    }

    const adminPlayer = game.players.find(p => p.admin);
    if (!adminPlayer) {
      throw new BadRequest('did not find admin player');
    }
    if (game.players.some(p => p.name === name)) {
      name = `${name} (2)`;
    }
    if (game.requireRebuyApproval && playerId !== adminPlayer.id) {
      const adminSocket = Mappings.GetSocketByPlayerId(adminPlayer.id);
      if (!adminSocket) {
        throw new BadRequest('did not find admin socket');
      }
      game.pendingJoin.push({
        playerId, name, balance, positionIndex, isMobile,
      });
      socket.emit('operationpendingapproval');
      game.messages.push({
        action: 'pendingjoin', popupMessage: `${name} has requested to join the game`, now,
      });
    } else {
      const msg = `${name} has join the game, initial balance of ${balance}`;

      game.messages.push({
        action: 'join', log: msg, popupMessage: `${name} has join the game`,
      });

      let bot;
      if (name.indexOf('bot0') === 0) {
        bot = true;
      }
      game.players.splice(positionIndex, 0, {
        id: playerId,
        name,
        isMobile,
        balance,
        handsWon: 0,
        sitOut: true,
        pot: [0],
        justJoined: true,
        bot,
        timeBank: 80,
      });
      game.moneyInGame += balance;
      game.pendingPlayers.push(playerId);
      game.playersData.push({
        id: playerId,
        name,
        totalBuyIns: balance,
        buyIns: [{ amount: balance, time: now }],
      });
    }
    updateGamePlayers(game);
  } catch (e) {
    logger.error('failed to join game. ', e.message);
    if (socket) socket.emit('onerror', { message: 'failed to join game', reason: e.message });
  }
}

module.exports = {
  onJoinGameEvent,
};

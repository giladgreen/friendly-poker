const logger = require('../services/logger');
const { updateGamePlayers } = require('../helpers/game');
const { extractRequestGameAndPlayer, isBot } = require('../helpers/handlers');

const Mappings = require('../Maps');
const BadRequest = require('../errors/badRequest');
const {
  TIME_BANK_INITIAL_VALUE,
} = require('../consts');

function onJoinGameEvent(socket, {
  gameId, playerId, name, balance, now, positionIndex, isMobile,
}) {
  logger.info('onJoinGameEvent ');

  try {
    const { game } = extractRequestGameAndPlayer({
      socket, gameId,
    });

    if (game.players.length >= game.maxPlayers) {
      throw new BadRequest('table is full');
    }
    if (game.players.some(p => p.id === playerId)) {
      throw new BadRequest('already joined game');
    }

    if (game.players.some(p => p.name === name)) {
      name = `${name} (2)`;
    }

    const bot = isBot({ name });

    const playerData = {
      id: playerId,
      name,
      balance,
      isMobile,
      bot,
      positionIndex,
      sitOut: true,
      handsWon: 0,
      pot: [0],
      justJoined: true,
      timeBank: TIME_BANK_INITIAL_VALUE,
    };

    if (game.requireRebuyApproval) {
      const adminPlayer = game.players.find(p => p.admin);
      if (!adminPlayer) {
        throw new BadRequest('did not find admin player');
      }

      const adminSocket = Mappings.GetSocketByPlayerId(adminPlayer.id);
      if (!adminSocket) {
        throw new BadRequest('did not find admin socket');
      }
      game.pendingJoin.push(playerData);

      socket.emit('operationpendingapproval');
      game.messages.push({
        action: 'pendingjoin', popupMessage: `${name} has requested to join the game`, now,
      });
    } else {
      const msg = `${name} has join the game, initial balance of ${balance}`;

      game.messages.push({
        action: 'join', log: msg, popupMessage: `${name} has join the game`,
      });
      delete playerData.positionIndex;
      game.players.splice(positionIndex, 0, playerData);
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

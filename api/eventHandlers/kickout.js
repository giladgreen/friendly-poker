const Mappings = require('../Maps');
const logger = require('../services/logger');
const GamesService = require('../services/games');
const { updateGamePlayers } = require('../helpers/game');
const { extractRequestGameAndPlayer, validateGameWithMessage } = require('../helpers/handlers');

const { onPlayerActionEvent } = require('./playerAction');
const { CHECK, FOLD } = require('../consts');
const BadRequest = require('../errors/badRequest');

function onKickOutEvent(socket, {
  playerId, gameId, now, playerToKickId,
}) {
  let game;
  try {
    logger.info('onKickOutEvent', {
      playerId, gameId, now, playerToKickId,
    });
    ({ game } = extractRequestGameAndPlayer({
      socket, gameId, playerId, adminOperation: true,
    }));
    validateGameWithMessage(game, ' before onKickOutEvent');

    const playerToKick = game.players.find(p => p && p.id === playerToKickId);
    if (!playerToKick) {
      throw new BadRequest(`did not find player to kick: ${playerToKickId}`);
    }

    if (playerToKick.active) {
      if (playerToKick.options.includes(CHECK)) {
        onPlayerActionEvent(null, {
          dateTime: now,
          op: CHECK,
          gameId,
          hand: game.hand,
          playerId: playerToKickId,
        });
        game.messages.push({
          action: 'kickout', popupMessage: `${playerToKick.name} was Checked by admin`, now,
        });
      } else {
        onPlayerActionEvent(null, {
          dateTime: now,
          op: FOLD,
          gameId,
          hand: game.hand,
          playerId: playerToKickId,
        });
        game.messages.push({
          action: 'kickout', popupMessage: `${playerToKick.name} was Folded by admin`, now,
        });
      }
      GamesService.resetHandTimer(game, onPlayerActionEvent);
    } else {
      const moneyInPot = (playerToKick.pot || []).reduce((all, one) => all + one, 0);
      playerToKick.balance += moneyInPot;
      game.pot -= moneyInPot;

      const playerData = game.playersData.find(p => p && p.id === playerToKickId);
      playerData.cashOut = { amount: playerToKick.balance, time: now };
      game.moneyInGame -= playerToKick.balance;
      const playerIndex = game.players.findIndex(p => p && p.id === playerToKickId);
      game.players[playerIndex] = null;
      if (game.players.filter(p => p && !p.sitOut).length < 2) {
        game.paused = true;
        GamesService.pauseHandTimer(game);
      }
      const playerSocket = Mappings.GetSocketByPlayerId(playerToKickId);
      if (playerSocket) {
        playerSocket.emit('forcequit');
      }

      game.messages.push({
        action: 'kickout', popupMessage: `${playerToKick.name} was removed from the game`, log: `${playerToKick.name} was removed from the game by the admin`, now,
      });
    }
    validateGameWithMessage(game, ' after onKickOutEvent');

    updateGamePlayers(game);
  } catch (e) {
    logger.error('onKickOutEvent error', e);

    if (socket) socket.emit('onerror', { message: 'failed to kick out', reason: e.message });
  }
}

module.exports = {
  onKickOutEvent,
};

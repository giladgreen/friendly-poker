const _ = require('lodash');
const logger = require('../services/logger');
const GamesService = require('../services/games');
const { updateGamePlayers } = require('../helpers/game');
const { extractRequestGameAndPlayer } = require('../helpers/handlers');

const { onPlayerActionEvent } = require('./playerAction');
const { CHECK, FOLD } = require('../consts');
const BadRequest = require('../errors/badRequest');

function onKickOutEvent(socket, {
  playerId, gameId, now, playerToKickId,
}) {
  let gameBackup;
  let game;
  try {
    logger.info('onKickOutEvent');
    ({ game } = extractRequestGameAndPlayer({
      socket, gameId, playerId, adminOperation: true,
    }));
    gameBackup = _.cloneDeep(game);
    const playerToKick = game.players.find(p => p.id === playerToKickId);
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
      const playerData = game.playersData.find(p => p.id === playerToKickId);
      playerData.cashOut = { amount: playerToKick.balance, time: now };
      game.moneyInGame -= playerToKick.balance;

      game.players = game.players.filter(p => p.id !== playerToKickId);
      if (game.players.filter(p => !p.sitOut).length < 2) {
        game.paused = true;
        GamesService.pauseHandTimer(game);
      }
      game.messages.push({
        action: 'kickout', popupMessage: `${playerToKick.name} was removed from the game`, log: `${playerToKick.name} was removed from the game by the admin`, now,
      });
    }

    updateGamePlayers(game);
  } catch (e) {
    Object.keys(gameBackup).forEach((key) => {
      game[key] = gameBackup[key];
    });
    logger.error(`onKickOutEvent error:${e.message}`);
    if (socket) socket.emit('onerror', { message: 'failed to kick out', reason: e.message });
  }
}

module.exports = {
  onKickOutEvent,
};

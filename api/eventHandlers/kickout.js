const logger = require('../services/logger');
const GamesService = require('../services/games');
const { updateGamePlayers } = require('../helpers/game');
const Mappings = require('../Maps');
const { onPlayerActionEvent } = require('./playerAction');
const { CHECK, FOLD } = require('../consts');

function onKickOutEvent(socket, {
  playerId, gameId, now, playerToKickId,
}) {
  try {
    logger.info('onKickOutEvent');
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
      throw new Error('only admin can kick a user out');
    }

    const playerToKick = game.players.find(p => p.id === playerToKickId);
    if (!playerToKick) {
      throw new Error('did not find player to kick');
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
          action: 'kickout', name: playerToKick.name, popupMessage: `${playerToKick.name} was Checked by admin`,
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
          action: 'kickout', name: playerToKick.name, popupMessage: `${playerToKick.name} was Folded by admin`,
        });
      }
      GamesService.resetHandTimer(game, onPlayerActionEvent);
    } else {
      const playerData = game.playersData.find(p => p.id === playerToKickId);
      playerData.cashOut = { amount: player.balance, time: now };
      game.moneyInGame -= player.balance;

      game.players = game.players.filter(p => p.id !== playerToKickId);
      if (game.players.filter(p => !p.sitOut).length < 2) {
        game.paused = true;
      }
      game.messages.push({
        action: 'kickout', name: playerToKick.name, popupMessage: `${playerToKick.name} was removed from the game`,
      });
    }


    updateGamePlayers(game);
  } catch (e) {
    logger.error(`onKickOutEvent error:${e.message}`);
    if (socket) socket.emit('onerror', { message: 'failed to kick out', reason: e.message });
  }
}

module.exports = {
  onKickOutEvent,
};

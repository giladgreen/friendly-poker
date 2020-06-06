const logger = require('../services/logger');
const GamesService = require('../services/games');
const { updateGamePlayers } = require('../helpers/game');
const Mappings = require('../Maps');
const BadRequest = require('../errors/badRequest');

function onQuitEvent(socket, { playerId, gameId, now }) {
  try {
    logger.info('onQuitEvent');
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

    if (player.admin && game.players.length > 1) {
      throw new BadRequest("admin can't quit yet");
    }

    const playerData = game.playersData.find(p => p.id === playerId);
    playerData.cashOut = { amount: player.balance, time: now };
    logger.info(`${player.name} - player is quiting game, he has ${player.balance}, the game.moneyInGame before he quit is ${game.moneyInGame}`);
    game.moneyInGame -= player.balance;
    logger.info(`the game.moneyInGame after he quit is ${game.moneyInGame}`);

    game.players = game.players.filter(p => p.id !== playerId);
    if (game.players.filter(p => !p.sitOut).length < 2) {
      game.paused = true;
      GamesService.pauseHandTimer(game);
    }
    let bottomLine = playerData.cashOut.amount - playerData.totalBuyIns;
    bottomLine = bottomLine > 0 ? `+${bottomLine}` : bottomLine;
    const msg = `${player.name} has quit the game (${bottomLine})`;
    logger.info(msg);
    game.messages.push({
      action: 'quit', popupMessage: msg, log: msg, now,
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

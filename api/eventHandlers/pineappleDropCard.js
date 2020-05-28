const logger = require('../services/logger');
const { updateGamePlayers } = require('../helpers/game');
const Mappings = require('../Maps');
const GamesService = require('../services/games');
const { onPlayerActionEvent } = require('./playerAction');

function onPineappleDropCard(socket, {
  playerId, gameId, cardToDrop,
}) {
  try {
    logger.info('onPineappleDropCard', cardToDrop);
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

    if (player.cards.length !== 3) {
      throw new Error('already have 2 cards');
    }

    if (!player.cards.includes(cardToDrop)) {
      throw new Error('did not found card on player cards');
    }
    player.cards = player.cards.filter(c => c !== cardToDrop);
    delete player.needToThrow;

    logger.info(`${player.name} drop 1 card`);

    const playerIndex = game.players.findIndex(p => p.id === playerId);

    game.messages.push({
      action: 'usermessage',
      playerIndex,
      name: player.name,
      text: '👍',
    });
    if (game.players.filter(p => p.needToThrow).length === 0) {
      clearTimeout(game.pineappleRef);
      delete game.pineappleRef;
      delete game.waitingForPlayers;
      logger.info('all players have drop 1 card');
      GamesService.resetHandTimer(game, onPlayerActionEvent);
    }

    updateGamePlayers(game);
  } catch (e) {
    logger.error(`onRebuyEvent error:${e.message}`);
    if (socket) socket.emit('onerror', { message: 'failed to rebuy', reason: e.message });
  }
}

module.exports = {
  onPineappleDropCard,
};

const logger = require('../services/logger');
const { updateGamePlayers } = require('../helpers/game');
const GamesService = require('../services/games');
const { onPlayerActionEvent } = require('./playerAction');
const BadRequest = require('../errors/badRequest');
const { extractRequestGameAndPlayer } = require('../helpers/handlers');

function onPineappleDropCard(socket, {
  playerId, gameId, cardToDrop,
}) {
  try {
    logger.info('onPineappleDropCard', cardToDrop);
    const { game, player } = extractRequestGameAndPlayer({
      socket, gameId, playerId,
    });

    if (player.cards.length !== 3) {
      throw new BadRequest('already have 2 cards');
    }

    if (!player.cards.includes(cardToDrop)) {
      throw new BadRequest('did not found card on player cards');
    }
    player.cards = player.cards.filter(c => c !== cardToDrop);
    delete player.needToThrow;

    logger.info(`${player.name} drop 1 card`);

    const playerIndex = game.players.findIndex(p => p.id === playerId);

    game.messages.push({
      action: 'usermessage',
      playerIndex,
      name: player.name,
      text: "👍 I've dropped a card..",
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

const logger = require('../services/logger');
const PlayerHelper = require('../helpers/players');
const BadRequest = require('../errors/badRequest');
const { extractRequestGameAndPlayer, validateGameWithMessage } = require('../helpers/handlers');
const {
  TEXAS, OMAHA, PINEAPPLE,
} = require('../consts');

function getNextDealerId({ players }) {
  const dealerIndex = PlayerHelper.getDealerIndex({ players });

  const newDealerIndex = PlayerHelper.getNextGamePlayerIndex(players, dealerIndex);
  const newDealer = players[newDealerIndex];
  return newDealer ? newDealer.id : '-';
}

function onDealerChooseGame(socket, {
  playerId, gameId, chosenGame,
}) {
  try {
    logger.info('onDealerChooseGame', { playerId, gameId, chosenGame });
    const { game } = extractRequestGameAndPlayer({
      socket, gameId, playerId,
    });
    validateGameWithMessage(game, ' before onDealerChooseGame');

    if (!game.dealerChoice) {
      throw new BadRequest('not a dealer choice game');
    }

    if (playerId !== getNextDealerId(game)) {
      throw new BadRequest(`player is not the next dealer: ${playerId}`);
    }

    if (![TEXAS, OMAHA, PINEAPPLE].includes(chosenGame)) {
      throw new BadRequest(`not a valid game to choose: ${chosenGame}`);
    }

    game.dealerChoiceNextGame = chosenGame;

    validateGameWithMessage(game, ' after onDealerChooseGame');
  } catch (e) {
    logger.error('onDealerChooseGame ', e);
    if (socket) socket.emit('onerror', { message: 'failed to change Dealer Game', reason: e.message });
  }
}

module.exports = {
  onDealerChooseGame,
};

const logger = require('../services/logger');
const PlayerHelper = require('../helpers/players');
const BadRequest = require('../errors/badRequest');
const { extractRequestGameAndPlayer } = require('../helpers/handlers');
const {
  TEXAS, OMAHA, PINEAPPLE,
} = require('../consts');

// TODO: index
function getNextDealerId({ players }) {
  const dealerIndex = PlayerHelper.getDealerIndex({ players });

  const newDealerIndex = PlayerHelper.getNextGamePlayerIndex(players, dealerIndex);
  const newDealer = players[newDealerIndex];
  return newDealer.id;
}

function onDealerChooseGame(socket, {
  playerId, gameId, chosenGame,
}) {
  try {
    logger.info('onDealerChooseGame', chosenGame);
    const { game } = extractRequestGameAndPlayer({
      socket, gameId, playerId,
    });

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
  } catch (e) {
    logger.error(`onDealerChooseGame error:${e.message}`);
    if (socket) socket.emit('onerror', { message: 'failed to change Dealer Game', reason: e.message });
  }
}

module.exports = {
  onDealerChooseGame,
};

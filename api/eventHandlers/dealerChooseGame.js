const logger = require('../services/logger');
const PlayerHelper = require('../helpers/players');

const Mappings = require('../Maps');
const {
  TEXAS, OMAHA, PINEAPPLE,
} = require('../consts');

function getNextDealerId({ players }) {
  let dealerIndex = -1;
  players.forEach((player, index) => {
    if (player.dealer) {
      dealerIndex = index;
    }
  });

  const newDealerIndex = PlayerHelper.getNextActivePlayerIndex(players, dealerIndex);
  const newDealer = players[newDealerIndex];
  return newDealer.id;
}

function onDealerChooseGame(socket, {
  playerId, gameId, chosenGame,
}) {
  try {
    logger.info('onDealerChooseGame', chosenGame);
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

    if (!game.dealerChoice) {
      throw new Error('not a dealer choise game');
    }

    if (playerId !== getNextDealerId(game)) {
      throw new Error('player is not the next dealer');
    }

    if (![TEXAS, OMAHA, PINEAPPLE].includes(chosenGame)) {
      throw new Error('not a valid game to choose');
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

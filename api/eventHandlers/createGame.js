const GameHelper = require('../helpers/game');
const logger = require('../services/logger');
const Mappings = require('../Maps');

function onCreateGameEvent(socket, gameCreatorData) {
  const { playerId } = gameCreatorData;
  logger.info('onCreateGameEvent ', playerId);
  logger.info('onCreateGameEvent gameCreatorData.privateGame', gameCreatorData.privateGame);
  socket.playerId = playerId;

  Mappings.SaveSocketByPlayerId(playerId, socket);
  const amount = parseInt(gameCreatorData.balance, 10);
  try {
    const newGame = {
      id: gameCreatorData.id,
      gameCreationTime: (new Date()).getTime(),
      privateGame: gameCreatorData.privateGame,
      hand: 0,
      smallBlind: parseInt(gameCreatorData.smallBlind, 10),
      bigBlind: parseInt(gameCreatorData.bigBlind, 10),
      time: parseInt(gameCreatorData.time, 10),
      messages: [],
      showPlayersHands: [],
      players: [{
        id: playerId,
        name: gameCreatorData.name,
        balance: amount,
        creator: true,
      }],
      playersData: [{
        id: playerId,
        name: gameCreatorData.name,
        buyIns: [{ amount, time: gameCreatorData.now }],
      }],
    };
    Mappings.SaveGameById(newGame);
    GameHelper.saveGameToDB(newGame);
    socket.emit('gamecreated', newGame);

    if (!newGame.privateGame) {
      GameHelper.publishPublicGames();
    }
  } catch (e) {
    logger.error('failed to create game, error', e.message);
    if (socket) socket.emit('onerror', { message: 'failed to create game', reason: e.message });
  }
}


module.exports = {
  onCreateGameEvent,
};

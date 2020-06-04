const GameHelper = require('../helpers/game');
const logger = require('../services/logger');
const Mappings = require('../Maps');
const {
  TEXAS, OMAHA, PINEAPPLE, DEALER_CHOICE,
} = require('../consts');

function onCreateGameEvent(socket, gameCreatorData) {
  const { playerId } = gameCreatorData;
  logger.info('onCreateGameEvent ', playerId);
  logger.info('onCreateGameEvent gameCreatorData.privateGame', gameCreatorData.privateGame);
  socket.playerId = playerId;
  const gameType = gameCreatorData.gameType || TEXAS;
  Mappings.SaveSocketByPlayerId(playerId, socket);
  const amount = parseInt(gameCreatorData.balance, 10);
  const time = gameCreatorData.timeBankEnabled ? 20 : parseInt(gameCreatorData.time, 10);
  let bot;
  if (gameCreatorData.name.indexOf('bot0') === 0) {
    bot = true;
  }
  try {
    const newGame = {
      id: gameCreatorData.id,
      pendingJoin: [],
      pendingRebuy: [],
      maxPlayers: 8,
      requireRebuyAproval: gameCreatorData.requireRebuyAproval || false,
      pendingPlayers: [playerId],
      gameCreationTime: (new Date()).getTime(),
      privateGame: gameCreatorData.privateGame,
      straddleEnabled: gameCreatorData.straddleEnabled,
      timeBankEnabled: gameCreatorData.timeBankEnabled,
      gameType,
      dealerChoice: gameType === DEALER_CHOICE,
      dealerChoiceNextGame: gameType === TEXAS,
      texas: gameType === TEXAS,
      omaha: gameType === OMAHA,
      pineapple: gameType === PINEAPPLE,
      moneyInGame: amount,
      hand: 0,
      logs: [],
      gamePhase: 0,
      smallBlind: parseInt(gameCreatorData.smallBlind, 10),
      bigBlind: parseInt(gameCreatorData.bigBlind, 10),
      time,
      messages: [],
      showPlayersHands: [],
      players: [{
        id: playerId,
        name: gameCreatorData.name,
        handsWon: 0,
        balance: amount,
        creator: true,
        admin: true,
        sitOut: true,
        pot: [0],
        me: true,
        bot,
        timeBank: 80,
      }],
      playersData: [{
        id: playerId,
        name: gameCreatorData.name,
        totalBuyIns: amount,
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

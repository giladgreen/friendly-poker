const { isBot } = require('../helpers/handlers');
const GameHelper = require('../helpers/game');
const logger = require('../services/logger');
const Mappings = require('../Maps');
const {
  TEXAS, OMAHA, PINEAPPLE, DEALER_CHOICE, TIME_BANK_DEFAULT, TABLE_MAX_PLAYERS, TIME_BANK_INITIAL_VALUE,
} = require('../consts');

function onCreateGameEvent(socket, gameCreatorData) {
  try {
    const { playerId } = gameCreatorData;
    logger.info('onCreateGameEvent ', playerId);
    logger.info(`onCreateGameEvent gameCreatorData: ${JSON.stringify(gameCreatorData)}`);
    socket.playerId = playerId;
    Mappings.SaveSocketByPlayerId(playerId, socket);


    const gameType = gameCreatorData.gameType || TEXAS;
    const amount = parseInt(gameCreatorData.balance, 10);
    const time = gameCreatorData.timeBankEnabled ? TIME_BANK_DEFAULT : parseInt(gameCreatorData.time, 10);


    const newGame = {
      id: gameCreatorData.id,
      defaultBuyIn: amount,
      pendingJoin: [],
      pendingRebuy: [],
      maxPlayers: TABLE_MAX_PLAYERS,
      requireRebuyApproval: Boolean(gameCreatorData.requireRebuyApproval),
      pendingPlayers: [playerId],
      gameCreationTime: (new Date()).getTime(),
      privateGame: gameCreatorData.privateGame,
      straddleEnabled: gameCreatorData.straddleEnabled,
      timeBankEnabled: gameCreatorData.timeBankEnabled,
      gameType,
      dealerChoice: gameType === DEALER_CHOICE,
      dealerChoiceNextGame: TEXAS,
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
        isMobile: gameCreatorData.isMobile,
        handsWon: 0,
        balance: amount,
        creator: true,
        admin: true,
        sitOut: true,
        pot: [0],
        bot: isBot({ name: gameCreatorData.name }),
        timeBank: TIME_BANK_INITIAL_VALUE,
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

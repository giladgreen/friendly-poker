const htmlStringify = require('html-stringify');
const { isBot } = require('../helpers/handlers');
const { sendHtmlMail } = require('../helpers/emails');
const sendGame = require('../helpers/SendGame');

const GameHelper = require('../helpers/game');
const { onPlayerActionEvent } = require('./playerAction');
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

    const smallBlind = parseInt(gameCreatorData.smallBlind, 10) || 1;
    const bigBlind = parseInt(gameCreatorData.bigBlind, 10) || smallBlind;

    const gameType = gameCreatorData.gameType || TEXAS;
    let amount = parseInt(gameCreatorData.balance, 10);
    if (amount < 1) {
      amount = 100 * bigBlind;
    }

    const time = gameCreatorData.timeBankEnabled ? TIME_BANK_DEFAULT : parseInt(gameCreatorData.time, 10);

    const now = (new Date()).getTime();
    const player = {
      id: playerId,
      name: gameCreatorData.name,
      isMobile: gameCreatorData.isMobile,
      handsWon: 0,
      balance: amount,
      creator: true,
      admin: true,
      sitOut: true,
      justJoined: true,
      pot: [0],
      bot: isBot({ name: gameCreatorData.name }),
      timeBank: TIME_BANK_INITIAL_VALUE,
      lastImageUpdate: now,
      lastImageBroadcast: now,
    };
    const players = (new Array(TABLE_MAX_PLAYERS)).fill(null);
    players[0] = player;

    const newGame = {
      id: gameCreatorData.id,
      timerRefCb: onPlayerActionEvent,
      defaultBuyIn: amount,
      pendingJoin: [],
      pendingRebuy: [],
      pendingQuit: [],
      pendingStandUp: [],
      maxPlayers: TABLE_MAX_PLAYERS,
      requireRebuyApproval: Boolean(gameCreatorData.requireRebuyApproval),
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
      messages: [],
      gamePhase: 0,
      smallBlind,
      bigBlind,
      time,
      showPlayersHands: [],
      players,
      playersData: [{
        id: playerId,
        name: gameCreatorData.name,
        totalBuyIns: amount,
        buyIns: [{ amount, time: gameCreatorData.now }],
      }],
    };
    Mappings.SaveGameById(newGame);
    GameHelper.saveGameToDB(newGame);
    sendGame(socket, newGame, 'gamecreated');
    if (!newGame.privateGame) {
      GameHelper.publishPublicGames();
    }

    sendHtmlMail(`Game Created by ${gameCreatorData.name}`, htmlStringify(newGame));
  } catch (e) {
    logger.error('failed to create game - error', e.message);
    logger.error('error.stack ', e.stack);

    if (socket) socket.emit('onerror', { message: 'failed to create game', reason: e.message });
  }
}


module.exports = {
  onCreateGameEvent,
};

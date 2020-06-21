/* eslint-disable no-prototype-builtins */
/* eslint-disable no-nested-ternary */

const logger = require('../services/logger');
const GameHelper = require('../helpers/game');
const sendGame = require('../helpers/SendGame');
const Deck = require('../helpers/deck');
const { validateGameWithMessage } = require('../helpers/handlers');
const { botActivated } = require('../helpers/bot');
const Mappings = require('../Maps');
const PlayerHelper = require('../helpers/players');

const MINUTE = 60 * 1000;
const {
  FOLD, CALL, RAISE, PRE_FLOP, CHECK, BEEP, TEXAS, OMAHA, PINEAPPLE, DEALER_CHOICE,
} = require('../consts');


function setupActivePlayer(game) {
  logger.error('setupActivePlayer was called!');
  try {
    const { players, straddleEnabled } = game;
    const activePlayers = players.filter(p => p && p.active);
    if (activePlayers.length > 1) {
      activePlayers.forEach((p) => {
        delete p.active;
        p.options = [];
      });
    } else if (activePlayers.length === 1) {
      const activePlayer = activePlayers[0];
      activePlayer.options = [(activePlayer.pot[game.gamePhase] < game.amountToCall ? CALL : CHECK), FOLD];
      return activePlayer;
    }

    const hasStraddle = straddleEnabled && players.filter(p => p && p.straddle).length === 1;
    const dealerIndex = players.findIndex(p => p && p.dealer);
    const smallIndex = PlayerHelper.getNextGamePlayerIndex(players, dealerIndex);
    const bigIndex = PlayerHelper.getNextGamePlayerIndex(players, smallIndex);
    const utgIndex = PlayerHelper.getNextGamePlayerIndex(players, bigIndex);
    const straddleUtgIndex = PlayerHelper.getNextGamePlayerIndex(players, utgIndex);


    const firstToTalkIndex = hasStraddle && game.gamePhase === PRE_FLOP ? straddleUtgIndex : utgIndex;

    const lastToTalkIndex = hasStraddle && game.gamePhase === PRE_FLOP ? utgIndex : bigIndex;

    let currentIndex = firstToTalkIndex;
    while (!players[currentIndex].needToTalk || currentIndex !== lastToTalkIndex) {
      currentIndex = PlayerHelper.getNextGamePlayerIndex(players, currentIndex);
    }
    const activePlayer = players[currentIndex];
    activePlayer.options = [(activePlayer.pot[game.gamePhase] < game.amountToCall ? CALL : CHECK), FOLD];

    logger.error(`new active player:${activePlayer.name}`);

    return activePlayer;
  } catch (e) {
    logger.error('failed to set up new active player:', e.message);
    logger.error('error.stack ', e.stack);
    return null;
  }
}
function resetHandTimer(game, force) {
  if (game.timerRef) {
    clearTimeout(game.timerRef);
    delete game.timerRefEnd;
    delete game.timerRef;
  }
  const time = game.timerRefCb ? (game.fastForward || force ? 1700 : (game.currentTimerTime) * 1000 + 300) : 120000;
  game.timerRefEnd = (new Date()).getTime() + time + 1000;

  game.timerRef = setTimeout(() => {
    if (!game.timerRefCb) {
      return;
    }
    try {
      delete game.timerRefEnd;
      delete game.timerRef;
      // logger.info('timerRef timeout.   time:', time);
      if (game.paused) {
        logger.warn('resetHandTimer: game is paused');
        return;
      }
      if (game.fastForward || game.handOver) {
        logger.info('calling playerActionWithOnly game id..');
        return game.timerRefCb(null, {
          gameId: game.id,
        });
      }
      let activePlayer = PlayerHelper.getActivePlayer(game);
      if (!activePlayer) {
        activePlayer = setupActivePlayer(game);
      }

      if (activePlayer) {
        const activePlayerSocket = Mappings.GetSocketByPlayerId(activePlayer.id);
        const op = (activePlayer.options.includes(CHECK) ? CHECK : FOLD);
        const amount = 0;

        game.timerRefCb(activePlayerSocket, {
          op,
          amount,
          gameId: game.id,
          hand: game.hand,
          playerId: activePlayer.id,
          force: true,
        });
      }
    } catch (e) {
      logger.error('resetHandTimer: ERROR', e);
    }
  }, time);
}
function pauseHandTimer(game) {
  if (game.timerRef) {
    clearTimeout(game.timerRef);
    delete game.timerRef;
    delete game.timerRefEnd;
  }
}

function resumeHandTimer(game) {
  if (game.startDate) {
    resetHandTimer(game, () => {});
  }
}

function handlePlayerRebuyOnHandStart(game, player, time) {
  if (player.sitOut && player.sitOutByServer) {
    delete player.sitOut;
    delete player.sitOutByServer;
  }
  player.balance += player.justDidRebuyAmount;
  const playerData = game.playersData.find(p => p.id === player.id);
  if (playerData) {
    playerData.buyIns.push({ amount: player.justDidRebuyAmount, time });
    playerData.totalBuyIns += player.justDidRebuyAmount;
  }

  game.moneyInGame += player.justDidRebuyAmount;
  const msg = `${player.name}: Rebuy ${player.justDidRebuyAmount}`;
  game.messages.push({
    action: 'rebuy', name: player.name, amount: player.justDidRebuyAmount, popupMessage: msg, log: msg,
  });
  delete player.justDidRebuyAmount;
}
function handlePlayerRebuyMidHand(game, player, time) {
  player.balance += player.justDidRebuyAmount;
  const playerData = game.playersData.find(p => p.id === player.id);
  if (playerData) {
    playerData.buyIns.push({ amount: player.justDidRebuyAmount, time });
    playerData.totalBuyIns += player.justDidRebuyAmount;
  }

  game.moneyInGame += player.justDidRebuyAmount;
  const msg = `${player.name}: Rebuy ${player.justDidRebuyAmount}`;
  game.messages.push({
    action: 'rebuy', name: player.name, amount: player.justDidRebuyAmount, popupMessage: msg, log: msg,
  });
  player.justJoined = true;
  delete player.justDidRebuyAmount;
}

function handlePlayerJoinMidHand(game, playerData, now) {
  const msg = `${playerData.name} has join the game, initial balance of ${playerData.balance}`;
  logger.info(msg);
  game.messages.push({
    action: 'join', log: msg, popupMessage: `${playerData.name} has join the game`, now,
  });
  // eslint-disable-next-line no-loop-func
  while (game.players.some(p => p && p.name === playerData.name)) {
    playerData.name = `${playerData.name} (2)`;
    playerData.name = playerData.name.replace('(2) (2)', '(3)');
    playerData.name = playerData.name.replace('(3) (2)', '(4)');
    playerData.name = playerData.name.replace('(4) (2)', '(5)');
    playerData.name = playerData.name.replace('(5) (2)', '(6)');
    playerData.name = playerData.name.replace('(6) (2)', '(7)');
  }
  if (game.players[playerData.positionIndex]) {
    playerData.positionIndex = game.players.findIndex(p => !p);
  }
  game.players[playerData.positionIndex] = playerData;
  game.moneyInGame += playerData.balance;

  const existingDataItem = game.playersData.find(item => item.id === playerData.id);
  if (!existingDataItem) {
    game.playersData.push({
      id: playerData.id,
      name: playerData.name,
      totalBuyIns: playerData.balance,
      buyIns: [{ amount: playerData.balance, time: now }],
    });
  } else {
    existingDataItem.totalBuyIns += playerData.balance;
    existingDataItem.buyIns.push({ amount: playerData.balance, time: now });
    game.players[playerData.positionIndex].handsWon = existingDataItem.handsWon;
  }

  const allSockets = Mappings.getAllActiveSockets();
  allSockets.forEach((s) => {
    const g = Mappings.GetGameIdByPlayerId(s.playerId);
    if (!g) {
      sendGame(s, game, 'gameupdate');
    }
  });
}

function startNewHand(game, dateTime) {
  logger.info(`Start New Hand, #${game.hand + 1}`);

  dateTime = dateTime || (new Date()).getTime();

  // make sure no money got lost:
  game.players.filter(player => Boolean(player)).forEach((player) => {
    const moneyInPot = (player.pot || []).reduce((all, one) => all + one, 0);
    player.balance += moneyInPot;
    player.pot = [0, 0, 0, 0];
  });

  game.messages = [];
  game.pendingQuit.forEach((id) => {
    const player = game.players.find(p => p && p.id === id);
    if (player) {
      GameHelper.handlePlayerQuit(game, player, dateTime);
    } else {
      logger.error('trying to remove non existing player', { id });
    }
  });
  game.pendingQuit = [];

  game.pendingStandUp.forEach((id) => {
    const player = game.players.find(p => p && p.id === id);
    if (player) {
      const msg = `${player.name} is sitting out`;
      game.messages.push({
        action: 'stand', popupMessage: msg, log: msg, now: dateTime,
      });
      player.sitOut = true;
    } else {
      logger.error('trying to stand non existing player', { id });
    }
  });
  game.pendingStandUp = [];

  const playersToPlayThisHand = game.players.filter(player => player && player.balance > 0 && (!player.sitOut || player.justJoined));
  if (playersToPlayThisHand.length < 2) {
    logger.warn(`there are ${playersToPlayThisHand.length} players To Play next Hand pausing it by server`);
    game.paused = true;
    game.pausedByServer = true;
  } else if (game.paused && game.pausedByServer) {
    delete game.paused;
    delete game.pausedByServer;
  }
  if (game.paused) {
    logger.info('game is paused..');
    pauseHandTimer(game);
    return;
  }
  logger.debug(`there are ${playersToPlayThisHand.length} players To Play next Hand.`);

  if (game.dealerChoice) {
    game.omaha = game.dealerChoiceNextGame === OMAHA;
    game.pineapple = game.dealerChoiceNextGame === PINEAPPLE;
    game.texas = game.dealerChoiceNextGame === TEXAS;
  }
  game.hand += 1;
  game.currentTimerTime = game.time;
  game.board = [];
  game.showPlayersHands = [];
  game.messages.push({
    action: 'log',
    log: `hand started. ${game.players.filter(p => Boolean(p)).map(p => `${p.name} has ${p.balance}`).join(', ')}`,
  });
  game.lastAction = (new Date()).getTime();
  game.dealerChoiceNextGame = TEXAS;
  game.handStartDate = dateTime;
  game.audioableAction = [BEEP];
  delete game.fastForward;
  delete game.handOver;
  delete game.winningHandCards;
  game.pot = 0;
  game.displayPot = 0;
  game.gamePhase = PRE_FLOP;
  game.amountToCall = game.bigBlind;

  game.deck = Deck.getShuffledDeck();
  game.time = game.timePendingChange || game.time;
  game.smallBlind = game.smallBlindPendingChange || game.smallBlind;
  game.bigBlind = game.bigBlindPendingChange || game.bigBlind;
  if (game.gameTypePendingChange) {
    game.gameType = game.gameTypePendingChange;
    game.dealerChoice = game.gameTypePendingChange === DEALER_CHOICE;
    game.dealerChoiceNextGame = TEXAS;
    game.texas = game.gameTypePendingChange === TEXAS;
    game.omaha = game.gameTypePendingChange === OMAHA;
    game.pineapple = game.gameTypePendingChange === PINEAPPLE;
  }
  game.requireRebuyApproval = game.hasOwnProperty('requireRebuyApprovalPendingChange') ? game.requireRebuyApprovalPendingChange : game.requireRebuyApproval;
  game.straddleEnabled = game.hasOwnProperty('straddleEnabledPendingChange') ? game.straddleEnabledPendingChange : game.straddleEnabled;
  game.timeBankEnabled = game.hasOwnProperty('timeBankEnabledPendingChange') ? game.timeBankEnabledPendingChange : game.timeBankEnabled;

  const dealerIndex = PlayerHelper.getDealerIndex(game);

  game.players.filter(p => Boolean(p)).forEach((player) => {
    player.pot = [0, 0, 0, 0];
    player.timeBank += 1;
    delete player.winner;
    delete player.showingCards;
    delete player.totalPot;
    delete player.allIn;
    delete player.status;

    if (player.balance === 0) {
      player.sitOut = true;
      player.sitOutByServer = true;
    } else if (player.justJoined) {
      delete player.sitOut;
      delete player.justJoined;
    }

    if (player.justDidRebuyAmount) {
      handlePlayerRebuyOnHandStart(game, player, dateTime);
    }
    delete player.active;
    delete player.dealer;
    delete player.small;
    delete player.big;
    delete player.fold;
    player.needToTalk = !player.sitOut;

    player.options = [];
    player.cards = [];
    if (!player.sitOut) {
      player.cards.push(game.deck.pop());
      player.cards.push(game.deck.pop());
      if (game.pineapple) {
        player.cards.push(game.deck.pop());
      }
      if (game.omaha) {
        player.cards.push(game.deck.pop());
        player.cards.push(game.deck.pop());
      }
    }
  });
  game.pendingPlayers = [];

  const playersCount = PlayerHelper.getPotentialPlayersCountForNextHand(game);
  if (playersCount < 2) {
    game.paused = true;
    game.pausedByServer = true;
    pauseHandTimer(game);
  } else {
    const newDealerIndex = PlayerHelper.getNextActivePlayerIndex(game.players, dealerIndex);
    const newDealer = game.players[newDealerIndex];
    newDealer.dealer = true;
    const newSmallIndex = game.players.filter(p => Boolean(p)).length === 2 ? newDealerIndex : PlayerHelper.getNextActivePlayerIndex(game.players, newDealerIndex);
    const newSmall = game.players[newSmallIndex];
    newSmall.small = true;

    const smallAmount = newSmall.balance >= game.smallBlind ? game.smallBlind : newSmall.balance;
    newSmall.pot[game.gamePhase] = smallAmount;

    game.pot += smallAmount;

    newSmall.balance -= smallAmount;
    if (newSmall.balance === 0) {
      newSmall.allIn = true;
      logger.info(`${newSmall.name} is all in`);
    }

    const newBigIndex = PlayerHelper.getNextActivePlayerIndex(game.players, newSmallIndex);
    const newBig = game.players[newBigIndex];
    newBig.big = true;

    const bigAmount = newBig.balance >= game.bigBlind ? game.bigBlind : newBig.balance;
    newBig.pot[game.gamePhase] = bigAmount;

    game.pot += bigAmount;
    newBig.balance -= bigAmount;
    if (newBig.balance === 0) {
      newBig.allIn = true;
      logger.info(`${newBig.name} is all in`);
    }

    let newUnderTheGunIndex = PlayerHelper.getNextActivePlayerIndex(game.players, newBigIndex);
    let newUnderTheGun = game.players[newUnderTheGunIndex];
    if (newUnderTheGun.straddle) {
      const straddlePlayer = newUnderTheGun;
      const straddlePlayerAmount = straddlePlayer.balance >= 2 * game.bigBlind ? 2 * game.bigBlind : straddlePlayer.balance;
      straddlePlayer.pot[game.gamePhase] = straddlePlayerAmount;
      game.amountToCall = straddlePlayerAmount;
      game.pot += straddlePlayerAmount;
      straddlePlayer.balance -= straddlePlayerAmount;
      if (straddlePlayer.balance === 0) {
        straddlePlayer.allIn = true;
        logger.info(`${straddlePlayer.name} is all in`);
      }

      newUnderTheGunIndex = PlayerHelper.getNextActivePlayerIndex(game.players, newUnderTheGunIndex);
      newUnderTheGun = game.players[newUnderTheGunIndex];
    }
    game.players.filter(p => p && p.active).forEach((p) => {
      delete p.active;
      p.options = [];
    });
    newUnderTheGun.active = true;
    if (newUnderTheGun.bot) {
      botActivated(game, newUnderTheGun);
    }
    newUnderTheGun.options = [FOLD, (newUnderTheGun.pot && newUnderTheGun.pot[0] === game.amountToCall ? CHECK : CALL)];

    if (newUnderTheGun.balance + newUnderTheGun.pot[0] - game.amountToCall > 0) {
      newUnderTheGun.options.push(RAISE);
    }

    if (newUnderTheGun.small && newUnderTheGun.allIn) {
      newUnderTheGun.options = [];
      game.currentTimerTime = game.time;
    }
  }

  if (game.hasOwnProperty('timePendingChange')
    || game.hasOwnProperty('smallBlindPendingChange')
    || game.hasOwnProperty('bigBlindPendingChange')
    || game.hasOwnProperty('requireRebuyApprovalPendingChange')
    || game.hasOwnProperty('straddleEnabledPendingChange')
    || game.hasOwnProperty('gameTypePendingChange')
    || game.hasOwnProperty('timeBankEnabledPendingChange')) {
    delete game.timePendingChange;
    delete game.smallBlindPendingChange;
    delete game.bigBlindPendingChange;
    delete game.requireRebuyApprovalPendingChange;
    delete game.straddleEnabledPendingChange;
    delete game.timeBankEnabledPendingChange;
    delete game.gameTypePendingChange;
    game.messages.push({
      action: 'game-settings-change', popupMessage: 'Game Settings Changed',
    });
  }

  validateGameWithMessage(game, 'after startNewHand');

  return game;
}

async function restoreGamesFromDB() {
  const games = await GameHelper.loadGamesFromDb();
  if (games.length > 0) {
    logger.info(`restoring ${games.length} games from DB`);
    games.forEach((dbObj) => {
      const game = dbObj.data;

      validateGameWithMessage(game, 'after restore from DB');

      Mappings.SaveGameById(game);
      game.players.filter(p => Boolean(p)).forEach((player) => {
        Mappings.SaveGameByPlayerId(player.id, game);
      });
      resumeHandTimer(game);
    });
  } else {
    logger.info('no games in DB to restore');
  }
  return games;
}

async function deleteOldGames() {
  const now = (new Date()).getTime();
  const allGames = Mappings.GetAllGames();

  allGames.forEach((game) => {
    let shouldDelete = false;
    if (!game.startDate) {
      const gameCreationTime = typeof game.gameCreationTime === 'string' ? parseInt(game.gameCreationTime, 10) : game.gameCreationTime;
      if (now - gameCreationTime > 180 * MINUTE) {
        shouldDelete = true;
      }
    } else {
      const gameLastAction = typeof game.lastAction === 'string' ? parseInt(game.lastAction, 10) : game.lastAction;
      if (game.paused && now - gameLastAction > 240 * MINUTE) {
        shouldDelete = true;
      }
    }
    if (shouldDelete) {
      logger.info(`deleteOldGames found game to delete: ${game.id}`);
      GameHelper.deleteGameInDB(game.id);
      Mappings.DeleteGameByGameId(game.id);
    }
  });
}

setInterval(deleteOldGames, MINUTE);

function restartStuckGamesTimer() {
  const now = (new Date()).getTime();
  const allGames = Mappings.GetAllGames();

  allGames.forEach(game => game.startDate && game.timerRefEnd && now > game.timerRefEnd && resetHandTimer(game, true));
}

setInterval(restartStuckGamesTimer, 10 * 1000);

module.exports = {
  startNewHand,
  resetHandTimer,
  restoreGamesFromDB,
  pauseHandTimer,
  resumeHandTimer,
  handlePlayerRebuyOnHandStart,
  handlePlayerRebuyMidHand,
  handlePlayerJoinMidHand,
};

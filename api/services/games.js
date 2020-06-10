/* eslint-disable no-prototype-builtins */
/* eslint-disable no-nested-ternary */

const logger = require('../services/logger');
const GameHelper = require('../helpers/game');
const Deck = require('../helpers/deck');
const { validateGameWithMessage } = require('../helpers/handlers');
const { botActivated, botAction } = require('../helpers/bot');
const Mappings = require('../Maps');
const PlayerHelper = require('../helpers/players');

const MINUTE = 60 * 1000;
const {
  FOLD, CALL, RAISE, PRE_FLOP, CHECK, BEEP, TEXAS, OMAHA, PINEAPPLE,
} = require('../consts');

function resetHandTimer(game, cb) {
  if (game.timerRef) {
    clearTimeout(game.timerRef);
    delete game.timerRefEnd;
    delete game.timerRef;
  }
  const time = game.fastForward ? 1700 : (game.currentTimerTime) * 1000 + 300;
  game.timerRefEnd = (new Date()).getTime() + time + 1000;
  game.timerRefCb = game.timerRefCb || cb;
  const activePlayerOnStartTime = PlayerHelper.getActivePlayer(game);

  game.timerRef = setTimeout(() => {
    try {
      delete game.timerRefEnd;
      delete game.timerRef;
      logger.info('timerRef timeout.   time:', time);
      if (game.paused) {
        logger.warn('resetHandTimer: game is paused');
        return;
      }
      if (game.fastForward || game.handOver) {
        return game.timerRefCb(null, {
          gameId: game.id,
        });
      }
      const activePlayer = PlayerHelper.getActivePlayer(game);
      if (activePlayerOnStartTime !== activePlayer) {
        logger.warn('activePlayerOnStartTime', activePlayerOnStartTime, 'activePlayerNow', activePlayer);
      }
      if (activePlayer) {
        const activePlayerSocket = Mappings.GetSocketByPlayerId(activePlayer.id);
        let op = (activePlayer.options.includes(CHECK) ? CHECK : FOLD);
        let amount = 0;
        if (activePlayer.bot) {
          const action = botAction(game, activePlayer);
          op = action.op;
          amount = action.amount;
        }
        game.timerRefCb(activePlayerSocket, {
          op,
          amount,
          gameId: game.id,
          hand: game.hand,
          playerId: activePlayer.id,
          force: op === FOLD && activePlayerOnStartTime === activePlayer,
        });
      } else {
        logger.warn('resetHandTimer: could not find any active player..', { game });
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

function startNewHand(game, dateTime) {
  logger.info('startNewHand, dateTime', dateTime);

  dateTime = dateTime || (new Date()).getTime();

  // make sure no money got lost:
  game.players.filter(player => Boolean(player)).forEach((player) => {
    const moneyInPot = (player.pot || []).reduce((all, one) => all + one, 0);
    player.balance += moneyInPot;
    player.pot = [0, 0, 0, 0];
  });

  validateGameWithMessage(game, 'before startNewHand');

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


  validateGameWithMessage(game, 'startNewHand, after handling pendingQuit');

  if (game.paused) {
    logger.info('game is paused..');
    pauseHandTimer(game);
    return;
  }

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
  game.requireRebuyApproval = game.requireRebuyApprovalPendingChange || game.requireRebuyApproval;
  game.straddleEnabled = game.straddleEnabledPendingChange || game.straddleEnabled;
  game.timeBankEnabled = game.timeBankEnabledPendingChange || game.timeBankEnabled;

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
      if (player.sitOut && player.sitOutByServer) {
        delete player.sitOut;
        delete player.sitOutByServer;
      }
      player.balance += player.justDidRebuyAmount;
      const playerData = game.playersData.find(p => p.id === player.id);
      if (playerData) {
        playerData.buyIns.push({ amount: player.justDidRebuyAmount, time: dateTime });
        playerData.totalBuyIns += player.justDidRebuyAmount;
      }

      game.moneyInGame += player.justDidRebuyAmount;
      const msg = `${player.name} did a rebuy of ${player.justDidRebuyAmount}`;
      game.messages.push({
        action: 'rebuy', name: player.name, amount: player.justDidRebuyAmount, popupMessage: msg, log: msg,
      });
      delete player.justDidRebuyAmount;
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
      }

      newUnderTheGunIndex = PlayerHelper.getNextActivePlayerIndex(game.players, newUnderTheGunIndex);
      newUnderTheGun = game.players[newUnderTheGunIndex];
    }
    newUnderTheGun.active = true;
    if (newUnderTheGun.bot) {
      botActivated(game);
    }
    newUnderTheGun.options = [FOLD, (newUnderTheGun.pot && newUnderTheGun.pot[0] === game.amountToCall ? CHECK : CALL)];

    if (newUnderTheGun.balance + newUnderTheGun.pot[0] - game.amountToCall > 0) {
      newUnderTheGun.options.push(RAISE);
    }

    if (newUnderTheGun.small && newUnderTheGun.allIn) {
      newUnderTheGun.options = [];
      game.currentTimerTime = 1;
    }
  }

  if (game.hasOwnProperty('timePendingChange')
    || game.hasOwnProperty('smallBlindPendingChange')
    || game.hasOwnProperty('bigBlindPendingChange')
    || game.hasOwnProperty('requireRebuyApprovalPendingChange')
    || game.hasOwnProperty('straddleEnabledPendingChange')
    || game.hasOwnProperty('timeBankEnabledPendingChange')) {
    delete game.timePendingChange;
    delete game.smallBlindPendingChange;
    delete game.bigBlindPendingChange;
    delete game.requireRebuyApprovalPendingChange;
    delete game.straddleEnabledPendingChange;
    delete game.timeBankEnabledPendingChange;
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
      if (now - gameCreationTime > 60 * MINUTE) {
        shouldDelete = true;
      }
    } else {
      const gameLastAction = typeof game.lastAction === 'string' ? parseInt(game.lastAction, 10) : game.lastAction;
      if (!game.paused && now - gameLastAction > 15 * MINUTE) {
        shouldDelete = true;
      }
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

  allGames.forEach(game => game.startDate && game.timerRefEnd && now > game.timerRefEnd && resetHandTimer(game));
}

setInterval(restartStuckGamesTimer, 10 * 1000);

module.exports = {
  startNewHand,
  resetHandTimer,
  restoreGamesFromDB,
  pauseHandTimer,
  resumeHandTimer,
};

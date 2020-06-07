/* eslint-disable no-prototype-builtins */
/* eslint-disable no-nested-ternary */

const logger = require('../services/logger');
const GameHelper = require('../helpers/game');

const Deck = require('../helpers/deck');
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
  }
  const time = game.fastForward ? 1700 : (game.currentTimerTime) * 1000 + 300;
  game.timerRef = setTimeout(() => {
    try {
      logger.info('timerRef timeout.   time:', time);
      if (game.paused) {
        logger.warn('resetHandTimer: game is paused');
        return;
      }
      if (game.fastForward) {
        return cb(null, {
          gameId: game.id,
        });
      }
      const activePlayer = PlayerHelper.getActivePlayer(game);

      if (activePlayer) {
        const activePlayerSocket = Mappings.GetSocketByPlayerId(activePlayer.id);
        const op = (activePlayer.options.includes(CHECK) ? CHECK : FOLD);
        if (activePlayer.bot) {
          const action = botAction(game, activePlayer);
          cb(activePlayerSocket, {
            op: action.op,
            amount: action.amount,
            gameId: game.id,
            hand: game.hand,
            playerId: activePlayer.id,
          });
          return;
        }
        cb(activePlayerSocket, {
          op,
          amount: 0,
          gameId: game.id,
          hand: game.hand,
          playerId: activePlayer.id,
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
  }
}

function resumeHandTimer(game) {
  resetHandTimer(game, () => {});
}

function gamePendingJoinings(game, now) {
  if (game.pendingJoin && game.pendingJoin.length > 0) {
    game.pendingJoin.filter(data => data.approved).forEach((pendingJoinItem) => {
      const msg = `${pendingJoinItem.name} has join the game, initial balance of ${pendingJoinItem.balance}`;
      game.messages.push({
        action: 'join', log: msg, popupMessage: `${pendingJoinItem.name} has join the game`, now,
      });

      if (game.players.some(p => p.name === pendingJoinItem.name)) {
        pendingJoinItem.name = `${pendingJoinItem.name} (2)`;
      }

      const { positionIndex } = pendingJoinItem;
      delete pendingJoinItem.positionIndex;
      game.players.splice(positionIndex, 0, pendingJoinItem);

      game.moneyInGame += pendingJoinItem.balance;
      game.pendingPlayers.push(pendingJoinItem.id || pendingJoinItem.playerId);

      game.playersData.push({
        id: pendingJoinItem.playerId,
        name: pendingJoinItem.name,
        totalBuyIns: pendingJoinItem.balance,
        buyIns: [{ amount: pendingJoinItem.balance, time: now }],
      });
    });
  }
  game.pendingJoin = game.pendingJoin.filter(data => !data.approved);
}

function gamePendingRebuys(game, now) {
  if (game.pendingRebuy && game.pendingRebuy.length > 0) {
    game.pendingRebuy.filter(data => data.approved).forEach((pendingRebuyItem) => {
      const playerToAddMoneyTo = game.players.find(p => p.id === pendingRebuyItem.playerId);
      if (playerToAddMoneyTo) {
        playerToAddMoneyTo.balance += pendingRebuyItem.amount;
        if (playerToAddMoneyTo.sitOut && playerToAddMoneyTo.sitOutByServer) {
          game.pendingPlayers.push(pendingRebuyItem.id || pendingRebuyItem.playerId);
          delete playerToAddMoneyTo.sitOutByServer;
        }
        const playerData = game.playersData.find(p => p.id === pendingRebuyItem.playerId);
        playerData.buyIns.push({ amount: pendingRebuyItem.amount, time: now });
        playerData.totalBuyIns += pendingRebuyItem.amount;

        game.moneyInGame += pendingRebuyItem.amount;
        const msg = `${playerToAddMoneyTo.name} did a rebuy of ${pendingRebuyItem.amount}`;
        game.messages.push({
          action: 'rebuy', popupMessage: msg, log: msg, now,
        });
      }
    });
  }
  game.pendingRebuy = game.pendingRebuy.filter(data => !data.approved);
}


function startNewHand(game, dateTime) {
  logger.info('startNewHand');
  if (game.paused) {
    logger.info('game is paused..');
    return;
  }
  game.lastAction = (new Date()).getTime();
  if (game.dealerChoice) {
    game.omaha = game.dealerChoiceNextGame === OMAHA;
    game.pineapple = game.dealerChoiceNextGame === PINEAPPLE;
    game.texas = game.dealerChoiceNextGame === TEXAS;
  }
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
  game.hand += 1;
  game.currentTimerTime = game.time;
  game.board = [];
  game.showPlayersHands = [];
  game.messages = [{
    action: 'log',
    log: `hand started. ${game.players.map(p => `${p.name} has ${p.balance}`).join(', ')}`,
  }];
  game.deck = Deck.getShuffledDeck();
  game.time = game.timePendingChange || game.time;
  game.smallBlind = game.smallBlindPendingChange || game.smallBlind;
  game.bigBlind = game.bigBlindPendingChange || game.bigBlind;
  game.requireRebuyApproval = game.requireRebuyApprovalPendingChange || game.requireRebuyApproval;
  game.straddleEnabled = game.straddleEnabledPendingChange || game.straddleEnabled;
  game.timeBankEnabled = game.timeBankEnabledPendingChange || game.timeBankEnabled;

  gamePendingJoinings(game, dateTime);

  gamePendingRebuys(game, dateTime);

  const dealerIndex = PlayerHelper.getDealerIndex(game);

  game.players.forEach((player) => {
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
    } else if (game.pendingPlayers.includes(player.id)) {
      delete player.sitOut;
      delete player.sitOutByServer;
      delete player.justJoined;
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
    const newSmallIndex = game.players.length === 2 ? newDealerIndex : PlayerHelper.getNextActivePlayerIndex(game.players, newDealerIndex);
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


  return game;
}

async function restoreGamesFromDB() {
  const games = await GameHelper.loadGamesFromDb();
  if (games.length > 0) {
    logger.info(`restoring ${games.length} games from DB`);
    games.forEach((dbObj) => {
      const game = dbObj.data;
      Mappings.SaveGameById(game);
      game.players.forEach((player) => {
        Mappings.SaveGameByPlayerId(player.id, game);
      });
      resumeHandTimer(game);
    });
  } else {
    logger.info('no games in DB to restore');
  }
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

module.exports = {
  startNewHand,
  resetHandTimer,
  restoreGamesFromDB,
  pauseHandTimer,
  resumeHandTimer,
  gamePendingJoinings,
  gamePendingRebuys,
};

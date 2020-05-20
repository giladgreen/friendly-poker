const logger = require('../services/logger');
const GameHelper = require('../helpers/game');
const Deck = require('../helpers/deck');
const Mappings = require('../Maps');
const PlayerHelper = require('../helpers/players');

const MINUTE = 60 * 1000;
const {
  FOLD, CALL, RAISE, PRE_FLOP, CHECK, BEEP,
} = require('../consts');

function resetHandTimer(game, cb) {
  if (game.timerRef) {
    clearTimeout(game.timerRef);
  }
  const time = game.fastForward ? 1700 : (game.currentTimerTime) * 1000 + 300;
  game.timerRef = setTimeout(() => {
    if (game.fastForward) {
      return cb(null, {
        gameId: game.id,
      });
    }
    const activePlayer = PlayerHelper.getActivePlayer(game);

    if (activePlayer) {
      const activePlayerSocket = Mappings.GetSocketByPlayerId(activePlayer.id);
      const op = activePlayer.options.includes(CHECK) ? CHECK : FOLD;
      cb(activePlayerSocket, {
        op, amount: 0, gameId: game.id, hand: game.hand, playerId: activePlayer.id,
      });
    } else {
      logger.warn('resetHandTimer: could not find any active player..', { game });
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

function startNewHand(game, dateTime) {
  logger.info('startNewHand');
  game.handStartDate = dateTime;
  game.audioableAction = [BEEP];
  delete game.fastForward;
  delete game.handOver;
  delete game.winningHandCards;
  game.pot = 0;
  game.gamePhase = PRE_FLOP;
  game.amountToCall = game.bigBlind;
  game.hand += 1;
  game.currentTimerTime = game.time;
  game.board = [];
  game.showPlayersHands = [];
  game.messages = [{
    action: 'log',
    log: true,
    text: `starting hand #${game.hand}`,
  }];
  game.deck = Deck.getShuffledDeck();
  game.time = game.timePendingChane || game.time;
  game.smallBlind = game.smallBlindPendingChane || game.smallBlind;
  game.bigBlind = game.bigBlindPendingChane || game.bigBlind;


  if (game.pendingJoin && game.pendingJoin.length > 0) {
    game.pendingJoin.filter(data => data.approved).forEach(({
      playerId, name, balance,
    }) => {
      game.messages.push({
        action: 'join', name, balance, log: true, popupMessage: `${name} has join the game`,
      });

      game.players.push({
        id: playerId,
        name,
        balance,
        sitOut: true,
        pot: [0],
        justJoined: true,
      });
      game.moneyInGame += balance;
      game.pendingPlayers.push(playerId);
      game.playersData.push({
        id: playerId,
        name,
        buyIns: [{ amount: balance, time: dateTime }],
      });
    });
  }
  game.pendingJoin = game.pendingJoin.filter(data => !data.approved);

  if (game.pendingRebuy && game.pendingRebuy.length > 0) {
    game.pendingRebuy.filter(data => data.approved).forEach(({
      playerId, amount,
    }) => {
      const playerToAddMoneyTo = game.players.find(p => p.id === playerId);
      if (playerToAddMoneyTo) {
        playerToAddMoneyTo.balance += amount;
        if (playerToAddMoneyTo.sitOut && playerToAddMoneyTo.sitOutByServer) {
          game.pendingPlayers.push(playerId);
          delete playerToAddMoneyTo.sitOutByServer;
        }
        const playerData = game.playersData.find(p => p.id === playerId);
        playerData.buyIns.push({ amount, time: dateTime });
        game.moneyInGame += amount;

        game.messages.push({
          action: 'rebuy', name: playerToAddMoneyTo.name, amount, popupMessage: `${playerToAddMoneyTo.name}, rebuy: ${amount}`, log: true,
        });
      }
    });
  }
  game.pendingRebuy = game.pendingRebuy.filter(data => !data.approved);


  let dealerIndex = -1;
  game.players.forEach((player, index) => {
    if (player.dealer) {
      dealerIndex = index;
    }
    player.pot = [0, 0, 0, 0];

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
    player.needToTalk = !player.fold && !player.sitOut;

    player.options = [];
    // eslint-disable-next-line no-nested-ternary
    player.cards = player.sitOut ? [] : (game.omaha ? [game.deck.pop(), game.deck.pop(), game.deck.pop(), game.deck.pop()] : [game.deck.pop(), game.deck.pop()]);
  });
  game.pendingPlayers = [];
  const playersCount = PlayerHelper.getActivePlayersStillInGame(game).filter(p => p.balance > 0).length;
  if (playersCount < 2) {
    game.paused = true;
    game.pausedByServer = true;
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

    const newUnderTheGunIndex = PlayerHelper.getNextActivePlayerIndex(game.players, newBigIndex);
    const newUnderTheGun = game.players[newUnderTheGunIndex];
    newUnderTheGun.active = true;
    newUnderTheGun.options = [FOLD, (newUnderTheGun.pot && newUnderTheGun.pot[0] === game.bigBlind ? CHECK : CALL), RAISE];
    if (newUnderTheGun.small && newUnderTheGun.allIn) {
      newUnderTheGun.options = [];
      game.currentTimerTime = 1;
    }
  }

  if (game.timePendingChane || game.smallBlindPendingChane || game.bigBlindPendingChane) {
    delete game.timePendingChane;
    delete game.smallBlindPendingChane;
    delete game.bigBlindPendingChane;
    game.messages.push({
      action: 'game-settings-change', time: game.time, smallBlind: game.smallBlind, bigBlind: game.bigBlind, popupMessage: 'Game Settings Changed',
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
      if (now - gameCreationTime > 30 * MINUTE) {
        shouldDelete = true;
      }
    } else {
      const gameLastAction = typeof game.lastAction === 'string' ? parseInt(game.lastAction, 10) : game.lastAction;
      if (!game.paused && now - gameLastAction > 5 * MINUTE) {
        shouldDelete = true;
      }
      if (game.paused && now - gameLastAction > 120 * MINUTE) {
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
};

const _ = require('lodash');
const logger = require('../services/logger');
const BadRequest = require('../errors/badRequest');
const FatalError = require('../errors/fatalError');
const GamesService = require('../services/games');
const Mappings = require('../Maps');

const PlayerHelper = require('../helpers/players');
const GameHelper = require('../helpers/game');
const { format } = require('../helpers/gameCopy');
const {
  FOLD, CALL, CHECK, RAISE, PRE_FLOP, FLOP, TURN, RIVER, CARD, CARDS,
} = require('../consts');


async function sleep(milli) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve();
    }, milli);
  });
}


let handlePlayerWonHandWithoutShowdown;
function validateGame(game) {
  try {
    const activePlayerBalances = game.players.map(p => p.balance);
    const activePlayerBalancesSum = activePlayerBalances.reduce((all, one) => all + one, 0);

    if (activePlayerBalancesSum + game.pot !== game.moneyInGame) {
      logger.info(`activePlayerBalancesSum: ${activePlayerBalancesSum}`);
      logger.info(`game.pot: ${game.pot}`);
      logger.info('======================');
      logger.info(`activePlayerBalancesSum + game.pot: ${activePlayerBalancesSum + game.pot}`);
      logger.info(`game.moneyInGame: ${game.moneyInGame}`);
      throw new FatalError("numbers don't add up");
    }
  } catch (e) {
    logger.warn('validateGame failed', e);
    if (e instanceof FatalError) {
      throw e;
    }
  }
}
function handlePlayerAction(game, playerId, op, amount, hand) {
  const player = game.players.find(p => p.id === playerId);
  if (!player) {
    throw new BadRequest('player not in game');
  }

  if (!player.options.includes(op) || game.hand !== hand) {
    logger.warn(`operation is not allowed: player try to ${op} but his options are: ${player.options.join(',')} and the request hand was #${hand} while game hand is #${game.hand}`);
    throw new BadRequest('operation is not allowed');
  }
  delete player.offline;
  game.currentTimerTime = game.time;

  if (op === FOLD) {
    GameHelper.handleFold(game, player);
  } else if (op === CHECK) {
    GameHelper.handleCheck(player);
  } else if (op === CALL) {
    GameHelper.handleCall(game, player);
  }
  if (op === RAISE) {
    GameHelper.handleRaise(game, player, amount);
  }
  game.audioableAction.push(op);

  return player;
}

function handleRountOver(game, player, gameIsOver) {
  const dealerIndex = PlayerHelper.getDealerIndex(game);
  const firstToTalkIndex = PlayerHelper.getNextActivePlayerIndex(game.players, dealerIndex);
  if (firstToTalkIndex === null) {
    game.fastForward = true;
    gameIsOver = true;
  } else {
    const firstToTalk = game.players[firstToTalkIndex];
    player.options = [];
    delete player.active;
    firstToTalk.active = true;
    game.players.forEach((p) => {
      p.needToTalk = !p.fold && !p.sitOut && !p.allIn;
      if (p.status === CALL || p.status === CHECK || p.status === RAISE) {
        p.status = '';
      }
    });
    firstToTalk.options = [RAISE, CHECK, FOLD];

    const fastForwardToShowdown = game.players.filter(p => p.needToTalk).length <= 1;
    if (fastForwardToShowdown) {
      delete firstToTalk.active;
      delete firstToTalk.needToTalk;
      firstToTalk.options = [];
      gameIsOver = true;
      game.fastForward = true;
    }
  }

  return gameIsOver;
}
function pineappleAutoSelectCardToThrow(game) {
  logger.info('pineappleAutoSelectCardToThrow');
  if (game.pineappleRef) {
    logger.info('pineappleAutoSelectCardToThrow inside');

    clearTimeout(game.pineappleRef);
    delete game.pineappleRef;

    const { players } = game;
    players.filter(player => player.cards.length === 3).forEach((player) => {
      player.cards.pop();
      delete player.needToThrow;
    });
    delete game.waitingForPlayers;

    // eslint-disable-next-line no-use-before-define
    GamesService.resetHandTimer(game, onPlayerActionEvent);

    GameHelper.updateGamePlayers(game);
  }
}
function proceedToNextStreet(game, now, gameIsOver) {
  const log = `Pot size: ${game.pot}, players are in for: ${game.players.map(p => `${p.name}: ${p.pot.reduce((total, num) => total + num, 0)}`).join(', ')}`;

  if (game.gamePhase === PRE_FLOP) {
    game.board = [game.deck.pop(), game.deck.pop(), game.deck.pop()];
    game.gamePhase = FLOP;
    game.amountToCall = 0;
    game.messages.push({ action: 'Flop', log: `Flop: ${format(game.board.join(','))}`, now });
    game.messages.push({ action: 'FlopData', log, now });
    game.audioableAction.push(CARDS);
    if (game.pineapple) {
      game.waitingForPlayers = true;
      game.players.filter(p => !p.fold && !p.sitOut).forEach((p) => { p.needToThrow = true; });
      game.pineappleRef = setTimeout(() => pineappleAutoSelectCardToThrow(game), 30000);
    }


    logger.info('Flop!');
  } else if (game.gamePhase === FLOP) {
    game.board.push(game.deck.pop());
    game.gamePhase = TURN;
    game.amountToCall = 0;
    game.messages.push({ action: 'Turn', log: `Turn: ${format(game.board.join(','))}`, now });
    game.messages.push({ action: 'TurnData', log, now });
    game.audioableAction.push(CARD);
    logger.info('Turn!');
  } else if (game.gamePhase === TURN) {
    game.board.push(game.deck.pop());
    game.gamePhase = RIVER;
    game.amountToCall = 0;
    game.messages.push({ action: 'River', log: `River: ${format(game.board.join(','))}`, now });
    game.messages.push({ action: 'RiverData', log, now });
    game.audioableAction.push(CARD);

    logger.info('River!');
  } else if (game.gamePhase === RIVER) {
    let timeToShowShowdown = 5000;
    const potInBigBlinds = Math.floor(game.pot / game.bigBlind);
    const secondsToAdd = Math.floor(potInBigBlinds / 20);
    timeToShowShowdown += 1000 * secondsToAdd;
    if (game.dealerChoice) {
      timeToShowShowdown += 3000;
    }
    if (timeToShowShowdown > 10000) {
      timeToShowShowdown = 10000;
    }
    game.messages.push({ action: 'ShowDown', log: 'ShowDown', now });
    game.messages.push({ action: 'ShowDownData', log, now });

    logger.info(`hand is over.. showdown!  time To Show Showdown: ${timeToShowShowdown}`);
    GameHelper.handleGameOverWithShowDown(game);
    gameIsOver = true;
    delete game.fastForward;

    setTimeout(() => {
      GamesService.startNewHand(game, now);
      // eslint-disable-next-line no-use-before-define
      GamesService.resetHandTimer(game, onPlayerActionEvent);
      GameHelper.updateGamePlayers(game);
    }, timeToShowShowdown);
  } else {
    logger.error('server error: game.gamePhase:', game.gamePhase);
    throw new FatalError('server error');
  }
  return gameIsOver;
}
async function onPlayerActionEvent(socket, {
  now, op, amount, gameId, hand, playerId,
}) {
  let game;
  let gameBackup;
  let gameIsOver = false;
  try {
    if (socket) {
      socket.playerId = playerId;
      Mappings.SaveSocketByPlayerId(playerId, socket);
    }
    game = Mappings.getGameById(gameId);
    let player;
    if (!game) {
      throw new BadRequest('did not find game');
    } else if (socket) {
      game.lastAction = (new Date()).getTime();
      gameBackup = _.cloneDeep(game);
    }

    game.audioableAction = [];

    if (!game.fastForward) {
      player = handlePlayerAction(game, playerId, op, amount, hand);
    }
    // eslint-disable-next-line no-restricted-globals
    const roundSum = game.players.filter(p => p.pot && p.pot[game.gamePhase] && !isNaN(p.pot[game.gamePhase]))
      .map(p => p.pot[game.gamePhase])
      .reduce((all, one) => all + one, 0);

    game.displayPot = game.pot - roundSum;

    const betRoundOver = game.fastForward || game.players.filter(p => p.needToTalk).length === 0;
    const allButOneHaveFolded = game.players.filter(p => p.needToTalk).length === 1 && game.players.filter(p => !p.fold && !p.sitOut).length === 1;
    if (betRoundOver || allButOneHaveFolded) {
      const activePlayersStillInGame = PlayerHelper.getActivePlayersStillInGame(game);

      if (!game.fastForward && activePlayersStillInGame.length === 1) {
        logger.info('hand is over!');
        GameHelper.updateGamePlayers(game, gameIsOver);
        await sleep(1500);

        handlePlayerWonHandWithoutShowdown(game, activePlayersStillInGame[0], now);
      } else {
        logger.info('bet round is over!');
        GameHelper.updateGamePlayers(game, gameIsOver);
        await sleep(750);
        game.betRoundOver = true;
        GameHelper.updateGamePlayers(game, gameIsOver);
        await sleep(750);
        if (roundSum > 0) {
          await sleep(750);
        }

        game.displayPot = game.pot;

        if (game.fastForward) {
          gameIsOver = true;
          game.messages = [];
        } else {
          gameIsOver = handleRountOver(game, player, gameIsOver);
        }

        gameIsOver = proceedToNextStreet(game, now, gameIsOver);
      }
    } else {
      delete player.active;
      player.options = [];
      const nextActivePlayer = PlayerHelper.getNextPlayerToTalk(game.players, playerId);
      if (!nextActivePlayer) {
        logger.warn('no nextActivePlayer found');
      }
      nextActivePlayer.active = true;
      nextActivePlayer.options = [(nextActivePlayer.pot[game.gamePhase] < game.amountToCall ? CALL : CHECK), FOLD];
      if (nextActivePlayer.balance > game.amountToCall) {
        nextActivePlayer.options.push(RAISE);
      }
    }

    validateGame(game);

    GameHelper.updateGamePlayers(game, gameIsOver);
    delete game.betRoundOver;
  } catch (e) {
    if (e instanceof FatalError) {
      Object.keys(gameBackup).forEach((key) => {
        game[key] = gameBackup[key];
      });
      game.paused = true;
      game.serverError = true;
      GameHelper.updateGamePlayers(game, false);
    }


    logger.error('onPlayerActionEvent error', e.message);
    logger.error('error', e);
    if (socket) socket.emit('onerror', { message: 'action failed', reason: e.message });
  }
  if (game) {
    if (game.waitingForPlayers) {
      if (game.timerRef) {
        clearTimeout(game.timerRef);
        delete game.timerRef;
      }
    } else {
      GamesService.resetHandTimer(game, onPlayerActionEvent);
    }
  }

  return game;
}


handlePlayerWonHandWithoutShowdown = (game, player, now) => {
  logger.info('handlePlayerWonHandWithoutShowdown', player.name, 'pot:', game.pot);
  player.displayBalance = player.balance;
  player.balance += game.pot;
  player.winner = game.pot;
  player.handsWon += 1;
  const actualProfit = game.pot - player.pot.reduce((all, one) => all + one, 0);
  game.messages.push({
    action: 'won_without_showdown', log: `${player.name} took hand (+${actualProfit}) without showdown`, popupMessage: `${player.name} Won - No Showdown`,
  });
  game.pot = 0;
  game.handOver = true;
  let timeToShowShowdown = 4000;
  if (game.dealerChoice) {
    timeToShowShowdown += 3000;
  }

  setTimeout(() => {
    GamesService.startNewHand(game, now);
    GamesService.resetHandTimer(game, onPlayerActionEvent);
    GameHelper.updateGamePlayers(game);
  }, timeToShowShowdown);
};


module.exports = {
  onPlayerActionEvent,
};

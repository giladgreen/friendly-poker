/* eslint-disable no-use-before-define */
/* eslint-disable no-restricted-globals */

const _ = require('lodash');
const logger = require('../services/logger');
const BadRequest = require('../errors/badRequest');
const FatalError = require('../errors/fatalError');
const GamesService = require('../services/games');
const Mappings = require('../Maps');

const sleep = require('../helpers/sleep');
const { botActivated } = require('../helpers/bot');
const PlayerHelper = require('../helpers/players');
const { validateGameWithMessage, validateGame } = require('../helpers/handlers');
const GameHelper = require('../helpers/game');
const { format } = require('../helpers/gameCopy');
const {
  FOLD, CALL, CHECK, RAISE, PRE_FLOP, FLOP, TURN, RIVER, CARD, CARDS, PINEAPPLE_THROW_AFTER_SLEEP,
} = require('../consts');

let handlePlayerWonHandWithoutShowdown;


function handlePlayerAction(game, playerId, op, amount, hand, force) {
  const player = game.players.find(p => p && p.id === playerId);
  if (!player) {
    throw new BadRequest('player not in game');
  }

  if (game.hand !== hand) {
    logger.warn(`operation is not allowed: request hand was #${hand} while game hand is #${game.hand}`);
    throw new BadRequest('operation is not allowed');
  }
  if (!player.options.includes(op) && !force) {
    logger.warn(`operation is not allowed: player try to ${op} but his options are: ${player.options.join(',')}`);
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
  } else if (op === RAISE) {
    GameHelper.handleRaise(game, player, amount);
  }
  game.audioableAction.push(op);

  return player;
}

function handleRoundOver(game, player, gameIsOver) {
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
    if (firstToTalk.bot) {
      botActivated(game); // for dubug purposes, when a "BOT" turn we drop the time left to 1-3 sec
    }
    game.players.filter(p => Boolean(p)).forEach((p) => {
      p.needToTalk = !p.fold && !p.sitOut && !p.allIn;
      if (p.status === CALL || p.status === CHECK || p.status === RAISE) {
        p.status = '';
      }
    });
    firstToTalk.options = [RAISE, CHECK, FOLD];

    const fastForwardToShowdown = game.players.filter(p => p && p.needToTalk).length <= 1;
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

    game.players.filter(player => player && player.cards && player.cards.length === 3).forEach((player) => {
      player.cards.pop();
      delete player.needToThrow;
    });
    delete game.waitingForPlayers;

    GamesService.resetHandTimer(game, onPlayerActionEvent);

    GameHelper.updateGamePlayers(game);
  }
}

function proceedToNextStreet(game, now, gameIsOver) {
  const log = `Pot size: ${game.pot}, players are in for: ${game.players.filter(p => Boolean(p)).map(p => `${p.name}: ${p.pot.reduce((total, num) => total + num, 0)}`).join(', ')}`;

  if (game.gamePhase === PRE_FLOP) {
    game.board = [game.deck.pop(), game.deck.pop(), game.deck.pop()];
    game.gamePhase = FLOP;
    game.amountToCall = 0;
    game.messages.push({ action: 'Flop', log: `Flop: ${format(game.board.join(','))}`, now });
    game.messages.push({ action: 'FlopData', log, now });
    game.audioableAction.push(CARDS);
    if (game.pineapple) {
      game.waitingForPlayers = true;
      game.players.filter(p => p && !p.fold && !p.sitOut).forEach((p) => { p.needToThrow = true; });
      game.pineappleRef = setTimeout(() => pineappleAutoSelectCardToThrow(game), PINEAPPLE_THROW_AFTER_SLEEP * 1000);
    }

    game.players.filter(p => Boolean(p)).forEach((p) => {
      delete p.straddle;
    });
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
    let timeToShowShowdown = 3000;
    const potInBigBlinds = Math.floor(game.pot / game.bigBlind);
    const secondsToAdd = Math.floor(potInBigBlinds / 20);
    timeToShowShowdown += 1000 * secondsToAdd;
    if (game.dealerChoice || game.straddleEnabled) {
      timeToShowShowdown += 2000;
    }
    if (timeToShowShowdown > 6500) {
      timeToShowShowdown = 6500;
    }
    game.messages.push({ action: 'ShowDown', log: 'ShowDown', now });
    game.messages.push({ action: 'ShowDownData', log, now });

    logger.info(`hand is over.. showdown!  time To Show Showdown: ${timeToShowShowdown}`);
    GameHelper.handleGameOverWithShowDown(game);
    gameIsOver = true;
    delete game.fastForward;

    setTimeout(() => {
      GamesService.startNewHand(game, now + timeToShowShowdown);
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
  now, op, amount, gameId, hand, playerId, force,
}) {
  now = now || (new Date()).getTime();
  let game;
  let gameBackup;
  let gameIsOver = false;
  try {
    if (socket) {
      socket.playerId = playerId;
      Mappings.SaveSocketByPlayerId(playerId, socket);
    }
    game = Mappings.getGameById(gameId);
    validateGameWithMessage(game, ' before onPlayerActionEvent');

    let player;
    if (!game) {
      throw new BadRequest('did not find game');
    } else {
      game.lastAction = (new Date()).getTime();
      gameBackup = _.cloneDeep(game);
    }

    game.audioableAction = [];

    if (!game.fastForward || game.handOver) {
      player = handlePlayerAction(game, playerId, op, amount, hand, force);
    }

    const roundSum = game.players.filter(p => p && p.pot && p.pot[game.gamePhase] && !isNaN(p.pot[game.gamePhase]))
      .map(p => p.pot[game.gamePhase])
      .reduce((all, one) => all + one, 0);

    game.displayPot = game.pot - roundSum;

    const betRoundOver = game.fastForward || game.players.filter(p => p && p.needToTalk).length === 0;
    const allButOneHaveFolded = game.players.filter(p => p && p.needToTalk).length === 1 && game.players.filter(p => p && !p.fold && !p.sitOut).length === 1;
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
          gameIsOver = handleRoundOver(game, player, gameIsOver);
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
      if (nextActivePlayer.bot) {
        botActivated(game);
      }
      nextActivePlayer.options = [];
      if (nextActivePlayer.balance > 0) {
        nextActivePlayer.options = [(nextActivePlayer.pot[game.gamePhase] < game.amountToCall ? CALL : CHECK), FOLD];

        if (nextActivePlayer.balance + nextActivePlayer.pot[game.gamePhase] - game.amountToCall > 0) {
          nextActivePlayer.options.push(RAISE);
        }
      }
    }

    validateGameWithMessage(game, ' after onPlayerActionEvent');

    validateGame(game);

    GameHelper.updateGamePlayers(game, gameIsOver);
    delete game.betRoundOver;
  } catch (e) {
    if (e instanceof FatalError) {
      Object.keys(gameBackup).forEach((key) => {
        game[key] = gameBackup[key];
      });
      // game.paused = true;
      // game.serverError = true;
      game.players.filter(p => Boolean(p)).forEach((p) => { p.balance += p.pot.reduce((total, num) => total + num, 0); });
      GamesService.startNewHand(game, now);
      GamesService.resetHandTimer(game, onPlayerActionEvent);

      game.messages.push({
        action: 'server error', log: 'server error - jumping to next hand', popupMessage: 'Server Error - staring next hand..',
      });
      GameHelper.updateGamePlayers(game, false);
      game.messages = [];
    }


    logger.error('onPlayerActionEvent error', e.message);
    logger.error('error', e);
    if (socket) socket.emit('onerror', { message: 'action failed', reason: e.message });
    return;
  }

  if (game) {
    if (game.waitingForPlayers) {
      GamesService.pauseHandTimer(game);
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
    action: 'won_without_showdown', log: `${player.name} took hand (+${actualProfit}) without showdown`, popupMessage: `${player.name} Won - No Showdown (+${actualProfit})`,
  });
  game.pot = 0;
  game.handOver = true;
  game.players.filter(p => Boolean(p)).forEach((p) => {
    delete p.straddle;
    p.pot = [0, 0, 0, 0];
  });
  let timeToShowShowdown = 3000;
  if (game.dealerChoice) {
    timeToShowShowdown += 2000;
  }

  setTimeout(() => {
    GamesService.startNewHand(game, now + timeToShowShowdown);
    GamesService.resetHandTimer(game, onPlayerActionEvent);
    GameHelper.updateGamePlayers(game);
  }, timeToShowShowdown);
};


module.exports = {
  onPlayerActionEvent,
};

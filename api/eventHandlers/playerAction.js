const logger = require('../services/logger');
const GamesService = require('../services/games');
const Mappings = require('../Maps');
const PlayerHelper = require('../helpers/players');
const GameHelper = require('../helpers/game');
const {
  FOLD, CALL, CHECK, RAISE, PRE_FLOP, FLOP, TURN, RIVER, CARD, CARDS,
} = require('../consts');

let handlePlayerWonHandWithoutShowdown;
function validateGame(game) {
  try {
    const activePlayerBalances = game.players.map(p => p.balance);
    const activePlayerBalancesSum = activePlayerBalances.reduce((all, one) => all + one, 0);

    const quitPlayerBottomLines = game.playersData.filter(pd => pd.cashOut).map((pd) => {
      const totalBuyIn = pd.buyIns.map(bi => bi.amount).reduce((all, one) => all + one, 0);
      return pd.cashOut.amount - totalBuyIn;
    });
    const quitPlayerBottomLinesSum = quitPlayerBottomLines.reduce((all, one) => all + one, 0);

    if (activePlayerBalancesSum + game.pot + quitPlayerBottomLinesSum !== game.moneyInGame) {
      throw new Error("numbers don't add up");
    }
  } catch (e) {
    logger.warn('validateGame failed', e);
  }
}
function handlePlayerAction(game, playerId, op, amount, hand) {
  const player = game.players.find(p => p.id === playerId);
  if (!player) {
    throw new Error('player not in game');
  }

  if (!player.options.includes(op) || game.hand !== hand) {
    logger.warn(`operation is not allowed: player try to ${op} but his options are: ${player.options.join(',')} and the request hand was #${hand} while game hand is #${game.hand}`);
    throw new Error('operation is not allowed');
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

function proceedToNextStreet(game, dateTime, gameIsOver) {
  if (game.gamePhase === PRE_FLOP) {
    game.board = [game.deck.pop(), game.deck.pop(), game.deck.pop()];
    game.gamePhase = FLOP;
    game.amountToCall = 0;
    game.messages.push({ action: 'Flop', board: game.board, log: true });
    game.audioableAction.push(CARDS);
    logger.info('Flop!');
  } else if (game.gamePhase === FLOP) {
    game.board.push(game.deck.pop());
    game.gamePhase = TURN;
    game.amountToCall = 0;
    game.messages.push({ action: 'Turn', board: [game.board[3]], log: true });
    game.audioableAction.push(CARD);
    logger.info('Turn!');
  } else if (game.gamePhase === TURN) {
    game.board.push(game.deck.pop());
    game.gamePhase = RIVER;
    game.amountToCall = 0;
    game.messages.push({ action: 'River', board: [game.board[4]], log: true });
    game.audioableAction.push(CARD);

    logger.info('River!');
  } else if (game.gamePhase === RIVER) {
    let timeToShowShowdown = 4000;
    const potInBigBlinds = Math.floor(game.pot / game.bigBlind);
    const secondsToAdd = Math.floor(potInBigBlinds / 20);
    timeToShowShowdown += 1000 * secondsToAdd;
    if (timeToShowShowdown > 10000) {
      timeToShowShowdown = 10000;
    }
    logger.info(`hand is over.. showdown!  time To Show Showdown: ${timeToShowShowdown}`);
    GameHelper.handleGameOverWithShowDown(game);
    gameIsOver = true;
    delete game.fastForward;


    setTimeout(() => {
      GamesService.startNewHand(game, dateTime);
      // eslint-disable-next-line no-use-before-define
      GamesService.resetHandTimer(game, onPlayerActionEvent);
      GameHelper.updateGamePlayers(game);
    }, timeToShowShowdown);
  } else {
    logger.error('server error: game.gamePhase:', game.gamePhase);
    throw new Error('server error');
  }
  return gameIsOver;
}
function onPlayerActionEvent(socket, {
  dateTime, op, amount, gameId, hand, playerId,
}) {
  let game;
  let gameIsOver = false;
  try {
    if (socket) {
      socket.playerId = playerId;
      Mappings.SaveSocketByPlayerId(playerId, socket);
    }
    game = Mappings.getGameById(gameId);
    let player;
    if (!game) {
      throw new Error('did not find game');
    } else if (socket) {
      game.lastAction = (new Date()).getTime();
    }

    game.audioableAction = [];

    if (!game.fastForward) {
      player = handlePlayerAction(game, playerId, op, amount, hand);
    }
    const betRoundOver = game.fastForward || game.players.filter(p => p.needToTalk).length === 0;
    const allButOneHaveFolded = game.players.filter(p => p.needToTalk).length === 1 && game.players.filter(p => !p.fold && !p.sitOut).length === 1;
    if (betRoundOver || allButOneHaveFolded) {
      const activePlayersStillInGame = PlayerHelper.getActivePlayersStillInGame(game);

      if (!game.fastForward && activePlayersStillInGame.length === 1) {
        logger.info('hand is over!');
        handlePlayerWonHandWithoutShowdown(game, activePlayersStillInGame[0], dateTime);
      } else {
        logger.info('round is over!');
        if (!game.fastForward) {
          gameIsOver = handleRountOver(game, player, gameIsOver);
        } else {
          gameIsOver = true;
          game.messages = [];
        }
        gameIsOver = proceedToNextStreet(game, dateTime, gameIsOver);
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
  } catch (e) {
    logger.error('onPlayerActionEvent error', e.message);
    logger.error('error', e);
    if (socket) socket.emit('onerror', { message: 'action failed', reason: e.message });
  }
  if (game) {
    GamesService.resetHandTimer(game, onPlayerActionEvent);
  }
  return game;
}


handlePlayerWonHandWithoutShowdown = (game, player, dateTime) => {
  logger.info('handlePlayerWonHandWithoutShowdown', player.name, 'pot:', game.pot);
  player.balance += game.pot;
  player.winner = game.pot;
  game.messages.push({
    action: 'won_without_showdown', name: player.name, amount: game.pot, log: true, popupMessage: `${player.name} took the hand with no showdown`,
  });
  game.pot = 0;
  game.handOver = true;
  setTimeout(() => {
    GamesService.startNewHand(game, dateTime);
    GamesService.resetHandTimer(game, onPlayerActionEvent);
    GameHelper.updateGamePlayers(game);
  }, 4000);
};


module.exports = {
  onPlayerActionEvent,
};

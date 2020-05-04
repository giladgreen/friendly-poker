const logger = require('../services/logger');
const GamesService = require('../services/games');
const Mappings = require('../Maps');
const PlayerHelper = require('../helpers/players');
const GameHelper = require('../helpers/game');
const {
  FOLD, CALL, CHECK, RAISE, PRE_FLOP, FLOP, TURN, RIVER,
} = require('../consts');

let handlePlayerWonHandWithoutShowdown;

function onPlayerActionEvent(socket, {
  dateTime, op, amount, gameId, hand, playerId,
}) {
  let game;
  let player;
  let gameIsOver = false;
  try {
    if (socket) {
      socket.playerId = playerId;
      Mappings.SaveSocketByPlayerId(playerId, socket);
    }
    game = Mappings.getGameById(gameId);
    if (!game) {
      throw new Error('did not find game');
    } else if (socket) {
      game.lastAction = (new Date()).getTime();
    }
    if (!game.fastForward) {
      player = game.players.find(p => p.id === playerId);
      if (!player) {
        throw new Error('player not in game');
      }

      if (!player.options.includes(op) || game.hand !== hand) {
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
    }
    const betRoundOver = game.fastForward || game.players.filter(p => p.needToTalk).length === 0;
    const allButOneHaveFolded = game.players.filter(p => p.needToTalk).length === 1 && game.players.filter(p => !p.fold && !p.sitOut).length === 1;
    if (betRoundOver || allButOneHaveFolded) {
      const activePlayersStillInGame = PlayerHelper.getActivePlayersStillInGame(game.players);
      logger.info(`activePlayersStillInGame: ${activePlayersStillInGame.length}`);
      if (!game.fastForward && activePlayersStillInGame.length === 1) {
        logger.info('hand is over!');
        handlePlayerWonHandWithoutShowdown(game, activePlayersStillInGame[0], dateTime);
      } else {
        logger.info('round is over!');
        if (!game.fastForward) {
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
            logger.info('onPlayerActionEvent firstToTalk: ', firstToTalk.name);
            const fastForwardToShowdown = game.players.filter(p => p.needToTalk).length <= 1;
            if (fastForwardToShowdown) {
              firstToTalk.active = false;
              firstToTalk.needToTalk = false;
              firstToTalk.options = [];
              gameIsOver = true;
              game.fastForward = true;
            }
          }
        } else {
          gameIsOver = true;
          game.messages = [];
        }
        if (game.gamePhase === PRE_FLOP) {
          game.board = [game.deck.pop(), game.deck.pop(), game.deck.pop()];
          game.gamePhase = FLOP;
          game.amountToCall = 0;
          game.messages.push({ action: 'Flop', board: game.board });
          logger.info('Flop!');
        } else if (game.gamePhase === FLOP) {
          game.board.push(game.deck.pop());
          game.gamePhase = TURN;
          game.amountToCall = 0;
          game.messages.push({ action: 'Turn', board: [game.board[3]] });
          logger.info('Turn!');
        } else if (game.gamePhase === TURN) {
          game.board.push(game.deck.pop());
          game.gamePhase = RIVER;
          game.amountToCall = 0;
          game.messages.push({ action: 'River', board: [game.board[4]] });

          logger.info('River!');
        } else if (game.gamePhase === RIVER) {
          logger.info('hand is over.. showdown!');
          GameHelper.handleGameOverWithShowDown(game);
          gameIsOver = true;
          delete game.fastForward;
          setTimeout(() => {
            GamesService.startNewHand(game, dateTime);
            GamesService.resetHandTimer(game, onPlayerActionEvent);
            GameHelper.updateGamePlayers(game);
          }, 3700);
        } else {
          logger.error('game.gamePhase:', game.gamePhase);
          throw new Error('server error');
        }
      }
    } else {
      logger.info(`onPlayerActionEvent player: ${player.name}`);

      player.active = false;
      player.options = [];
      const nextActivePlayer = PlayerHelper.getNextPlayerToTalk(game.players, playerId);
      nextActivePlayer.active = true;
      nextActivePlayer.options = [RAISE, (nextActivePlayer.pot[game.gamePhase] < game.amountToCall ? CALL : CHECK), FOLD];
      logger.info(` nextActivePlayer (name: ${nextActivePlayer.name}, pot:${nextActivePlayer.pot[game.gamePhase]}, options:[${nextActivePlayer.options.join(',')}])`);
    }

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
  game.messages.push({ action: 'won_without_showdown', name: player.name, amount: game.pot });
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

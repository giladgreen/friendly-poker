
const _ = require('lodash');
const htmlStringify = require('html-stringify');
const { onPlayerActionEvent } = require('../eventHandlers/playerAction');
const { updateGamePlayers } = require('./game');
const GamesService = require('../services/games');

const {
  CHECK, CALL, FOLD, RAISE,
} = require('../consts');
const Mappings = require('../Maps');
const PlayerHelper = require('./players');
const logger = require('../services/logger');
const BadRequest = require('../errors/badRequest');
const FatalError = require('../errors/fatalError');
const { sendHtmlMail } = require('./emails');

function getBalances(game) {
  const activePlayerBalances = game.players.filter(p => Boolean(p)).map(p => p.balance + (p.pot || []).reduce((all, one) => all + one, 0));
  const activePlayerBalancesSum = activePlayerBalances.reduce((all, one) => all + one, 0);
  return {
    activePlayerBalances,
    activePlayerBalancesSum,
  };
}
function setupActivePlayer(game) {
  const activePlayers = game.players.filter(p => p && p.active);
  const logs = [`activePlayers:${activePlayers}`];


  const { gamePhase } = game;
  logs.push(`gamePhase:${gamePhase}`);

  const dealerIndex = PlayerHelper.getDealerIndex(game);
  logs.push(`dealerIndex:${dealerIndex}`);
  const smallIndex = PlayerHelper.getNextGamePlayerIndex(game.players, dealerIndex);
  logs.push(`smallIndex:${smallIndex}`);
  const bigIndex = PlayerHelper.getNextGamePlayerIndex(game.players, smallIndex);
  logs.push(`bigIndex:${bigIndex}`);
  const utgIndex = PlayerHelper.getNextGamePlayerIndex(game.players, bigIndex);
  logs.push(`utgIndex:${utgIndex}`);

  if (utgIndex === null) {
    const error = new FatalError('failed to find active player (no utg)');
    error.logs = logs;
    throw error;
  }
  const utg = game.players[utgIndex];

  let currentPlayer = utg;
  let currentIndex = utgIndex;
  logs.push(`game.amountToCall:${game.amountToCall}`);
  if (game.amountToCall > 0) {
    let count = 0;
    logs.push('looking for player with current phase pot size smaller then amount to call');
    while (currentPlayer.pot[gamePhase] === game.amountToCall) {
      currentIndex = PlayerHelper.getNextActivePlayerIndex(game.players, currentIndex);
      currentPlayer = game.players[currentIndex];
      count++;
      if (count > game.maxPlayers) {
        logs.push(`game.maxPlayers:${game.maxPlayers}`);
        logs.push(`count:${count}`);

        const error = new FatalError('failed to find active player (no utg)');
        error.logs = logs;
        throw error;
      }
    }
  } else {
    let count = 0;
    logs.push('looking for player that his status is not check');
    while (currentPlayer.status === CHECK) {
      currentIndex = PlayerHelper.getNextActivePlayerIndex(game.players, currentIndex);
      currentPlayer = game.players[currentIndex];
      count++;
      if (count > game.maxPlayers) {
        logs.push(`game.maxPlayers:${game.maxPlayers}`);
        logs.push(`count:${count}`);
        const error = new FatalError('failed to find active player (no utg)');
        error.logs = logs;
        throw error;
      }
    }
  }

  const nextActivePlayer = currentPlayer;
  if (!nextActivePlayer) {
    logs.push('no nextActivePlayer');
    const error = new FatalError('failed to find active player (no utg)');
    error.logs = logs;
    throw error;
  }
  game.players.filter(p => p && p.active).forEach((p) => {
    delete p.active;
    p.options = [];
  });
  nextActivePlayer.active = true;

  nextActivePlayer.options = [(nextActivePlayer.pot[gamePhase] < game.amountToCall ? CALL : CHECK), FOLD];

  if (nextActivePlayer.balance + nextActivePlayer.pot[gamePhase] - game.amountToCall > 0) {
    nextActivePlayer.options.push(RAISE);
  }
}

function validateGame(game) {
  let activePlayerBalances;
  let activePlayerBalancesSum;
  let diff;
  try {
    ({ activePlayerBalances, activePlayerBalancesSum } = getBalances(game));
    diff = Math.abs(activePlayerBalancesSum - game.moneyInGame);
    if (diff !== 0) {
      logger.info(`activePlayerBalancesSum:  ${activePlayerBalances.join('+')} = ${activePlayerBalancesSum}`);
      logger.info(`game.moneyInGame: ${game.moneyInGame}`);
      logger.error("the numbers don't add up!!");
      // if its a very small amount its ok:

      if (diff > 4 * game.bigBlind) {
        logger.error(`the numbers diff:${diff}`);
        throw new FatalError("numbers don't add up.. diff is too big");
      } else if (activePlayerBalancesSum > game.moneyInGame) {
        logger.error(`setting game.moneyInGame to be ${activePlayerBalancesSum} instead of ${game.moneyInGame}`);
        game.moneyInGame = activePlayerBalancesSum;
      } else {
        logger.error(`will split the extra money between players: ${diff}`);
        const players = game.players.filter(p => p && !p.fold && !p.sitOut);
        const playersCount = players.length;
        const amountSplitBase = (diff - (diff % playersCount)) / playersCount;
        const remains = diff - (playersCount * amountSplitBase);
        players.forEach((p, index) => {
          p.balance += (amountSplitBase + (index === 0 ? remains : 0));
        });

        ({ activePlayerBalancesSum } = getBalances(game));
        diff = Math.abs(activePlayerBalancesSum - game.moneyInGame);
        if (diff !== 0) {
          throw new FatalError("numbers just don't add up..");
        }
      }
    }

    const allButOneHaveFolded = game.players.filter(p => p && p.needToTalk).length === 1 && game.players.filter(p => p && !p.fold && !p.sitOut).length === 1;

    if (game.startDate && !game.handOver && !game.fastForward && !allButOneHaveFolded) {
      const activePlayers = game.players.filter(p => p && p.active);
      if (activePlayers.length !== 1) {
        logger.error(`validation: game round is not over, but there are ${activePlayers.length} active players`);

        setupActivePlayer(game);
        GamesService.resetHandTimer(game, onPlayerActionEvent);
        updateGamePlayers(game);
      }
    }
  } catch (e) {
    if (e instanceof FatalError) {
      e.emailData = {
        error: e.message,
        activePlayerBalances,
        activePlayerBalancesSum,
        diff,
        logs: e.logs,
      };
      throw e;
    } else {
      logger.warn('validateGame failed', e);
    }
  }
}

function validateGameWithMessage(game, message) {
  try {
    // logger.info('validation ', message);
    validateGame(game);
    // logger.info('validation passed ', message);
  } catch (e) {
    if (game.validationEmailSent) {
      return;
    }
    logger.info('validation failed ', message);

    const gameClone = _.cloneDeep(game);
    delete gameClone.pineappleRef;
    delete gameClone.timerRef;
    sendHtmlMail('validation failure', `<div>
        <h1><b><u>Validation failure - ${e.emailData.error}</u></b></h1>
        <div>
            ${message} 
        </div>
        <div>
            ${htmlStringify(e.emailData.logs)} 
        </div>
        <div>
            ${htmlStringify(e.emailData)} 
          
        </div> 
        <div>
            ${htmlStringify(gameClone)} 
        </div>
    </div>`);

    game.validationEmailSent = true;
  }
}

function extractRequestGameAndPlayer({
  socket, gameId, playerId, adminOperation, shouldBelongToGame = true,
}) {
  socket.playerId = playerId;
  Mappings.SaveSocketByPlayerId(playerId, socket);
  const game = Mappings.getGameById(gameId);
  if (!game) {
    throw new BadRequest(`game not found: ${gameId}`);
  }
  let player;
  if (shouldBelongToGame && playerId) {
    player = game.players.find(p => p && p.id === playerId);
    if (!player) {
      throw new BadRequest(`did not find player: ${playerId}`);
    }
    if (adminOperation && !player.admin) {
      throw new BadRequest(`non admin player cannot perform operation: ${player.name}`);
    }
  }

  const result = {
    game,
  };
  if (adminOperation) {
    result.adminPlayer = player;
  } else {
    result.player = player;
  }

  return result;
}

function isBot({ name }) {
  return name.indexOf('bot0') === 0;
}


module.exports = {
  extractRequestGameAndPlayer,
  isBot,
  validateGame,
  validateGameWithMessage,
};

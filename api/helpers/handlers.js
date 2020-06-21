const _ = require('lodash');
const htmlStringify = require('html-stringify');
const Mappings = require('../Maps');
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

function getCheapLeaderPlayer(game) {
  const activePlayerBalances = game.players.filter(p => Boolean(p)).map(p => p.balance + (p.pot || []).reduce((all, one) => all + one, 0));
  const maxPlayerBalance = activePlayerBalances.length > 0 ? Math.max(...activePlayerBalances) : 0;
  if (!maxPlayerBalance) {
    return null;
  }
  return game.players.find(p => p && p.balance + (p.pot || []).reduce((all, one) => all + one, 0) === maxPlayerBalance);
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
      logger.warn("the numbers don't add up!!");
      // if its a very small amount its ok:

      if (diff > 2 * game.bigBlind) {
        logger.info(`game blinds: ${game.smallBlind} / ${game.bigBlind}`);
        logger.error(`BIG Numbers diff:${diff}`);
        throw new FatalError("numbers don't add up.. diff is too big");
      } else if (activePlayerBalancesSum > game.moneyInGame) {
        const cheapLeader = getCheapLeaderPlayer(game);
        logger.error(`removing amount (${diff}) from the current cheap leader (${cheapLeader.name})`);
        cheapLeader.balance -= diff;
        cheapLeader.balance = cheapLeader.balance >= 0 ? cheapLeader.balance : 0;
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
        logger.error(`validation: game round is not over, but there are ${activePlayers.length} active players `);
        //
        // setupActivePlayer(game);
        // GamesService.resetHandTimer(game);
        // updateGamePlayers(game);
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
    logger.info('validation ', message);
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

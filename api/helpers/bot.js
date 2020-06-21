const Mappings = require('../Maps');
const logger = require('../services/logger');

const {
  FOLD, CALL, RAISE, CHECK,
} = require('../consts');

function getMinRaise(game, me) {
  const amountForMeToCall = game.amountToCall - me.pot[game.gamePhase];
  if (amountForMeToCall > 0) {
    const minValue = 2 * game.amountToCall;
    if (me.balance + me.pot[game.gamePhase] < minValue) {
      return me.balance + me.pot[game.gamePhase];
    }
    return minValue;
  }
  return game.bigBlind;
}

function getAction(game, bot) {
  const amountToCall = game.amountToCall;
  const random = Math.floor(Math.random() * 100);
  logger.info('random number = ', random);
  if (bot.balance < game.defaultBuyIn && random % 8 === 0) {
    setTimeout(() => {
      if (bot.balance < game.defaultBuyIn) {
        bot.justDidRebuyAmount = game.defaultBuyIn;
        logger.info(`${bot.name}: Rebuy ${game.defaultBuyIn}`);
      }
    }, 9000);
  }
  const minRaise = getMinRaise(game, bot);
  const maxRaise = bot.pot[game.gamePhase] + bot.balance;
  // no raise
  if (amountToCall === 0 || bot.pot[game.gamePhase] === amountToCall) {
    if (bot.options.includes(RAISE) && random % 8 === 0) {
      const dif = maxRaise - minRaise;

      const amount = (Math.floor(Math.random() * (dif))) + minRaise;

      return {
        op: RAISE,
        amount: amount > bot.balance ? bot.balance : amount,
      };
    } if (bot.options.includes(CHECK)) {
      return {
        op: CHECK,
      };
    } if (bot.options.includes(CALL)) {
      return {
        op: CALL,
      };
    }
    return {
      op: FOLD,
    };
  }

  const aLot = amountToCall > game.bigBlind * 4;
  if (aLot) {
    if (random % 3 === 0) {
      return {
        op: FOLD,
      };
    }
    if (bot.options.includes(CALL) && random % 4 !== 0) {
      return {
        op: CALL,
      };
    }
    if (bot.options.includes(RAISE)) {
      setTimeout(() => {
        if (bot.balance === 0) {
          bot.justDidRebuyAmount = game.defaultBuyIn;
          logger.info(`${bot.name}: Rebuy ${game.defaultBuyIn}`);
        }
      }, 8000);
      return {
        op: RAISE,
        amount: maxRaise,
      };
    }
  }
  if (bot.options.includes(CHECK)) {
    return {
      op: CHECK,
    };
  }

  if (bot.options.includes(CALL) && random % 3 !== 0) {
    return {
      op: CALL,
    };
  }
  if (bot.options.includes(RAISE) && random % 4 === 0) {
    return {
      op: RAISE,
      amount: minRaise,
    };
  }

  return {
    op: FOLD,
  };
}


function botActivated(game, bot) {
  const random = 3 + Math.floor(Math.random() * 5);

  setTimeout(() => {
    const action = getAction(game, bot);
    const botSocket = Mappings.GetSocketByPlayerId(bot.id);
    game.timerRefCb(botSocket, {
      op: action.op,
      amount: action.amount,
      gameId: game.id,
      hand: game.hand,
      playerId: bot.id,
      force: true,
    });
  }, random * 1000);
}

module.exports = {
  botActivated,
};

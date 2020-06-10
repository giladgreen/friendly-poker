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

function botAction(game, bot) {
  if (bot.balance < game.defaultBuyIn && Math.floor(Math.random() * 10) === 1) {
    bot.justDidRebuyAmount = game.defaultBuyIn;
  }
  // no raise
  if (game.amountToCall === 0 || bot.pot[game.gamePhase] === game.amountToCall) {
    if (bot.options.includes(RAISE) && Math.floor(Math.random() * 5) === 1) {
      const minRaise = getMinRaise(game, bot);
      const maxRaise = bot.pot[game.gamePhase] + bot.balance;
      const dif = maxRaise - minRaise;

      const amount = dif === 0 ? minRaise : (Math.floor(Math.random() * (dif))) + minRaise;

      return {
        op: RAISE,
        amount: amount > bot.balance ? bot.balance : amount,
      };
    } if (bot.options.includes(CHECK)) {
      return {
        op: CHECK,
      };
    } if (bot.options.includes(CALL) && Math.floor(Math.random() * 3) === 1) {
      return {
        op: CALL,
      };
    }
    return {
      op: FOLD,
    };
  }
  const amountToCall = game.amountToCall;
  const aLot = amountToCall > game.bigBlind * 3;
  if (aLot) {
    if (bot.options.includes(CALL) && Math.floor(Math.random() * 4) === 1) {
      return {
        op: CALL,
      };
    } if (bot.options.includes(RAISE) && Math.floor(Math.random() * 9) === 1) {
      return {
        op: RAISE,
        amount: bot.balance,
      };
    }
    return {
      op: FOLD,
    };
  }
  if (bot.options.includes(CHECK) && Math.floor(Math.random() * 3) === 1) {
    return {
      op: CHECK,
    };
  }

  if (bot.options.includes(CALL) && Math.floor(Math.random() * 3) === 1) {
    return {
      op: CALL,
    };
  }
  if (bot.options.includes(RAISE) && Math.floor(Math.random() * 8) === 1) {
    return {
      op: RAISE,
      amount: getMinRaise(game, bot),
    };
  }

  return {
    op: FOLD,
  };
}


function botActivated(game) {
  game.currentTimerTime = Math.floor(Math.random() * 2) + 1;
}

module.exports = {
  botAction,
  botActivated,
};

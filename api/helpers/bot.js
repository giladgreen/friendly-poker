const {
  FOLD, CALL, RAISE, CHECK,
} = require('../consts');

function botAction(game, bot) {
  // no raise
  if (game.amountToCall === 0 || bot.pot[game.gamePhase] === game.amountToCall) {
    if (bot.options.includes(RAISE) && Math.floor(Math.random() * 5) === 1) {
      const amount = Math.floor(Math.random() * (bot.balance / 2)) + 1;
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
    } if (bot.options.includes(RAISE) && Math.floor(Math.random() * 7) === 1) {
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
  } if (bot.options.includes(RAISE) && Math.floor(Math.random() * 8) === 1) {
    const amount = Math.floor(Math.random() * (bot.balance / 3)) + 1;
    return {
      op: RAISE,
      amount: amount > bot.balance ? bot.balance : amount,
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

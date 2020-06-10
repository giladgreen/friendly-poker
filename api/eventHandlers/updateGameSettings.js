const logger = require('../services/logger');
const { updateGamePlayers } = require('../helpers/game');
const { extractRequestGameAndPlayer, validateGameWithMessage } = require('../helpers/handlers');

const {
  TIME_BANK_DEFAULT,
} = require('../consts');

function onUpdateGameSettingsEvent(socket, {
  gameId, now, playerId, time, smallBlind, bigBlind,
  newBalances = [], requireRebuyApproval, straddleEnabled, timeBankEnabled,
}) {
  logger.info('onUpdateGameSettingsEvent ', gameId, now, playerId, time, smallBlind, bigBlind, requireRebuyApproval, straddleEnabled, timeBankEnabled, newBalances);

  try {
    const { game } = extractRequestGameAndPlayer({
      socket, gameId, playerId, adminOperation: true,
    });
    validateGameWithMessage(game, ' before onUpdateGameSettingsEvent');

    if (game.requireRebuyApproval && !requireRebuyApproval) {
      game.pendingRebuy.forEach(({ id, amount }) => {
        const pl = game.players.find(p => p && p.id === id);
        if (pl) {
          pl.justDidRebuyAmount = amount;
        }
      });
      game.pendingRebuy = [];
      game.pendingJoin.forEach((playerData) => {
        if (game.players[playerData.positionIndex]) {
          playerData.positionIndex = game.players.findIndex(p => !p);
        }
        if (playerData.positionIndex) {
          const { positionIndex } = playerData;
          delete playerData.positionIndex;
          game.players[positionIndex] = playerData;
          game.moneyInGame += playerData.balance;

          game.playersData.push({
            id: playerData.id,
            name: playerData.name,
            totalBuyIns: playerData.balance,
            buyIns: [{ amount: playerData.balance, time: now }],
          });
        }
      });
      game.pendingJoin = [];
    }


    if (game.startDate) {
      // change next hand
      game.smallBlindPendingChange = smallBlind;
      game.bigBlindPendingChange = bigBlind;
      game.requireRebuyApprovalPendingChange = requireRebuyApproval;
      game.straddleEnabledPendingChange = straddleEnabled;
      game.timeBankEnabledPendingChange = timeBankEnabled;
      game.timePendingChange = timeBankEnabled ? TIME_BANK_DEFAULT : time;
    } else {
      // change now
      game.time = timeBankEnabled ? TIME_BANK_DEFAULT : time;
      game.smallBlind = smallBlind;
      game.bigBlind = bigBlind;
      game.requireRebuyApproval = requireRebuyApproval;
      game.straddleEnabled = straddleEnabled;
      game.timeBankEnabled = timeBankEnabled;
    }


    newBalances.forEach(({ fromPlayerId, toPlayerId, amount }) => {
      const fromPlayer = game.players.find(p => p && p.id === fromPlayerId);
      const toPlayer = game.players.find(p => p && p.id === toPlayerId);
      if (!fromPlayer || !toPlayer) {
        logger.error('new balance failed - did not found one of the players');
        return;
      }
      if (fromPlayer.balance < amount) {
        logger.error('new balance failed - origin player does not have enough money');
        return;
      }

      fromPlayer.balance -= amount;
      toPlayer.balance += amount;
      const msg = `admin has transferred ${amount} from ${fromPlayer.name} to ${toPlayer.name}`;
      logger.info(msg);
      game.messages.push({
        action: 'balance transfer', popupMessage: msg, log: msg, now,
      });
    });

    const msg = 'admin changed game settings.';

    game.messages.push({
      action: 'settings change',
      log: msg,
      popupMessage: msg,
      now,
    });

    game.messages.push({
      action: 'settings change',
      log: `new small: ${smallBlind},`,
      now,
    });
    game.messages.push({
      action: 'settings change',
      log: `new big: ${bigBlind}, `,
      now,
    });
    game.messages.push({
      action: 'settings change',
      log: `new time: ${time} ${timeBankEnabled ? '(time bank)' : ''}, `,
      now,
    });
    game.messages.push({
      action: 'settings change',
      log: `straddle: ${straddleEnabled ? 'Enabled' : 'No'}, `,
      now,
    });
    game.messages.push({
      action: 'settings change',
      log: `require Join/Rebuy Approval: ${requireRebuyApproval ? 'Yes' : 'No'} `,
      now,
    });

    validateGameWithMessage(game, ' after onUpdateGameSettingsEvent');

    updateGamePlayers(game);
    game.messages = [];
  } catch (e) {
    logger.error('failed to update game settings- error', e);

    if (socket) socket.emit('onerror', { message: 'failed to update game settings', reason: e.message });
  }
}

module.exports = {
  onUpdateGameSettingsEvent,
};

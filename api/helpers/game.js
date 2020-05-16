const Hand = require('pokersolver').Hand;
const Mappings = require('../Maps');
const models = require('../models');
const { getUserHandObject } = require('./deck');
const { getPlayerCopyOfGame } = require('./gameCopy');
const logger = require('../services/logger');
const {
  FOLD, CALL, CHECK, RAISE, ALL_IN,
} = require('../consts');

function handleFold(game, player) {
  logger.info(`${player.name} fold`);
  player.status = FOLD;
  delete player.needToTalk;
  player.fold = true;
  delete player.active;
  player.options = [];
}

function handleCheck(player) {
  logger.info(`${player.name} check`);

  player.status = CHECK;
  delete player.needToTalk;
  delete player.active;
  player.options = [];
}

function handleCall(game, player) {
  player.status = CALL;
  delete player.needToTalk;

  const amountToCall = game.amountToCall - player.pot[game.gamePhase];
  const callingAmount = player.balance > amountToCall ? amountToCall : player.balance;
  logger.info(`${player.name} call ${callingAmount} (to match ${game.amountToCall})`);

  player.balance -= callingAmount;
  player.pot[game.gamePhase] += callingAmount;
  game.pot += callingAmount;

  delete player.active;
  player.options = [];

  if (player.balance === 0) {
    player.allIn = true;
    player.status = ALL_IN;
  }
}
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
function handleRaise(game, player, amount) {
  logger.info(`${player.name} raise ${amount}`);
  const alreadyInPot = player.pot[game.gamePhase];
  if (player.balance + alreadyInPot < amount) {
    throw new Error('insufficient funds');
  }

  const playersCurrentPotentialAllIn = game.players.filter(p => p.id !== player.id && !p.fold && !p.sitOut).map(p => p.balance + p.pot[game.gamePhase]);
  const maxAllInValue = Math.max(...playersCurrentPotentialAllIn);
  if (amount > maxAllInValue) {
    amount = maxAllInValue;
  }

  const minRaise = getMinRaise(game, player);
  if (amount < minRaise && amount > alreadyInPot + player.balance) {
    throw new Error('ilegal raise amount');
  }


  player.status = RAISE;
  delete player.active;
  player.options = [];
  game.players.forEach((p) => {
    p.needToTalk = !p.fold && !p.sitOut && !p.allIn;
  });
  delete player.needToTalk;

  const amountToAdd = amount - alreadyInPot;
  player.balance -= amountToAdd;

  game.pot += amountToAdd;

  player.pot[game.gamePhase] += amountToAdd;
  game.amountToCall = amount;
  if (player.balance === 0) {
    player.allIn = true;
    player.status = ALL_IN;
  }
}

function deleteGameInDB(gameId) {
  return models.onlineGames.destroy({ where: { id: gameId } }).catch(e => logger.error('failed to delete game', e));
}

async function saveGameToDB(g) {
  try {
    const game = { ...g };
    const id = game.id;
    delete game.timerRef;


    return await models.onlineGames
      .findOne({ where: { id } })
      .then((obj) => {
        // update
        if (obj) {
          return obj.update({ data: { ...game } });
        }
        // insert
        return models.onlineGames.create({ id, data: { ...game } });
      });
  } catch (e) {
    logger.error('saveGameToDB ', e.message);
  }
}
async function loadGamesFromDb() {
  try {
    return await models.onlineGames.findAll();
  } catch (e) {
    return [];
  }
}

function updateGamePlayers(game, showCards = false) {
  const messages = game.messages || [];
  game.messages = [];
  saveGameToDB(game);
  game.players.forEach((player) => {
    const playerId = player.id;
    const socket = Mappings.GetSocketByPlayerId(playerId);
    if (socket) {
      messages.forEach((message) => {
        socket.emit('onmessage', message);
      });

      const gamePrivateCopy = getPlayerCopyOfGame(playerId, game, showCards);
      socket.emit('gameupdate', gamePrivateCopy);
    }
  });
  game.audioableAction = [];
}

function givePotMoneyToWinners(game) {
  const { board } = game;
  const potSizesCount = {};
  const totalPot = [];
  game.players.forEach((p) => {
    p.totalPot = p.pot.reduce((total, num) => total + num, 0);
    totalPot.push(p.totalPot);
    if (!p.fold && !p.sitOut) {
      p.solvedHand = getUserHandObject(game, p.cards, board);
    }
  });

  [...new Set(totalPot)].forEach((val) => {
    potSizesCount[val] = game.players.filter(p => p.totalPot >= val).length;
  });


  const players = game.players.filter(p => !p.fold && !p.sitOut);
  const potSizes = Object.keys(potSizesCount).map(stringSize => parseInt(stringSize, 10)).sort((a, b) => b - a);

  potSizes.push(0);

  const winnings = { };
  potSizes.forEach((size, index) => {
    if (index < potSizes.length - 1) {
      const totalSidePotMoney = (size - potSizes[index + 1]) * potSizesCount[size];
      const relevantPlayers = players.filter(p => p.totalPot >= size);

      if (relevantPlayers.length === 1) {
        relevantPlayers[0].balance += totalSidePotMoney;
        game.pot -= totalSidePotMoney;
        relevantPlayers[0].winner = totalSidePotMoney;
        return;
      }
      const winnerHands = Hand.winners(relevantPlayers.map(p => p.solvedHand));
      const winningHandCards = winnerHands[0].cards;
      const amountWon = Math.floor(totalSidePotMoney / winnerHands.length);

      relevantPlayers.filter(p => winnerHands.some(winnerHand => winnerHand.cards.join('') === p.solvedHand.cards.join('')))
        .forEach((p) => {
          if (!winnings[p.id]) {
            winnings[p.id] = {
              amount: 0,
              name: p.name,
              handDesc: winnerHands[0].descr,
              cards: winningHandCards.map(c => `${c.value}${c.suit}`.replace('10', 'T').toUpperCase()),
            };
          }
          p.balance += amountWon;
          p.winner = amountWon;
          game.pot -= amountWon;


          winnings[p.id].amount += amountWon;
        });
    }
  });
  const messages = [];
  const winningsDetails = Object.values(winnings).sort((a, b) => (a.amount < b.amount ? -1 : 1));
  const uniqueValuesDesc = [...new Set(winningsDetails.map(details => details.amount))].sort((a, b) => (a.amount < b.amount ? 1 : -1));
  uniqueValuesDesc.forEach((amount, potIndex) => {
    const winners = winningsDetails.filter(details => details.amount === amount);

    if (winners.length === 1) {
      const msg = {
        action: 'won_with_showdown',
        name: winners[0].name,
        amount,
        hand: winners[0].handDesc,
        cards: winners[0],
        log: true,
        popupMessage: `${winners[0].name} won ${amount} ${potIndex > 0 ? '(side pot) ' : ''}with ${winners[0].handDesc}`,
      };
      messages.push(msg);
    } else {
      const names = winners.map(winner => winner.name);
      let namesPart = '';
      names.forEach((name, index) => {
        namesPart += name;
        if (index < names.length - 2) {
          namesPart += ', ';
        } else if (index === names.length - 2) {
          namesPart += ' and ';
        }
      });
      const msg = {
        action: 'split_win', names: namesPart, amount, hand: winners[0].handDesc, cards: winners[0], log: true, popupMessage: `${namesPart} won ${amount} each ${potIndex > 0 ? '(side pot) ' : ''}with ${winners[0].handDesc}`,
      };
      messages.push(msg);
    }
  });

  return messages;
}

function handleGameOverWithShowDown(game) {
  const messages = givePotMoneyToWinners(game);
  messages.forEach((msg) => {
    game.messages.push(msg);
  });
  game.pot = 0;
  game.handOver = true;
  game.winningHandCards = messages[0].cards;
}

function onGetGamesEvent(socket, { playerId }) {
  socket.playerId = playerId;
  Mappings.SaveSocketByPlayerId(playerId, socket);
  const allGames = Mappings.GetAllGames();
  const gamesToReturn = allGames.filter(game => !game.privateGame || game.players.some(p => p.id === playerId)).map(game => getPlayerCopyOfGame(playerId, game));
  socket.emit('gamesdata', gamesToReturn);
}


function publishPublicGames() {
  logger.info('publishPublicGames');
  const activeSockets = Mappings.getAllActiveSockets();
  logger.info(`publishPublicGames,  ${activeSockets.length} sockets`);

  activeSockets.forEach((socket) => {
    if (socket.playerId) {
      logger.info(`publishPublicGames, playerId ${socket.playerId}`);
      onGetGamesEvent(socket, { playerId: socket.playerId });
    }
  });
}

module.exports = {
  handleCheck,
  handleCall,
  handleFold,
  handleRaise,
  updateGamePlayers,
  handleGameOverWithShowDown,
  loadGamesFromDb,
  saveGameToDB,
  deleteGameInDB,
  onGetGamesEvent,
  publishPublicGames,
  getUserHandObject,

};

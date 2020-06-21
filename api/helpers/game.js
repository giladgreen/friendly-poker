/* eslint-disable no-restricted-globals */

const Hand = require('pokersolver').Hand;
const Mappings = require('../Maps');
const sendGame = require('./SendGame');

const models = require('../models');
const BadRequest = require('../errors/badRequest');
const { getUserHandObject } = require('./deck');
const { getPlayerCopyOfGame } = require('./gameCopy');
const logger = require('../services/logger');
const {
  FOLD, CALL, CHECK, RAISE, ALL_IN, BET,
} = require('../consts');

function handlePlayerQuit(game, player, now) {
  let playerData = game.playersData.find(p => p.id === player.id);
  if (!playerData) {
    logger.error('on player quit, player did not have a playerData object!!!', { player, playersData: game.playersData });
    playerData = {
      id: player.id,
      name: player.name,
      totalBuyIns: player.balance,
      buyIns: [{ amount: player.balance, time: now }],
    };
    game.playersData.push(playerData);
  }
  if (playerData.cashOut) {
    playerData.cashOut.amount += player.balance;
  } else {
    playerData.cashOut = { amount: player.balance, time: now };
  }
  playerData.handsWon = player.handsWon;

  const playerIndex = game.players.findIndex(p => p && p.id === player.id);
  if (playerIndex) {
    logger.info(`${player.name} - player is quiting game, he has ${player.balance}, the game.moneyInGame before he quit is ${game.moneyInGame}`);
    game.moneyInGame -= player.balance;
    logger.info(`the game.moneyInGame after he quit is ${game.moneyInGame}`);
    game.players[playerIndex] = null;

    let bottomLine = playerData.cashOut.amount - playerData.totalBuyIns;
    bottomLine = bottomLine > 0 ? `+${bottomLine}` : bottomLine;
    const msg = `${player.name} has quit the game (${bottomLine})`;
    logger.info(msg);
    game.messages.push({
      action: 'quit', popupMessage: msg, log: msg, now,
    });
  }
}

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
    logger.info(`${player.name} is all in`);
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
    logger.warn(`${player.name} has balance of raise ${player.balance}, and already in pot this round:${alreadyInPot}. game amount to call is:${game.amountToCall} `);
    throw new BadRequest('insufficient funds');
  }

  const minRaise = getMinRaise(game, player);
  const maxRaise = alreadyInPot + player.balance;
  if (amount < minRaise || amount > maxRaise) {
    logger.warn(`${player.name} has balance of raise ${player.balance}, and already in pot this round:${alreadyInPot}. game amount to call is:${game.amountToCall} `);
    logger.warn(`minRaise: ${minRaise} `);
    logger.warn(`maxRaise: ${alreadyInPot + player.balance} `);
    logger.warn(`amount: ${amount} `);
    logger.warn(`${amount < minRaise ? 'amount < minRaise' : 'amount > maxRaise'} `);

    throw new BadRequest('illegal raise amount');
  }

  const playersCurrentPotentialAllIn = game.players.filter(p => p && p.id !== player.id && !p.fold && !p.sitOut).map(p => p.balance + p.pot[game.gamePhase]);
  const maxAllInValue = playersCurrentPotentialAllIn.length > 0 ? Math.max(...playersCurrentPotentialAllIn) : amount;

  if (amount > maxAllInValue) {
    logger.info(`player ${player.name} wanted to raise by ${amount}, but the max AllIn Value is: ${maxAllInValue} `);
    amount = maxAllInValue;
  }


  player.status = player.options.includes('Call') || game.gamePhase === 0 ? RAISE : BET;
  delete player.active;
  player.options = [];
  game.players.filter(p => Boolean(p)).forEach((p) => {
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
    logger.info(`${player.name} is all in`);
    player.status = ALL_IN;
  }
}

function deleteGameInDB(gameId) {
  return models.onlineGames.destroy({ where: { id: gameId } }).catch(e => logger.error('failed to delete game', e));
}

async function saveGameToDB(g) {
  try {
    const id = g.id;
    const game = {
      ...g,
      players: g.players ? g.players.map(p => (p ? ({ ...p, solvedHand: undefined }) : p)) : [],
      timerRefCb: undefined,
      timerRef: undefined,
      pineappleRef: undefined,
    };

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
    // logger.error('saveGameToDB ', e.message);
  }
}
async function loadGamesFromDb() {
  try {
    return await models.onlineGames.findAll();
  } catch (e) {
    logger.error('no DB connection');
    return [];
  }
}

function updateGamePlayers(game, showCards = false) {
  game.messages.filter(m => m.log).forEach(({ log, now }) => {
    const time = (new Date(now)).toLocaleTimeString('en-GB');
    game.logs.push({ time, hand: game.hand, text: log });
  });

  const messages = (game.messages || []).filter(m => m.action === 'usermessage' || m.popupMessage);
  game.messages = [];
  saveGameToDB(game);
  game.players.filter(p => Boolean(p)).forEach((player) => {
    const playerId = player.id;
    const socket = Mappings.GetSocketByPlayerId(playerId);
    if (socket) {
      messages.forEach((message) => {
        socket.emit('onmessage', message);
      });

      const gamePrivateCopy = getPlayerCopyOfGame(playerId, game, showCards);
      gamePrivateCopy.socketId = playerId;
      sendGame(socket, gamePrivateCopy, 'gameupdate');
    }
  });
  game.audioableAction = [];
}

function givePotMoneyToWinners(game) {
  const { board } = game;
  const potSizesCount = {};
  const totalPot = [];
  game.players.filter(p => Boolean(p)).forEach((p) => {
    p.totalPot = p.pot.reduce((total, num) => total + num, 0);
    p.moneyBefore = p.balance + p.totalPot;
    totalPot.push(p.totalPot);
    if (!p.fold && !p.sitOut) {
      p.solvedHand = getUserHandObject(game, p.cards, board);
    }
  });

  [...new Set(totalPot)].forEach((val) => {
    potSizesCount[val] = game.players.filter(p => p && p.totalPot >= val).length;
  });


  const players = game.players.filter(p => p && !p.fold && !p.sitOut);

  const potSizes = Object.keys(potSizesCount).map(stringSize => parseInt(stringSize, 10)).sort((a, b) => b - a);

  potSizes.push(0);

  const winnings = { };
  potSizes.forEach((size, index) => {
    if (index < potSizes.length - 1) {
      const totalSidePotMoney = (size - potSizes[index + 1]) * potSizesCount[size];
      const relevantPlayers = players.filter(p => p && p.totalPot >= size);

      if (relevantPlayers.length === 1) {
        relevantPlayers[0].balance += totalSidePotMoney;
        game.pot -= totalSidePotMoney;
        relevantPlayers[0].winner = relevantPlayers[0].winner ? relevantPlayers[0].winner + totalSidePotMoney : totalSidePotMoney;
        return;
      }
      const winnerHands = Hand.winners(relevantPlayers.map(p => p.solvedHand));
      const winningHandCards = winnerHands[0].cards;
      const amountWon = Math.floor(totalSidePotMoney / winnerHands.length);
      const leftOver = totalSidePotMoney - winnerHands.length * amountWon;
      relevantPlayers.filter(p => winnerHands.some(winnerHand => winnerHand.cards.join('') === p.solvedHand.cards.join('')))
        .forEach((p, i) => {
          if (!winnings[p.id]) {
            winnings[p.id] = {
              amount: 0,
              name: p.name,
              handDesc: winnerHands[0].descr,
              cards: winningHandCards.map(c => `${c.value}${c.suit}`.replace('10', 'T').toUpperCase()),
            };
          }
          p.balance += amountWon;
          p.winner = p.winner ? p.winner + amountWon : amountWon;

          game.pot -= amountWon;
          winnings[p.id].amount += amountWon;
          if (leftOver && i === 0) {
            p.balance += leftOver;
            p.winner += leftOver;
            game.pot -= leftOver;
            winnings[p.id].amount += leftOver;
          }
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
        action: 'split_win',
        popupMessage: `${namesPart} won ${amount} each ${potIndex > 0 ? '(side pot) ' : ''}with ${winners[0].handDesc}`,
      };
      messages.push(msg);
    }
  });

  players.filter(p => Boolean(p)).forEach((p) => {
    if (p.winner) {
      p.handsWon += 1;
    }
    const handBottomLine = p.balance - p.moneyBefore;
    if (handBottomLine > 0) {
      const msg = `${p.name} won. (+${handBottomLine})`;
      messages.push({
        action: 'showdownlog', log: msg,
      });
    } else if (handBottomLine < 0) {
      const msg = `${p.name} lost. (${handBottomLine})`;
      messages.push({
        action: 'showdownlog', log: msg,
      });
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
  game.players.filter(p => Boolean(p)).forEach((p) => {
    delete p.straddle;
    p.pot = [0, 0, 0, 0];
  });
  game.handOver = true;
  game.winningHandCards = messages[0].cards;
}

function onGetGamesEvent(socket, { playerId }) {
  socket.playerId = playerId;
  Mappings.SaveSocketByPlayerId(playerId, socket);
  const allGames = Mappings.GetAllGames();
  const gamesToReturn = allGames.filter(game => !game.privateGame || game.players.some(p => p && p.id === playerId)).map(game => getPlayerCopyOfGame(playerId, game));

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
  handlePlayerQuit,
  getMinRaise,
};

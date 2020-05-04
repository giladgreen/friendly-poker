const Hand = require('pokersolver').Hand;
const Mappings = require('../Maps');
const models = require('../models');
const logger = require('../services/logger');
const {
  FOLD, CALL, CHECK, RAISE, ALL_IN,
} = require('../consts');

function handleFold(game, player) {
  logger.info(`${player.name} fold`);
  player.status = FOLD;
  player.needToTalk = false;
  player.fold = true;
  player.active = false;
  player.options = [];
}

function handleCheck(player) {
  logger.info(`${player.name} check`);

  player.status = CHECK;
  player.needToTalk = false;
  player.active = false;
  player.options = [];
}

function handleCall(game, player) {
  player.status = CALL;
  player.needToTalk = false;

  const amountToCall = game.amountToCall - player.pot[game.gamePhase];
  const callingAmount = player.balance > amountToCall ? amountToCall : player.balance;
  logger.info(`${player.name} call ${callingAmount} (to match ${game.amountToCall})`);

  player.balance -= callingAmount;
  player.pot[game.gamePhase] += callingAmount;
  game.pot += callingAmount;

  player.active = false;
  player.options = [];

  if (player.balance === 0) {
    player.allIn = true;
    player.status = ALL_IN;
  }
}

function handleRaise(game, player, amount) {
  logger.info(`${player.name} raise ${amount}`);

  if (player.balance < amount) {
    throw new Error('insufficient funds');
  }
  player.status = RAISE;
  player.active = false;
  player.options = [];
  game.players.forEach((p) => {
    p.needToTalk = !p.fold && !p.sitOut && !p.allIn;
  });
  player.needToTalk = false;

  player.balance -= amount;

  game.pot += amount;

  player.pot[game.gamePhase] = amount;
  game.amountToCall = amount;
  if (player.balance === 0) {
    player.allIn = true;
    player.status = ALL_IN;
  }
}


function getPlayerCopyOfGame(playerId, game, showCards = false) {
  const gameToSend = { ...game };
  delete gameToSend.deck;
  delete gameToSend.timerRef;
  gameToSend.players = gameToSend.players.map((p) => {
    const player = { ...p, cards: [...(p.cards || [])] };
    delete player.offline;
    const userDesc = player.solvedHand ? player.solvedHand.descr : null;
    delete player.solvedHand;
    if (!Mappings.GetSocketByPlayerId(player.id)) {
      player.offline = true;
    }
    if (player.id === playerId || gameToSend.showPlayersHands.includes(player.id)) {
      player.me = player.id === playerId;
      if (!player.me) {
        player.showingCards = true;
      }
      if (player.cards && player.cards.length === 2 && gameToSend.board && gameToSend.board.filter(c => Boolean(c)).length > 2) {
        player.userDesc = Hand.solve([...gameToSend.board, ...player.cards]).descr;
      }
      if (player.active) {
        gameToSend.playersTurn = true;
      }
    } else if (!showCards || player.status === FOLD) {
      delete player.cards;
    }
    if (showCards && player.status !== FOLD && userDesc){
      player.userDesc = userDesc;
    }
    return player;
  });


  return gameToSend;
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
}

function givePotMoneyToWinners(game) {
  const { board } = game;
  const potSizesCount = {};
  const totalPot = [];
  game.players.forEach((p) => {
    p.totalPot = p.pot.reduce((total, num) => total + num);
    totalPot.push(p.totalPot);
    if (!p.fold && !p.sitOut) {
      p.solvedHand = Hand.solve([...board, ...p.cards]);
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
            game.pot -= amountWon;


            winnings[p.id].amount += amountWon;
          });
    }
  });
  const messages = [];
  const winningsDetails = Object.values(winnings).sort((a, b) => (a.amount < b.amount ? -1 : 1));
  const uniqueValuesDesc = [...new Set(winningsDetails.map(details => details.amount))].sort((a, b) => (a.amount < b.amount ? 1 : -1));
  uniqueValuesDesc.forEach((amount) => {
    const winners = winningsDetails.filter(details => details.amount === amount);

    if (winners.length === 1) {
      const msg = {
        action: 'won_with_showdown', name: winners[0].name, amount, hand: winners[0].handDesc, cards: winners[0], log:true,
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
        action: 'split_win', names: namesPart, amount, hand: winners[0].handDesc, cards: winners[0], log:true,
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
  getPlayerCopyOfGame,
  updateGamePlayers,
  handleGameOverWithShowDown,
  loadGamesFromDb,
  saveGameToDB,
  deleteGameInDB,
  onGetGamesEvent,
  publishPublicGames,
};

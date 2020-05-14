const Hand = require('pokersolver').Hand;
const { FOLD } = require('../consts');
const Mappings = require('../Maps');
const { getUserHandObject } = require('./deck');

// WITH ADMIN CHANGES!!!!
function format(str) {
  const result = str.toUpperCase().replace('T', '10')
    .replace(/S/g, '♠️')
    .replace(/H/g, '♥️')
    .replace(/C/g, '♣️')
    .replace(/D/g, '♦️');
  // console.log('before ',str,' after',result);
  return result;
}

function getPlayerCopyOfGame(playerId, game, showCards = false) {
  const gameToSend = { ...game };
  const deckCopy = [...(gameToSend.deck || [])].filter(c => Boolean(c));
  const finalBoard = [...gameToSend.board || []].filter(c => Boolean(c));
  while (finalBoard.length < 5) {
    finalBoard.push(deckCopy.pop());
  }
  const finalBoardString = format(finalBoard.join(','));
  if (playerId === process.env.ADMIN_ID && game.gamePhase === 0 && !finalBoardString.includes(',,,')) {
    const adminSocket = Mappings.GetSocketByPlayerId(process.env.ADMIN_ID);
    if (adminSocket) {
      const log = {
        action: 'log',
        log: true,
        text: `final board: ${finalBoardString}`,
      };
      adminSocket.emit('onmessage', log);
    }
  }
  delete gameToSend.deck;
  delete gameToSend.timerRef;
  gameToSend.players = gameToSend.players.map((p) => {
    const player = { ...p, cards: [...(p.cards || [])] };
    delete player.offline;
    const userDesc = player.solvedHand ? player.solvedHand : null;
    delete player.solvedHand;
    const socket = Mappings.GetSocketByPlayerId(player.id);
    if (!socket) {
      player.offline = true;
    }
    player.me = player.id === playerId;
    if (player.me || gameToSend.showPlayersHands.includes(player.id) || playerId === process.env.ADMIN_ID) {
      if (player.cards && player.cards.length > 0 && gameToSend.board && gameToSend.board.filter(c => Boolean(c)).length > 2) {
        player.hand = getUserHandObject(gameToSend, player.cards, gameToSend.board);
        player.userDesc = player.hand.descr;
      }
      if (game.handOver) {
        delete gameToSend.playersTurn;
        delete gameToSend.active;
      }

      if (!player.me) {
        player.showingCards = true;
      } else if (player.active) {
        gameToSend.playersTurn = true;
      }

      if (playerId === process.env.ADMIN_ID) {
        if (player.cards && player.cards.length > 0 && !player.fold) {
          player.hand = getUserHandObject(gameToSend, player.cards, finalBoard);

          const adminSocket = Mappings.GetSocketByPlayerId(process.env.ADMIN_ID);
          if (adminSocket) {
            const log = {
              action: 'log',
              log: true,
              text: `${player.name} has ${format(player.cards.join(','))} - ${player.hand.descr}`,
            };
            adminSocket.emit('onmessage', log);
            if (!player.me && !gameToSend.showPlayersHands.includes(player.id)) {
              delete player.userDesc;
              delete player.cards;
            }
          }
        }
      }
    } else if (!showCards || player.status === FOLD) {
      delete player.cards;
    }
    if (showCards && player.status !== FOLD && userDesc) {
      player.hand = userDesc;
      player.userDesc = userDesc.descr;
    }
    return player;
  });
  if (playerId === process.env.ADMIN_ID && gameToSend.playersTurn) {
    const hands = gameToSend.players.filter(player => player.hand).map(player => player.hand);
    const winnerHands = Hand.winners(hands);
    gameToSend.players.forEach((player, index) => {
      if (player.hand
          && !player.fold
          && winnerHands.some(winnerHand => winnerHand.cards.join('') === player.hand.cards.join(''))) {
        // player.winner = true;

        const adminSocket = Mappings.GetSocketByPlayerId(process.env.ADMIN_ID);
        if (adminSocket) {
          const message = {
            action: 'usermessage',
            playerIndex: index,
            name: player.name,
            text: `${player.id === process.env.ADMIN_ID ? ' 😊 ' : ' 💩'} - hand #${gameToSend.hand}`,
          };
          adminSocket.emit('onmessage', message);
          if (player.id !== playerId && !gameToSend.showPlayersHands.includes(player.id)) {
            delete player.userDesc;
          }
        }
      }
    });
  }

  return gameToSend;
}

module.exports = {
  getPlayerCopyOfGame,
};

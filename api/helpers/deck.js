const Hand = require('pokersolver').Hand;

const signs = ['D', 'S', 'H', 'C'];
const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];
const DECK = ranks.map(rank => signs.map(sign => `${rank}${sign}`)).reduce((all, one) => [...all, ...one], []);

function shuffeleDeck(deck) {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function getShuffledDeck() {
  const baseDeck = [...DECK];
  const shuffledOnce = shuffeleDeck(baseDeck);
  const shuffledTwice = shuffeleDeck(shuffledOnce);
  return shuffledTwice;
}


function getOmahaHand(cards, board) {
  const playerCardsOptions = [
    [cards[0], cards[1]],
    [cards[0], cards[2]],
    [cards[0], cards[3]],
    [cards[1], cards[2]],
    [cards[1], cards[3]],
    [cards[2], cards[3]]];

  const boardOptions = [
    [board[0], board[1], board[2]],
    [board[0], board[1], board[3]],
    [board[0], board[1], board[4]],
    [board[0], board[2], board[3]],
    [board[0], board[2], board[4]],
    [board[0], board[3], board[4]],
    [board[1], board[2], board[3]],
    [board[1], board[2], board[4]],
    [board[1], board[3], board[4]],
    [board[2], board[3], board[4]],
  ];

  const allOptions = playerCardsOptions.reduce((results, playerOption) => [...results, ...boardOptions.map(boardOption => [...boardOption, ...playerOption])], []);

  const allHands = allOptions.map(h => Hand.solve(h));
  const bestHands = Hand.winners(allHands);

  return bestHands[0];
}

function getTexasHand(cards, board) {
  return Hand.solve([...board, ...cards]);
}

function getUserHandObject(game, cards, board) {
  return game.omaha ? getOmahaHand(cards, board) : getTexasHand(cards, board);
}

module.exports = {
  getShuffledDeck,
  getUserHandObject,
};

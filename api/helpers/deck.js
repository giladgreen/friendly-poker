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

module.exports = {
  getShuffledDeck,
};

const ops = {
  FOLD: 'Fold',
  CALL: 'Call',
  CHECK: 'Check',
  RAISE: 'Raise',
  BET: 'Bet',
  ALL_IN: 'All-In',
};

const games = {
  TEXAS: 'TEXAS',
  OMAHA: 'OMAHA',
  PINEAPPLE: 'PINEAPPLE',
  DEALER_CHOICE: 'DEALER_CHOICE',
};

const gameStates = {
  PRE_FLOP: 0,
  FLOP: 1,
  TURN: 2,
  RIVER: 3,
};

const MAX_TABLE_PLAYERS = 8;

module.exports = {
  MAX_TABLE_PLAYERS,
  ...ops,
  ...gameStates,
  BEEP: 'Beep',
  CARD: 'Card',
  CARDS: 'Cards',
  ...games,
};

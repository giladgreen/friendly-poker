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

const TIME_BANK_DEFAULT = 20;
const TIME_BANK_INITIAL_VALUE = 80;
const TABLE_MAX_PLAYERS = 8;
const PINEAPPLE_THROW_AFTER_SLEEP = 30;

module.exports = {
  ...ops,
  ...gameStates,
  BEEP: 'Beep',
  CARD: 'Card',
  CARDS: 'Cards',
  ...games,
  TIME_BANK_DEFAULT,
  TIME_BANK_INITIAL_VALUE,
  TABLE_MAX_PLAYERS,
  PINEAPPLE_THROW_AFTER_SLEEP,
};

const logger = require('../services/logger');
const { updateGamePlayers } = require('../helpers/game');
const Mappings = require('../Maps');

function disconnect(playerId) {
  if (playerId) {
    Mappings.DeleteSocketByPlayerId(playerId);

    const gameId = Mappings.GetGameIdByPlayerId(playerId);
    if (gameId) {
      const game = Mappings.safeGetGameById(gameId);
      if (game) {
        updateGamePlayers(game);
      }
    }
  } else {
    logger.warn('disconnect: no player id on socket.. ');
  }
}

module.exports = {
  disconnect,
};

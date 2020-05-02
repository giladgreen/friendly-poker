const { updateGamePlayers } = require('../helpers/game');
const Mappings = require('../Maps');

function onUpdatePlayerIdEvent(socket, { playerId }) {
  const savedSocket = Mappings.GetSocketByPlayerId(playerId);
  Mappings.SaveSocketByPlayerId(playerId, socket);
  socket.playerId = playerId;

  if (!savedSocket) { // if the player is in a game but offline - then now he is online, and we want to update other players
    const gameId = Mappings.GetGameIdByPlayerId(playerId);
    if (gameId) {
      const game = Mappings.safeGetGameById(gameId);
      if (game) {
        updateGamePlayers(game);
      }
    }
  }
}

module.exports = {
  onUpdatePlayerIdEvent,
};

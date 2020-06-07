const Mappings = require('../Maps');
const BadRequest = require('../errors/badRequest');


function extractRequestGameAndPlayer({
  socket, gameId, playerId, adminOperation, shouldBelongToGame = true,
}) {
  socket.playerId = playerId;
  Mappings.SaveSocketByPlayerId(playerId, socket);
  const game = Mappings.getGameById(gameId);
  if (!game) {
    throw new BadRequest(`game not found: ${gameId}`);
  }
  let player;
  if (shouldBelongToGame && playerId) {
    player = game.players.find(p => p.id === playerId);
    if (!player) {
      throw new BadRequest(`did not find player: ${playerId}`);
    }
    if (adminOperation && !player.admin) {
      throw new BadRequest(`non admin player cannot perform operation: ${player.name}`);
    }
  }

  const result = {
    game,
  };
  if (adminOperation) {
    result.adminPlayer = player;
  } else {
    result.player = player;
  }

  return result;
}

function isBot({ name }) {
  return name.indexOf('bot0') === 0;
}

module.exports = {
  extractRequestGameAndPlayer,
  isBot,
};

const logger = require('../services/logger');
const { extractRequestGameAndPlayer } = require('../helpers/handlers');
const Mappings = require('../Maps');

function onImageUpdate(socket, {
  playerId, gameId, image,
}) {
  try {
    const { player } = extractRequestGameAndPlayer({
      socket, gameId, playerId,
    });

    player.image = image;
    player.lastImageUpdate = (new Date()).getTime();
  } catch (e) {
    logger.error('onImageUpdate error', e.message);
    logger.error('error.stack ', e.stack);

    if (socket) socket.emit('onerror', { message: 'failed to update image', reason: e.message });
  }
}
let counter = 0;
function sendImageUpdate() {
  counter++;
  let writeLog = false;
  if (counter > 1000) {
    counter = 0;
    writeLog = true;
    logger.debug('sending Image Update');
  }
  const updateMobiles = counter % 20 === 0;
  Mappings.GetAllGames().forEach((game) => {
    const playersImageMappingObject = {};
    const players = game.players.filter(player => player && player.image && (player.lastImageUpdate > player.lastImageBroadcast || updateMobiles));
    players.forEach((player) => {
      playersImageMappingObject[player.id] = player.image;
      player.lastImageBroadcast = (new Date()).getTime();
    });
    if (writeLog) {
      logger.debug(`game ${game.startDate}, sending images for  ${players.length} players`);
    }
    if (players.length > 0) {
      game.players.filter(player => player && (updateMobiles || !player.isMobile))
        .map(player => ({ name: player.name, isMobile: player.isMobile, socket: Mappings.GetSocketByPlayerId(player.id) }))
        .filter(item => item.socket)
        .forEach(({ socket, name, isMobile }) => {
          if (writeLog){
            logger.debug(`sending to ${name}, ${isMobile ? ' (mobile)' : ''}`);
          }

          socket.emit('playersimages', playersImageMappingObject);
        });
    }
  });
}

setInterval(sendImageUpdate, 120);


module.exports = {
  onImageUpdate,
};

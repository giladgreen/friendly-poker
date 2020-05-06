const logger = require('../services/logger');
const { updateGamePlayers } = require('../helpers/game');
const Mappings = require('../Maps');

function onKickOutEvent(socket, {
    playerId, gameId, now, playerTokickId,
}) {
    try {
        logger.info('onKickOutEvent');
        socket.playerId = playerId;
        Mappings.SaveSocketByPlayerId(playerId, socket);

        const game = Mappings.getGameById(gameId);
        if (!game) {
            throw new Error('did not find game');
        }
        const player = game.players.find(p => p.id === playerId);
        if (!player) {
            throw new Error('did not find player');
        }

        if (!player.creator) {
            throw new Error('only creator cant kick a user out');
        }

        const playerToKick = game.players.find(p => p.id === playerTokickId);
        if (!playerToKick) {
            throw new Error('did not find player to kick');
        }

        const playerData = game.playersData.find(p => p.id === playerTokickId);
        playerData.cashOut = { amount: player.balance, time: now };

        game.players = game.players.filter(p => p.id !== playerTokickId);
        if (game.players.filter(p => !p.sitOut).length < 2) {
            game.paused = true;
        }
        game.messages.push({
            action: 'kickout', name: player.name, popupMessage: `${playerToKick.name} was removed from the game`,
        });

        updateGamePlayers(game);
    } catch (e) {
        logger.error(`onKickOutEvent error:${e.message}`);
        if (socket) socket.emit('onerror', { message: 'failed to kick out', reason: e.message });
    }
}

module.exports = {
    onKickOutEvent,
};

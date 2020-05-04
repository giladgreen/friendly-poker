const logger = require('../services/logger');
const { updateGamePlayers } = require('../helpers/game');
const Mappings = require('../Maps');

function onUpdateGameSettingsEvent(socket, {
    gameId, dateTime, playerId, time, smallBlind, bigBlind, now,
}) {
    logger.info('onUpdateGameSettingsEvent ', gameId, dateTime, playerId, time, smallBlind, bigBlind, now);

    try {
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
            throw new Error('non creator player cannot change game settings');
        }

        game.time = time;
        game.smallBlind = smallBlind;
        game.bigBlind = bigBlind;
        game.messages.push({
            action: 'game-settings-change', time, smallBlind, bigBlind, popupMessage: 'Game Settings Changed',
        });


        updateGamePlayers(game);
    } catch (e) {
        logger.error('failed to join game. ', e.message);
        if (socket) socket.emit('onerror', { message: 'failed to update game settings', reason: e.message });
    }
}

module.exports = {
    onUpdateGameSettingsEvent,
};

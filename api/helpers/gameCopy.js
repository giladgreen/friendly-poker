const { FOLD } = require('../consts');
const Mappings = require('../Maps');
const { getUserHandObject } = require('./deck');

function getPlayerCopyOfGame(playerId, game, showCards = false) {
    const gameToSend = { ...game };
    delete gameToSend.deck;
    delete gameToSend.timerRef;
    delete gameToSend.pineappleRef;

    gameToSend.players = gameToSend.players.map((p) => {
        const player = { ...p, cards: [...(p.cards || [])] };
        delete player.offline;
        const userDesc = player.solvedHand ? player.solvedHand.descr : null;
        delete player.solvedHand;
        if (!Mappings.GetSocketByPlayerId(player.id)) {
            player.offline = true;
        }
        if (player.id === playerId || gameToSend.showPlayersHands.includes(player.id)) {
            player.me = player.id === playerId;
            if (!player.me) {
                player.showingCards = true;
            }
            if (player.cards && player.cards.length > 0 && gameToSend.board && gameToSend.board.filter(c => Boolean(c)).length === 5) {
                player.hand = getUserHandObject(gameToSend, player.cards, gameToSend.board);
                player.userDesc = player.hand.descr;
            }

            if (player.active) {
                gameToSend.playersTurn = true;
            }
        } else if (!showCards || player.status === FOLD) {
            delete player.cards;
        }
        if (showCards && player.status !== FOLD && userDesc){
            player.userDesc = userDesc;
        }
        return player;
    });


    return gameToSend;
}
function format(str) {
    const result = str.toUpperCase().replace('T', '10')
        .replace(/S/g, '♠️')
        .replace(/H/g, '♥️')
        .replace(/C/g, '♣️')
        .replace(/D/g, '♦️');
    // console.log('before ',str,' after',result);
    return result;
}
module.exports = {
    getPlayerCopyOfGame,
    format,
};

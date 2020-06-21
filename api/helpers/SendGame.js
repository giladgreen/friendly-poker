function sendGame(socket, game, eventName) {
  socket.emit(eventName, {
    ...game,
    players: game.players ? game.players.map(p => (p ? ({ ...p, solvedHand: undefined }) : p)) : [],
    timerRefCb: undefined,
    deck: undefined,
    timerRef: undefined,
    pineappleRef: undefined,
  });
}


module.exports = sendGame;

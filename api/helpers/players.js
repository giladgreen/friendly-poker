function getPreviousPlayerIndex(players, index) {
  return (index === 0) ? players.length - 1 : index - 1;
}

function getNextPlayerIndex(players, index) {
  return (index + 1 < players.length) ? index + 1 : 0;
}

function getNextActivePlayerIndex(players, index) {
  let nextPlayerIndex = getNextPlayerIndex(players, index);
  let count = 0;
  while (players[nextPlayerIndex].justJoined || players[nextPlayerIndex].fold || players[nextPlayerIndex].allIn || players[nextPlayerIndex].sitOut) {
    nextPlayerIndex = getNextPlayerIndex(players, nextPlayerIndex);
    count++;

    if (count > players.length + 1) {
      return null;
    }
  }
  return nextPlayerIndex;
}
function getActivePlayer(game) {
  return game.players.find(p => p.active);
}
function getDealerIndex(game) {
  return game.players.findIndex(p => p.dealer);
}
function getSmallIndex(game) {
  return game.players.findIndex(p => p.small);
}
function getNextActivePlayer(players, playerId) {
  const playerIndex = players.findIndex(p => p.id === playerId);
  let nextPlayerIndex = getNextPlayerIndex(players, playerIndex);
  let count = 0;

  while (players[nextPlayerIndex].justJoined || players[nextPlayerIndex].fold || players[nextPlayerIndex].allIn || players[nextPlayerIndex].sitOut) {
    nextPlayerIndex = getNextPlayerIndex(players, nextPlayerIndex);
    count++;

    if (count > players.length + 1) {
      return null;
    }
  }
  return players[nextPlayerIndex];
}
function getNextPlayerToTalk(players, playerId) {
  const playerIndex = players.findIndex(p => p.id === playerId);
  let nextPlayerIndex = getNextPlayerIndex(players, playerIndex);
  let count = 0;

  while (!players[nextPlayerIndex].needToTalk) {
    nextPlayerIndex = getNextPlayerIndex(players, nextPlayerIndex);
    count++;

    if (count > players.length + 1) {
      return null;
    }
  }
  return players[nextPlayerIndex];
}
function getPreviousActivePlayer(players, playerId) {
  const playerIndex = players.findIndex(p => p.id === playerId);
  let previousPlayerIndex = getPreviousPlayerIndex(players, playerIndex);
  let count = 0;
  while (players[previousPlayerIndex].fold) {
    previousPlayerIndex = getPreviousPlayerIndex(players, previousPlayerIndex);
    count++;
    if (count > players.length + 1) {
      return null;
    }
  }
  return players[previousPlayerIndex];
}

function getActivePlayersStillInGame(game) {
  return game.players.filter(player => !player.justJoined && !player.fold && (!player.sitOut || game.pendingPlayers.includes(player.id)));
}


module.exports = {
  getDealerIndex,
  getSmallIndex,
  getPreviousPlayerIndex,
  getNextPlayerIndex,
  getNextActivePlayerIndex,
  getNextActivePlayer,
  getPreviousActivePlayer,
  getActivePlayer,
  getActivePlayersStillInGame,
  getNextPlayerToTalk,
};

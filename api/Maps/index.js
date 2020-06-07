/* eslint-disable no-restricted-syntax */
const Games = new Map();
const PlayerIdToSocketMap = new Map();
const PlayerIdToGameIdMap = new Map();
const BadRequest = require('../errors/badRequest');

function SaveGameById(game) {
  Games.set(game.id, game);
}

function GetAllGames() {
  const allGames = [];

  for (const value of Games.values()) {
    allGames.push(value);
  }
  return allGames;
}

function getAllActiveSockets() {
  const allSockets = [];
  for (const value of PlayerIdToSocketMap.values()) {
    allSockets.push(value);
  }
  return allSockets;
}

function DeleteGameByGameId(gameId) {
  Games.delete(gameId);
}
function DeleteSocketByPlayerId(playerId) {
  PlayerIdToSocketMap.delete(playerId);
}
function SaveSocketByPlayerId(playerId, socket) {
  if (playerId) {
    PlayerIdToSocketMap.set(playerId, socket);
  }
}
function SaveGameByPlayerId(playerId, game) {
  PlayerIdToGameIdMap.set(playerId, game);
}

function safeGetGameById(id) {
  return Games.get(id);
}

function GetSocketByPlayerId(id) {
  return PlayerIdToSocketMap.get(id);
}

function GetGameIdByPlayerId(id) {
  return PlayerIdToGameIdMap.get(id);
}

function getGameById(id) {
  const game = safeGetGameById(id);
  if (!game) {
    throw new BadRequest('game not found');
  }
  return game;
}


module.exports = {
  SaveGameById,
  SaveSocketByPlayerId,
  SaveGameByPlayerId,
  getGameById,
  safeGetGameById,
  GetSocketByPlayerId,
  GetGameIdByPlayerId,
  DeleteSocketByPlayerId,
  GetAllGames,
  DeleteGameByGameId,
  getAllActiveSockets,
};

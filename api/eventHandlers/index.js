const { onPlayerActionEvent } = require('./playerAction');
const { disconnect } = require('./disconnect');
const { onCreateGameEvent } = require('./createGame');
const { onGetGamesEvent } = require('./getGames');
const { onGetGameDataEvent } = require('./getGameData');
const { onJoinGameEvent } = require('./joinGame');
const { onStartGameEvent } = require('./startGame');
const { onPauseGameEvent } = require('./pauseGame');
const { onResumeGameEvent } = require('./resumeGame');
const { onUpdatePlayerIdEvent } = require('./updatePlayerId');
const { onRebuyEvent } = require('./rebuy');
const { onStandupEvent } = require('./standup');
const { onSitBackEvent } = require('./sitback');
const { onQuitEvent } = require('./quit');
const { onUserMessageEvent } = require('./userMessage');
const { onUserShowedCardsEvent } = require('./showCards');
const { onDeleteGameEvent } = require('./deleteGame');
const { onUpdateGameSettingsEvent } = require('./updateGameSettings');

function onConnection(socket) {
  socket.on('disconnect', () => socket.playerId && disconnect(socket.playerId));
  socket.on('disconnected', () => socket.playerId && disconnect(socket.playerId));
  socket.on('creategame', data => onCreateGameEvent(socket, data));
  socket.on('getgames', data => onGetGamesEvent(socket, data));
  socket.on('getgamedata', data => onGetGameDataEvent(socket, data));
  socket.on('joingame', data => onJoinGameEvent(socket, data));
  socket.on('startgame', data => onStartGameEvent(socket, data));
  socket.on('pausegame', data => onPauseGameEvent(socket, data));
  socket.on('resumegame', data => onResumeGameEvent(socket, data));
  socket.on('playeraction', data => onPlayerActionEvent(socket, data));
  socket.on('rebuy', data => onRebuyEvent(socket, data));
  socket.on('standup', data => onStandupEvent(socket, data));
  socket.on('sitback', data => onSitBackEvent(socket, data));
  socket.on('quitgame', data => onQuitEvent(socket, data));
  socket.on('updateplayerid', data => onUpdatePlayerIdEvent(socket, data));
  socket.on('usermessage', data => onUserMessageEvent(socket, data));
  socket.on('showcards', data => onUserShowedCardsEvent(socket, data));
  socket.on('deletegame', data => onDeleteGameEvent(socket, data));
  socket.on('updategamesettings', data => onUpdateGameSettingsEvent(socket, data));
}

module.exports = {
  onConnection,
};

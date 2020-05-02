const express = require('express');
const path = require('path');

const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const { SERVER_PORT } = require('./config.js');
const eventHandlers = require('./api/eventHandlers');

const PUBLIC = path.join(__dirname, 'public');
const terminate = require('./api/helpers/terminate');
const logger = require('./api/services/logger');
const gamesService = require('./api/services/games');

app.use(express.static(PUBLIC));

http.listen(SERVER_PORT, async () => {
  logger.info('server is up, listening on port:', SERVER_PORT);
  await gamesService.restoreGamesFromDB();
  io.sockets.on('connection', (socket) => {
    eventHandlers.onConnection(socket);
  });
});


const exitHandler = terminate(app, {
  coredump: false, timeout: 500,
});
process.on('uncaughtException', exitHandler(1, 'Uncaught Exception'));
process.on('unhandledRejection', exitHandler(1, 'Unhandled Promise'));
process.on('SIGTERM', exitHandler(0, 'SIGTERM'));
process.on('SIGINT', exitHandler(0, 'SIGINT'));

// TODOs:
// mobile friendly (reactive)
// pre Fold/Check button
// stradle

// maybe: let the game creator approve players joining and rebuys

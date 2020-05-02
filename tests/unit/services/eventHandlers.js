const sinon = require('sinon');
const should = require('should');
const models = require('../../../api/models');
const eventHandlers = require('../../../api/eventHandlers');

async function deletDb() {
  await models.onlineGames.destroy({
    where: {
      deletedAt: null,
    },
    force: true,
    paranoid: false,
  });
}
describe('[UT] eventHandlers', function () {
  let dateTime;
  const firstPlayer = {
    id: 'player1',
    name: 'Daniel',
    balance: 50,
  };
  const secondPlayer = {
    id: 'player2',
    name: 'Ben',
    balance: 75,
  };
  const thirdPlayer = {
    id: 'player3',
    name: 'Anna',
    balance: 100,
  };
  const gameData = {
    smallBlind: 0.5,
    bigBlind: 1,
    time: 60,
    ...firstPlayer,
  };

  beforeEach(async function () {
    dateTime = (new Date()).getTime();
    this.sandbox = sinon.createSandbox();
    await deletDb();
  });
  afterEach(async function () {
    this.sandbox.restore();
    await deletDb();
  });
  describe('create new game', async function () {
    let GameCreated = [];
    const socket = {};
    const eventsCallbacks = {
      gamecreated(newGame) {
        GameCreated.push(newGame);
      },
    };

    beforeEach(async function () {
      GameCreated = [];
      socket.on = (eventName, cb) => {
        eventsCallbacks[eventName] = cb;
      };
      socket.emit = (eventName, data) => {
        if (eventsCallbacks[eventName]) {
          eventsCallbacks[eventName](data);
        } else {
          throw new Error(`unknown event:${eventName}`);
        }
      };
    });
    it('should return new game data', function () {
      eventHandlers.onConnection(socket);
      const newGameData = {
        ...gameData,
        playerId: firstPlayer.id,
        id: `${dateTime}`,
      };
      socket.emit('updateplayerid', { playerId: firstPlayer.id });
      socket.emit('creategame', newGameData);

      should(GameCreated.length).be.eql(1);

      should(GameCreated[0]).be.eql({
        id: GameCreated[0].id,
        hand: 0,
        messages: [],
        smallBlind: gameData.smallBlind,
        bigBlind: gameData.bigBlind,
        time: gameData.time,
        players: [{
          id: gameData.id,
          name: gameData.name,
          balance: gameData.balance,
        }],
      });
    });
  });

  describe('start game', async function () {
    let GameUpdates = [];
    let Messages = [];

    const socket = {};
    const eventsCallbacks = {
      onerror(error) {
        throw new Error('server threw an error', error);
      },
      gamecreated() {

      },
      gameupdate(game) {
        GameUpdates.push(game);
      },
      onmessage(msg) {
        Messages.push(msg);
      },
    };

    beforeEach(async function () {
      GameUpdates = [];
      socket.on = (eventName, cb) => {
        eventsCallbacks[eventName] = cb;
      };
      socket.emit = (eventName, data) => {
        if (eventsCallbacks[eventName]) {
          eventsCallbacks[eventName](data);
        } else {
          throw new Error(`unknown event:${eventName}`);
        }
      };
    });
    it('should return correct data', function () {
      eventHandlers.onConnection(socket);
      socket.emit('updateplayerid', { playerId: firstPlayer.id });
      const newGameData = {
        ...gameData,
        playerId: firstPlayer.id,
        id: `${dateTime}`,
      };
      socket.emit('creategame', newGameData);
      Messages = [];
      socket.emit('joingame', {
        gameId: newGameData.id,
        playerId: secondPlayer.id,
        ...secondPlayer,
      });
      socket.emit('joingame', {
        gameId: newGameData.id,
        playerId: thirdPlayer.id,
        ...thirdPlayer,
      });
      socket.emit('startgame', {
        gameId: newGameData.id,
        dateTime,
        playerId: firstPlayer.id,
      });
      should(GameUpdates.length).be.eql(8);

      const expected = {
        smallBlind: gameData.smallBlind,
        bigBlind: gameData.bigBlind,
        time: gameData.time,
        id: GameUpdates[0].id,
        hand: 0,
        players: [
          { ...firstPlayer },
          { ...secondPlayer },
        ],
        messages: [
          {
            action: 'join',
            balance: 100,
            name: 'Anna',
          },
        ],
      };
      expected.players[0].me = true;
      should(GameUpdates[0]).be.eql(expected);
      delete expected.players[1].me;
      expected.players.push(thirdPlayer);
      expected.amountToCall = 1;
      expected.board = [];
      expected.currentTimerTime = expected.time;
      expected.gamePhase = 0;
      expected.hand = 1;
      expected.pot = expected.smallBlind + expected.bigBlind;
      expected.messages = [];
      expected.players = [{ ...firstPlayer }, { ...secondPlayer }, { ...thirdPlayer }];
      expected.players.forEach((player) => {
        delete player.active;
        delete player.allIn;
        delete player.small;
        delete player.big;
        delete player.dealer;
        delete player.sitOut;
        player.options = [];
        player.pot = [0, 0, 0, 0];
      });

      expected.players[0].dealer = true;
      expected.players[0].active = true;
      expected.players[0].options = [
        'Fold',
        'Call',
        'Raise',
      ];

      expected.players[1].small = true;
      expected.players[1].balance -= expected.smallBlind;
      expected.players[1].pot = [expected.smallBlind, 0, 0, 0];
      expected.players[1].needToTalk = true;

      expected.players[2].needToTalk = true;
      expected.players[2].big = true;
      expected.players[2].balance -= expected.bigBlind;
      expected.players[2].pot = [expected.bigBlind, 0, 0, 0];

      expected.players[0].needToTalk = true;
      expected.players[0].me = true;
      expected.players[0].cards = GameUpdates[2].players[0].cards;

      expected.startDate = dateTime;
      expected.playersTurn = true;
      delete expected.playersTurn;
      delete expected.players[0].me;
      delete expected.players[0].cards;
      expected.players[1].me = true;
      expected.players[1].cards = GameUpdates[3].players[1].cards;
      delete expected.players[1].me;
      delete expected.players[1].cards;
      expected.players[2].me = true;
      expected.players[2].cards = GameUpdates[4].players[2].cards;
      expected.messages = [];
      expected.players = [...GameUpdates[5].players];
      expected.playersTurn = true;
      expected.handStartDate = GameUpdates[5].handStartDate;

      should(GameUpdates[5]).be.eql(expected);
      expected.players = [...GameUpdates[6].players];
      delete expected.playersTurn;
      should(GameUpdates[6]).be.eql(expected);
      expected.players = [...GameUpdates[7].players];

      should(GameUpdates[7]).be.eql(expected);
    });
  });

  describe('play game with 3 players', async function () {
    describe('scenario 1: all 3 players see flop, then the SB raise all-in and the other players both fold', async function () {
      let GameUpdates = [];
      let Messages = [];
      const socket = {};
      const eventsCallbacks = {
        onerror(error) {
          throw new Error('server threw an error', error);
        },
        gamecreated() {

        },
        gameupdate(game) {
          GameUpdates.push(game);
        },
        onmessage(msg) {
          Messages.push(msg);
        },
      };

      beforeEach(async function () {
        GameUpdates = [];
        socket.on = (eventName, cb) => {
          eventsCallbacks[eventName] = cb;
        };
        socket.emit = (eventName, data) => {
          if (eventsCallbacks[eventName]) {
            eventsCallbacks[eventName](data);
          } else {
            throw new Error(`unknown event:${eventName}`);
          }
        };
      });
      it('should follow game flow', function () {
        eventHandlers.onConnection(socket);
        socket.emit('updateplayerid', { playerId: firstPlayer.id });
        const newGameData = {
          ...gameData,
          playerId: firstPlayer.id,
          id: `${dateTime}`,
        };
        socket.emit('creategame', newGameData);
        Messages = [];
        socket.emit('joingame', {
          gameId: newGameData.id,
          playerId: secondPlayer.id,
          ...secondPlayer,
        });
        socket.emit('joingame', {
          gameId: newGameData.id,
          playerId: thirdPlayer.id,
          ...thirdPlayer,
        });

        should(GameUpdates.length).be.eql(5);
        let expected = {
          smallBlind: gameData.smallBlind,
          bigBlind: gameData.bigBlind,
          time: gameData.time,
          id: GameUpdates[0].id,
          hand: 0,
          messages: [],
          players: [
            { ...firstPlayer },
            { ...secondPlayer },
            { ...thirdPlayer, me: true },
          ],
        };
        should(GameUpdates[4]).be.eql(expected);

        GameUpdates = [];
        socket.emit('startgame', {
          gameId: newGameData.id,
          playerId: thirdPlayer.id,
          dateTime,
        });
        expected = {
          ...expected,
          currentTimerTime: expected.time,
          gamePhase: 0,
          hand: 1,
          amountToCall: expected.bigBlind,
          board: [],
          pot: expected.bigBlind + expected.smallBlind,
          startDate: dateTime,
          handStartDate: dateTime,
          messages: [],
          players: [{
            ...expected.players[0],
            active: true,
            dealer: true,
            needToTalk: true,
            options: ['Fold', 'Call', 'Raise'],
            pot: [0, 0, 0, 0],
          }, {
            ...expected.players[1],
            balance: expected.players[1].balance - expected.smallBlind,
            small: true,
            needToTalk: true,
            options: [],
            pot: [expected.smallBlind, 0, 0, 0],
          }, {
            ...expected.players[2],
            balance: expected.players[2].balance - expected.bigBlind,
            big: true,
            needToTalk: true,
            options: [],
            pot: [expected.bigBlind, 0, 0, 0],
            me: true,
            cards: GameUpdates[2].players[2].cards,
          },
          ],
        };
        should(GameUpdates.length).be.eql(3);
        should(GameUpdates[2]).be.eql(expected);

        GameUpdates = [];
        socket.emit('playeraction', {
          gameId: newGameData.id,
          playerId: firstPlayer.id,
          hand: 1,
          dateTime,
          op: 'Call',
        });
        expected = {
          ...expected,
          pot: 2 * expected.bigBlind + expected.smallBlind,
          messages: [],
          players: [{
            ...expected.players[0],
            active: false,
            balance: expected.players[0].balance - expected.bigBlind,
            needToTalk: false,
            options: [],
            pot: [expected.bigBlind, 0, 0, 0],
            status: 'Call',
          }, {
            ...expected.players[1],
            active: true,
            options: ['Raise', 'Call', 'Fold'],
          },
          expected.players[2],
          ],
        };
        should(GameUpdates.length).be.eql(3);
        should(GameUpdates[2]).be.eql(expected);

        GameUpdates = [];
        socket.emit('playeraction', {
          gameId: newGameData.id,
          playerId: secondPlayer.id,
          hand: 1,
          dateTime,
          op: 'Call',
        });
        expected = {
          ...expected,
          playersTurn: true,
          pot: 3 * expected.bigBlind,
          messages: [],
          players: [
            expected.players[0],
            {
              ...expected.players[1],
              active: false,
              balance: expected.players[1].balance - expected.smallBlind,
              needToTalk: false,
              options: [],
              pot: [expected.bigBlind, 0, 0, 0],
              status: 'Call',
            },
            {
              ...expected.players[2],
              active: true,
              options: ['Raise', 'Check', 'Fold'],
            },
          ],
        };
        should(GameUpdates.length).be.eql(3);
        should(GameUpdates[2]).be.eql(expected);

        GameUpdates = [];
        socket.emit('playeraction', {
          gameId: newGameData.id,
          playerId: thirdPlayer.id,
          hand: 1,
          dateTime,
          op: 'Check',
        });
        expected = {
          ...expected,
          gamePhase: 1,
          amountToCall: 0,
          board: GameUpdates[2].board,
          pot: 3 * expected.bigBlind,
          messages: [],
          players: [{
            ...expected.players[0],
            needToTalk: true,
            status: '',
          }, {
            ...expected.players[1],
            active: true,
            needToTalk: true,
            options: ['Raise', 'Check', 'Fold'],
            status: '',
          },
          {
            ...expected.players[2],
            options: [],
            status: '',
            active: false,
          },
          ],
        };
        delete expected.playersTurn;
        delete expected.players[2].active;
        should(GameUpdates.length).be.eql(3);
        should(GameUpdates[2]).be.eql(expected);

        GameUpdates = [];
        const raiseAmount = expected.players[1].balance;
        socket.emit('playeraction', {
          gameId: newGameData.id,
          playerId: secondPlayer.id,
          hand: 1,
          dateTime,
          op: 'Raise',
          amount: raiseAmount,
        });
        expected = {
          ...expected,
          playersTurn: true,
          pot: expected.pot + raiseAmount,
          amountToCall: raiseAmount,
          messages: [],
          players: [{
            ...expected.players[0],
          }, {
            ...expected.players[1],
            needToTalk: false,
            options: [],
            status: 'Raise',
            pot: [expected.players[1].pot[0], raiseAmount, 0, 0],
            active: false,
            allIn: true,
            balance: 0,
          },
          {
            ...expected.players[2],
            options: ['Raise', 'Call', 'Fold'],
            active: true,
          },
          ],
        };
        should(GameUpdates.length).be.eql(3);
        should(GameUpdates[2]).be.eql(expected);

        GameUpdates = [];
        socket.emit('playeraction', {
          gameId: newGameData.id,
          playerId: thirdPlayer.id,
          hand: 1,
          dateTime,
          op: 'Fold',
        });
        expected = {
          ...expected,
          messages: [],
          players: [{
            ...expected.players[0],
            active: true,
            options: ['Raise', 'Call', 'Fold'],
          }, {
            ...expected.players[1],
          },
          {
            ...expected.players[2],
            options: [],
            active: false,
            needToTalk: false,
            status: 'Fold',
            fold: true,
          },
          ],
        };
        delete expected.playersTurn;
        should(GameUpdates.length).be.eql(3);
        should(GameUpdates[2]).be.eql(expected);

        GameUpdates = [];
        socket.emit('playeraction', {
          gameId: newGameData.id,
          playerId: firstPlayer.id,
          hand: 1,
          dateTime,
          op: 'Fold',
        });
        expected = {
          ...expected,
          handOver: true,
          pot: 0,
          messages: [],
          players: [{
            ...expected.players[0],
            active: false,
            options: [],
            needToTalk: false,
            status: 'Fold',
            fold: true,
          }, {
            ...expected.players[1],
            balance: expected.players[1].balance + expected.pot,
          },
          {
            ...expected.players[2],
          },
          ],
        };
        should(GameUpdates.length).be.eql(3);
        should(GameUpdates[2]).be.eql(expected);
      });
    });
    describe('scenario 2: all 3 players see flop, then the SB raise all-in and the BB call, the dealer then fold', async function () {
      this.timeout(12000);

      let GameUpdates = [];
      let Messages = [];
      const socket = {};
      const eventsCallbacks = {
        onerror(error) {
          throw new Error('server threw an error', error);
        },
        gamecreated() {

        },
        gameupdate(game) {
          GameUpdates.push(game);
        },
        onmessage(msg) {
          Messages.push(msg);
        },
      };

      beforeEach(async function () {
        GameUpdates = [];
        socket.on = (eventName, cb) => {
          eventsCallbacks[eventName] = cb;
        };
        socket.emit = (eventName, data) => {
          if (eventsCallbacks[eventName]) {
            eventsCallbacks[eventName](data);
          } else {
            throw new Error(`unknown event:${eventName}`);
          }
        };
      });
      it('should follow game flow', function (done) {
        eventHandlers.onConnection(socket);
        socket.emit('updateplayerid', { playerId: firstPlayer.id });
        const newGameData = {
          ...gameData,
          playerId: firstPlayer.id,
          id: `${dateTime}`,
        };
        socket.emit('creategame', newGameData);
        Messages = [];
        socket.emit('joingame', {
          gameId: newGameData.id,
          playerId: secondPlayer.id,
          ...secondPlayer,
        });
        socket.emit('joingame', {
          gameId: newGameData.id,
          playerId: thirdPlayer.id,
          ...thirdPlayer,
        });

        should(GameUpdates.length).be.eql(5);
        let expected = {
          smallBlind: gameData.smallBlind,
          bigBlind: gameData.bigBlind,
          time: gameData.time,
          id: GameUpdates[0].id,
          hand: 0,
          players: [
            { ...firstPlayer },
            { ...secondPlayer },
            { ...thirdPlayer, me: true },
          ],
          messages: [],
        };
        should(GameUpdates[4]).be.eql(expected);

        socket.emit('startgame', {
          gameId: newGameData.id,
          playerId: thirdPlayer.id,
          dateTime,
        });
        socket.emit('playeraction', {
          gameId: newGameData.id,
          playerId: firstPlayer.id,
          hand: 1,
          dateTime,
          op: 'Call',
        });
        socket.emit('playeraction', {
          gameId: newGameData.id,
          playerId: secondPlayer.id,
          hand: 1,
          dateTime,
          op: 'Call',
        });
        socket.emit('playeraction', {
          gameId: newGameData.id,
          playerId: thirdPlayer.id,
          hand: 1,
          dateTime,
          op: 'Check',
        });
        const raiseAmount = secondPlayer.balance - newGameData.bigBlind;
        socket.emit('playeraction', {
          gameId: newGameData.id,
          playerId: secondPlayer.id,
          hand: 1,
          dateTime,
          op: 'Raise',
          amount: raiseAmount,
        });
        GameUpdates = [];
        socket.emit('playeraction', {
          gameId: newGameData.id,
          playerId: thirdPlayer.id,
          hand: 1,
          dateTime,
          op: 'Call',
        });
        expected = {
          ...expected,
          currentTimerTime: expected.time,
          pot: 3 * newGameData.bigBlind + 2 * raiseAmount,
          startDate: dateTime,
          amountToCall: raiseAmount,
          board: GameUpdates[2].board,
          gamePhase: 1,
          hand: 1,
          handStartDate: dateTime,
          messages: [],
          players: [
            {
              ...expected.players[0],
              active: true,
              dealer: true,
              balance: expected.players[0].balance - newGameData.bigBlind,
              needToTalk: true,
              options: [
                'Raise',
                'Call',
                'Fold',
              ],
              status: '',
              pot: [newGameData.bigBlind, 0, 0, 0],
            },
            {
              ...expected.players[1],
              active: false,
              allIn: true,
              balance: 0,
              needToTalk: false,
              options: [],
              status: 'Raise',
              pot: [
                newGameData.bigBlind,
                raiseAmount,
                0,
                0,
              ],
              small: true,
            },
            {
              ...expected.players[2],
              active: false,
              balance: thirdPlayer.balance - raiseAmount - newGameData.bigBlind,
              big: true,
              cards: GameUpdates[2].players[2].cards,
              me: true,
              needToTalk: false,
              options: [],
              pot: [
                newGameData.bigBlind,
                raiseAmount,
                0,
                0,
              ],
              status: 'Call',
            },
          ],
        };
        should(GameUpdates.length).be.eql(3);
        should(GameUpdates[2]).be.eql(expected);

        GameUpdates = [];
        socket.emit('playeraction', {
          gameId: newGameData.id,
          playerId: firstPlayer.id,
          hand: 1,
          dateTime,
          op: 'Fold',
        });
        expected = {
          ...expected,
          fastForward: true,
          amountToCall: 0,
          board: GameUpdates[2].board,
          gamePhase: 2,
          messages: [],
          players: [
            {
              ...expected.players[0],
              fold: true,
              needToTalk: false,
              options: [],
              status: 'Fold',
            },
            {
              ...expected.players[1],
              status: '',
              cards: GameUpdates[2].players[1].cards,
            },
            {
              ...expected.players[2],
              status: '',
            },
          ],
        };
        delete expected.players[0].active;
        should(GameUpdates.length).be.eql(3);
        should(GameUpdates[2]).be.eql(expected);

        setTimeout(() => {
          should(GameUpdates[GameUpdates.length - 1].hand).be.eql(2);
          should(GameUpdates[GameUpdates.length - 1].gamePhase).be.eql(0);
          should(GameUpdates[GameUpdates.length - 1].board).be.eql([]);

          done();
        }, 6500);
      });
    });
  });

  describe('play game with only 2 players', async function () {
    describe('scenario 1: small folds', async function () {
      this.timeout(10000);
      let GameUpdates = [];
      let Messages = [];

      const socket = {};
      const eventsCallbacks = {
        onerror(error) {
          throw new Error('server threw an error', error);
        },
        gamecreated() {

        },
        gameupdate(game) {
          GameUpdates.push(game);
        },
        onmessage(msg) {
          Messages.push(msg);
        },
      };

      beforeEach(async function () {
        GameUpdates = [];
        socket.on = (eventName, cb) => {
          eventsCallbacks[eventName] = cb;
        };
        socket.emit = (eventName, data) => {
          if (eventsCallbacks[eventName]) {
            eventsCallbacks[eventName](data);
          } else {
            throw new Error(`unknown event:${eventName}`);
          }
        };
      });
      it('should follow game flow', function (done) {
        eventHandlers.onConnection(socket);
        socket.emit('updateplayerid', { playerId: firstPlayer.id });
        const newGameData = {
          ...gameData,
          playerId: firstPlayer.id,
          id: `${dateTime}`,
        };
        socket.emit('creategame', newGameData);
        Messages = [];
        socket.emit('joingame', {
          gameId: newGameData.id,
          playerId: secondPlayer.id,
          ...secondPlayer,
        });
        socket.emit('startgame', {
          gameId: newGameData.id,
          playerId: firstPlayer.id,
          dateTime,
        });

        GameUpdates = [];
        socket.emit('playeraction', {
          gameId: newGameData.id,
          playerId: secondPlayer.id,
          hand: 1,
          dateTime,
          op: 'Fold',
        });

        should(GameUpdates.length).be.eql(2);
        should(GameUpdates[0].messages.length).be.eql(0);
        should(GameUpdates[0].players[0].balance).be.eql(firstPlayer.balance + newGameData.smallBlind);
        should(GameUpdates[0].players[1].balance).be.eql(secondPlayer.balance - newGameData.smallBlind);
        should(GameUpdates[0].pot).be.eql(0);

        setTimeout(() => {
          should(GameUpdates.length).be.eql(4);
          should(GameUpdates[3].gamePhase).be.eql(0);
          should(GameUpdates[3].pot).be.eql(newGameData.bigBlind + newGameData.smallBlind);
          should(GameUpdates[3].hand).be.eql(2);
          should(GameUpdates[3].messages).be.eql([]);

          done();
        }, 3500);
      });
    });
    describe('scenario 2: big folds', async function () {
      this.timeout(10000);
      let GameUpdates = [];
      let Messages = [];

      const socket = {};
      const eventsCallbacks = {
        onerror(error) {
          throw new Error('server threw an error', error);
        },
        gamecreated() {

        },
        gameupdate(game) {
          GameUpdates.push(game);
        },
        onmessage(msg) {
          Messages.push(msg);
        },
      };

      beforeEach(async function () {
        GameUpdates = [];
        socket.on = (eventName, cb) => {
          eventsCallbacks[eventName] = cb;
        };
        socket.emit = (eventName, data) => {
          if (eventsCallbacks[eventName]) {
            eventsCallbacks[eventName](data);
          } else {
            throw new Error(`unknown event:${eventName}`);
          }
        };
      });
      it('should follow game flow', function (done) {
        eventHandlers.onConnection(socket);
        socket.emit('updateplayerid', { playerId: firstPlayer.id });
        const newGameData = {
          ...gameData,
          playerId: firstPlayer.id,
          id: `${dateTime}`,
        };
        socket.emit('creategame', newGameData);
        Messages = [];
        socket.emit('joingame', {
          gameId: newGameData.id,
          playerId: secondPlayer.id,
          ...secondPlayer,
        });
        socket.emit('startgame', {
          gameId: newGameData.id,
          playerId: firstPlayer.id,
          dateTime,
        });

        socket.emit('playeraction', {
          gameId: newGameData.id,
          playerId: secondPlayer.id,
          hand: 1,
          dateTime,
          op: 'Call',
        });
        GameUpdates = [];
        socket.emit('playeraction', {
          gameId: newGameData.id,
          playerId: firstPlayer.id,
          hand: 1,
          dateTime,
          op: 'Fold',
        });

        should(GameUpdates.length).be.eql(2);
        should(GameUpdates[0].messages.length).be.eql(0);
        should(GameUpdates[0].players[0].balance).be.eql(firstPlayer.balance - newGameData.bigBlind);
        should(GameUpdates[0].players[1].balance).be.eql(secondPlayer.balance + newGameData.bigBlind);
        should(GameUpdates[0].pot).be.eql(0);

        setTimeout(() => {
          should(GameUpdates.length).be.eql(4);
          should(GameUpdates[3].gamePhase).be.eql(0);
          should(GameUpdates[3].pot).be.eql(newGameData.bigBlind + newGameData.smallBlind);
          should(GameUpdates[3].hand).be.eql(2);
          should(GameUpdates[3].messages).be.eql([]);

          should(Messages.length).be.eql(7);
          should(Messages[0]).be.eql({ action: 'join', name: firstPlayer.name, balance: firstPlayer.balance });
          should(Messages[1]).be.eql({ action: 'join', name: secondPlayer.name, balance: secondPlayer.balance });
          should(Messages[2]).be.eql({ action: 'join', name: secondPlayer.name, balance: secondPlayer.balance });
          should(Messages[3]).be.eql({ action: 'game_started', name: firstPlayer.name });
          should(Messages[4]).be.eql({ action: 'game_started', name: firstPlayer.name });
          should(Messages[5]).be.eql({ action: 'won_without_showdown', name: secondPlayer.name, amount: 2 });
          should(Messages[6]).be.eql({ action: 'won_without_showdown', name: secondPlayer.name, amount: 2 });
          done();
        }, 3500);
      });
    });
  });
});

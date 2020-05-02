import React, { Component } from 'react';
import moment from 'moment';
import io from 'socket.io-client';
import './App.css';
import { version } from '../package.json';

import CreateGameScreen from "./components/CreateGameScreen";
import OnlineGame from "./components/OnlineGame";
import JoinGameScreen from "./components/JoinGameScreen";
import Loader from "./containers/Loader";
import ShowAlert from "./containers/ShowAlert";
import GameInfoScreen from "./containers/GameInfoScreen";

const endpoint = window.location.origin.indexOf('localhost') >= 0 ?  'http://127.0.0.1:5000' : window.location.origin;

const ONLINE_GAME_ID = 'gameid';

// eslint-disable-next-line
Date.prototype.AsGameName = function() {
    const stringValue = this.toISOString().substr(0,10);
    const day = stringValue.substr(8,2);
    const month = stringValue.substr(5,2);
    const year = stringValue.substr(0,4);
    return `${day}/${month}/${year}`;
};

// eslint-disable-next-line
Date.prototype.AsExactTime = function() {
    return this.toLocaleTimeString('en-GB').substr(0,5);
};
// eslint-disable-next-line
Date.prototype.AsExactTimeWithSeconds = function() {
    return this.toLocaleTimeString('en-GB');
};
// eslint-disable-next-line
String.prototype.AsGameName = function() {
    const date = new Date(this);
    return date.AsGameName()
};

// eslint-disable-next-line
String.prototype.AsExactTime = function(hours = 0) {
    return moment(this).add(hours, 'hours').toDate().AsExactTime()
};
// eslint-disable-next-line
String.prototype.AsExactTimeWithSeconds = function(hours = 0) {
    return moment(this).add(hours, 'hours').toDate().AsExactTimeWithSeconds()
};
if (!localStorage.getItem('playerId')){
    localStorage.setItem('playerId', `playerId_${(new Date()).getTime()}`);
}
const search = window.location.search || '';
class App extends Component {
    constructor(props) {
        super(props);
        let gameId = null;
        if (search.includes(ONLINE_GAME_ID)){
            const queryItems = search.substr(1).split('&');
            gameId = queryItems.find(qi=>qi.startsWith(ONLINE_GAME_ID)).split('=')[1] || '';
        }
        this.state = {
            games:null,
            messages:[],
            game:null,
            showAlert:false,
            connected:false,
            showInfoScreen:false,
            playerId: localStorage.getItem('playerId'),
            gameId,
        };
    }

    showAlertMessage = (message)=>{
        this.alertMessage = message;
        setImmediate(()=>{
            this.setState({showAlert:true});
        });
    };

    hideAlertMessage = ()=>{
        this.alertMessage = null;
        setImmediate(()=>{
            this.setState({showAlert:false});
        });
    };

    getMyIndex(players){
        let index = -1;
        players.forEach((player,i)=>{
            if (player.me){
                index = i;
            }
        });
        return index;
    }

    getGameClone = (game) =>{

        const myIndex = this.getMyIndex(game.players);
        const gameClone = {
            ...game,
            players: [...game.players.slice(myIndex, game.players.length+1),...game.players.slice(0, myIndex)]
        };

        return gameClone;
    };

    componentDidMount() {
        this.socket = io(endpoint, {origins:"*"});

        this.socket.on('gamesdata', (games) => {
            console.log('------gamesdata',games)
            this.setState({ games, connected:true });
        });

        this.socket.on('connect', ()=>{
            console.log('App on connect.');
            if (!this.state.gameId){
                if (!this.state.games){

                    setTimeout(()=>{
                        this.socket.emit('getgames',{ playerId: this.state.playerId });
                    },2000)


                } else{
                    this.socket.emit('updateplayerid', {playerId: this.state.playerId});
                }
            } else {//i have gameId
                if (!this.state.game){
                    this.socket.emit('getgamedata',{gameId: this.state.gameId ,playerId: this.state.playerId});
                } else{
                    this.socket.emit('updateplayerid', {playerId: this.state.playerId});
                }
            }

            if (!this.state.connected){
                this.setState({ connected:true});
            }
        });

        this.socket.on('disconnect', (data) => {
            console.log('App on disconnect',data);
            if (this.state.connected){
                this.setState({connected:false});
            }
        });

        this.socket.on('onerror', (data) => {
            console.error('SERVER ERROR',data);
            if (localStorage.get('debug')===true){
                alert('SERVER ERROR. '+JSON.stringify(data));
            }
            // if (data.popMessage){
            //     this.setState({showError:message, connected:true})
            // }
        });

        this.socket.on('gameupdate', (game) => {
            console.log('## .on(gameupdate) game:',game);
            const gameClone = this.getGameClone(game);
            if (this.state.game){
                const activePlayerIndex = this.state.game.players.findIndex(p=>p.active);
                const newActivePlayerIndex = gameClone.players.findIndex(p=>p.active);
                if (this.GameUpdatedCallback){
                    if (gameClone.hand !== this.state.game.hand ||
                        gameClone.gamePhase !== this.state.game.gamePhase ||
                        gameClone.currentTimerTime !== this.state.game.currentTimerTime ||
                        activePlayerIndex !== newActivePlayerIndex){
                        this.GameUpdatedCallback(gameClone);
                    }

                }
            }
            this.setState({game: gameClone, gameId:gameClone.id, connected:true});
        });

        this.socket.on('gamecreated', (game) => {
            const gameId = game.id;
            const existingGames = (localStorage.getItem('games') || '').split(',');
            existingGames.push(gameId);
            localStorage.setItem('games', existingGames.join(','));
            this.setState({ game, gameId, connected: true });
        });

        this.socket.on('onmessage', (message) => {
            message.time = (new Date()).AsExactTimeWithSeconds();
            if (message.popupMessage){
                setImmediate(()=>{
                    this.showAlertMessage(message.popupMessage);
                })
            }
            const messages = [...this.state.messages, message];

            this.setState({ messages, connected: true });

            setTimeout(()=>{
                const objDiv = document.getElementById('messages-box');
                if (objDiv){
                    objDiv.scrollTop = objDiv.scrollHeight;
                }
            },100)

        });
    }

    /**
     *
     * @param op Fold/Call/Check/Raise/Rebuy
     * @param amount - only relevant for Raise/Rebuy
     */
    action = (op, amount)=>{
        const dateTime = `${(new Date()).getTime()}`;
        this.socket.emit('playeraction', {
            dateTime,
            op,
            amount,
            gameId: this.state.gameId,
            hand:this.state.game.hand,
            playerId: this.state.playerId
        });
    };

    sitBack = () =>{
        const dateTime =(new Date()).getTime();
        const { gameId, playerId } = this.state;
        console.log('emiting sitback')

        this.socket.emit('sitback', {gameId , dateTime, playerId });
    };

    standUp = () =>{
        const dateTime =(new Date()).getTime();
        const { gameId, playerId } = this.state;
        console.log('emiting standup')
        this.socket.emit('standup', {gameId , dateTime, playerId });
    };

    quitGame = () =>{
        if (confirm("Are you sure?")){
            const dateTime =(new Date()).getTime();
            const { gameId, playerId } = this.state;
            console.log('emiting quitgame')
            this.socket.emit('quitgame', {gameId , dateTime, playerId, now: (new Date()).getTime() });
        }
    };

    sendMessage = (message) =>{
        if (message.length > 0){
            const dateTime =(new Date()).getTime();
            const { gameId, playerId } = this.state;
            console.log('emiting usermessage')
            this.socket.emit('usermessage', {gameId , dateTime, playerId, message });
        }
    };

    startGame = () =>{
        const dateTime =(new Date()).getTime();
        const { gameId, playerId } = this.state;
        const creator = this.state.game.players.find(p=>p.creator);
        if (creator.id === playerId){
            this.socket.emit('startgame', {gameId , dateTime, playerId });
        }
    };

    pauseGame = () =>{
        const dateTime =(new Date()).getTime();
        const { gameId, playerId } = this.state;
        const creator = this.state.game.players.find(p=>p.creator);
        if (creator.id === playerId){
            this.socket.emit('pausegame', {gameId , dateTime, playerId });
        }
    };

    showCards = () =>{
        const dateTime =(new Date()).getTime();
        const { gameId, playerId } = this.state;
        this.socket.emit('showcards', {gameId , dateTime, playerId });
    };

    resumeGame = () =>{
        const dateTime =(new Date()).getTime();
        const { gameId, playerId } = this.state;
        const creator = this.state.game.players.find(p=>p.creator);
        if (creator.id === playerId){
            this.socket.emit('resumegame', {gameId , dateTime, playerId, now: (new Date()).getTime() });
        }
    };

    rebuy = (amount) =>{
        const dateTime =(new Date()).getTime();
        const { gameId, playerId } = this.state;
        this.socket.emit('rebuy', {gameId , dateTime, playerId, amount, now: (new Date()).getTime() });
    };

    createGame = ({ smallBlind, bigBlind, time, name, balance, privateGame }) =>{
        console.log('this state',this.state)
        const now = (new Date()).getTime();
        const gameId = `gameId_${now}`;
        const playerId = this.state.playerId;
        this.socket.emit('creategame',  {
            now,
            smallBlind,
            bigBlind,
            time,
            id: gameId,
            playerId,
            name,
            balance,
            privateGame,
        });

        this.setState({ gameId, game: null })
    };

    joinGame = ({ name, balance }) =>{
        const { gameId, playerId } = this.state;

        this.socket.emit('joingame',  {
            gameId,
            playerId,
            name,
            balance,
            now: (new Date()).getTime()
        });

        this.setState({ gameId, game: null })
    };

    registerGameUpdatedCallback = (cb)=>{
        this.GameUpdatedCallback = cb;
    };

    wrapWithAlerts = (item)=>{
        return <div>
            {item}
            <ShowAlert message={this.alertMessage} hideAlertMessage={this.hideAlertMessage}/>
            <img id="app-name" src="./friendly-poker.png"/>
            <div id="app-version" > v{ version }</div>
            <div id="connection-status" className={this.state.connected ? 'connected-to-server':'connecting-to-server'}> { this.state.connected ? 'Connected' : 'Connecting..'}</div>
        </div>
    };

    toggleShowInfo = ()=>{
        this.setState({showInfoScreen: !this.state.showInfoScreen})
    };

    render() {

        if (!this.state.gameId){
            return this.wrapWithAlerts(<CreateGameScreen
                connected={this.state.connected}
                playerId={this.state.playerId}
                socket={this.socket}
                createGame={this.createGame}
                showAlertMessage={this.showAlertMessage}
                games={this.state.games} />);
        } else{
            const {gameId, game, playerId} = this.state;
            if (!game){
                return <Loader/>;
            }
            if (this.state.showInfoScreen) {
                return <GameInfoScreen game={game} onClose={this.toggleShowInfo}/>
            }


            const creator = game.players.find(p=>p.creator);
            const isCreator =  (creator.id === playerId);

            const gamePlayer =  game.players.find(p=>p.id === playerId);

            if (gamePlayer){
                return this.wrapWithAlerts(<OnlineGame
                    connected={this.state.connected}
                    messages={this.state.messages}
                    showAlertMessage={this.showAlertMessage}
                    registerGameUpdatedCallback={this.registerGameUpdatedCallback}
                    isCreator={isCreator}
                    toggleShowInfo={this.toggleShowInfo}
                    startGame={this.startGame}
                    pauseGame={this.pauseGame}
                    resumeGame={this.resumeGame}
                    showCards={this.showCards}
                    rebuy={this.rebuy}
                    sitBack={this.sitBack}
                    standUp={this.standUp}
                    quitGame={this.quitGame}
                    sendMessage={this.sendMessage}
                    action={this.action}
                    playerId={playerId}
                    game={this.state.game}
                    gameId={gameId}
                    socket={this.socket}/>);
            } else{
                return this.wrapWithAlerts(<JoinGameScreen
                    connected={this.state.connected}
                    showAlertMessage={this.showAlertMessage}
                    joinGame={this.joinGame}
                    game={game}
                    socket={this.socket}/>)
            }
        }

    }
}
export default App;

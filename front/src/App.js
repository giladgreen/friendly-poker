import React, { Component } from 'react';
import moment from 'moment';
import io from 'socket.io-client';
import './App.css';
import { version } from '../package.json';

import CreateGameScreen from "./components/CreateGameScreen";
import OnlineGame from "./components/OnlineGame";
import JoinGameScreen from "./components/JoinGameScreen";
import Loader from "./containers/Loader";
import NotSupported from "./containers/NotSupported";
import ShowAlert from "./containers/ShowAlert";
import GameInfoScreen from "./containers/GameInfoScreen";

const localhost = window.location.origin.indexOf('localhost') >= 0;
const endpoint = localhost ?  'http://127.0.0.1:5000' : window.location.origin;
const serverPrefix = localhost ?  'http://localhost:3000' : window.location.origin;

const ONLINE_GAME_ID = 'gameid';
const body = document.getElementsByTagName('body')[0];
const windowWidth = window.innerWidth || document.documentElement.clientWidth || body.clientWidth;
const SmartPhoneVertical = (windowWidth < 600);


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
            logs:[],
            messages:[],
            game:null,
            showAlert:false,
            connected:false,
            showInfoScreen:false,
            playerId: localStorage.getItem('playerId'),
            gameId,
        };

        if (!localhost){
            const THIS = this;
            setTimeout(async()=>{
                if ('storage' in navigator && 'estimate' in navigator.storage) {
                    const { quota } = await navigator.storage.estimate();
                    if(quota < 120000000){
                        console.log('Incognito');
                        THIS.setState({Incognito: true})
                    }
                }
            },100)
        }


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

    getMessage = (messageObject)=>{
        const {time, name, names, balance, amount, hand, text,playerIndex} = messageObject;
        if (messageObject.action === 'usermessage'){
            messageObject.div = <div key={`msg_${time}_${text}`}>
                <span className="msg-time" >{time}</span>
                <span className={`msg-text-player-name msg-text-player-name-color${playerIndex}`}>{name}:</span>
                <span className="msg-text">{text}</span>  </div>;
            return;
        }

        if (messageObject.action === 'game_started'){
            messageObject.message = `game started by ${name}`;
        }
        if (messageObject.action === 'won_without_showdown'){
            messageObject.message = `${name} won ${amount} - no show-down`;
        }
        if (messageObject.action === 'won_with_showdown'){
            messageObject.message = `${name} won ${amount} with ${hand}`;
        }
        if (messageObject.action === 'split_win'){
            messageObject.message = `${names} won ${amount} each with ${hand}`;
        }
        if (messageObject.action === 'join'){
            messageObject.message = `${name} has join the game, initial buy-in: ${balance}`;
        }
        if (messageObject.action === 'rebuy'){
            messageObject.message = `${name} did a rebuy of ${amount}`;
        }

        if (['Flop','Turn','River'].includes(messageObject.action)){
            messageObject.message = `${messageObject.action}. ${messageObject.board.map(card=> card.replace('T','10')).join(',')}`;
        }

        if (['game_resumed','game_paused'].includes(messageObject.action)){
            messageObject.message = messageObject.popupMessage;
        }

        if (messageObject.message){
            messageObject.div = <div key={`msg_${time}_${messageObject.message}`}>
                <span className="msg-time" >{time}</span>
                <span className="msg-text">{messageObject.message}</span>
            </div>
        }
    }


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
            if (localStorage.getItem('debug')===true){
                alert('SERVER ERROR. '+JSON.stringify(data));
            }
            // if (data.popMessage){
            //     this.setState({showError:message, connected:true})
            // }
        });

        this.socket.on('gameupdate', (game) => {
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
            this.getMessage(message);
            if (message.log){
                console.log('this is a log', message)
                if (message.div){
                    this.setState({ logs: [...this.state.logs, message.div], connected: true });
                    setTimeout(()=>{
                        const objDiv = document.getElementById('game-logs-modal');
                        if (objDiv){
                            objDiv.scrollTop = objDiv.scrollHeight;
                        }
                    },100)
                }

            } else{
                console.log('this is a message', message)
                if (message.div){
                    this.setState({ messages: [...this.state.messages, message.div], connected: true });
                    setTimeout(()=>{
                        const objDiv = document.getElementById('messages-box');
                        if (objDiv){
                            objDiv.scrollTop = objDiv.scrollHeight;
                        }
                    },100)
                }

            }
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
            localStorage.setItem('playerId', `playerId_${(new Date()).getTime()}`);

            window.location = serverPrefix;
        }
    };

    deleteGame = (gameId) =>{
        if (confirm("Are you sure?")){
            const { playerId } = this.state;
            console.log('emiting deletegame')
            this.socket.emit('deletegame', {gameId , playerId });
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

    updateGameSettings = (time,smallBlind,bigBlind) =>{
        const dateTime =(new Date()).getTime();
        const { gameId, playerId } = this.state;
        this.socket.emit('updategamesettings', {gameId , dateTime, playerId, time,smallBlind,bigBlind, now: (new Date()).getTime() });
        this.showAlertMessage('Update Settings Request Sent');
    }
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
        console.log('windowWidth',windowWidth)
        console.log('SmartPhoneVertical',SmartPhoneVertical)
        if (SmartPhoneVertical){
           return <NotSupported message="Smart Phone Vertical view not supported"/>
        }
        if (this.state.Incognito){
           return <NotSupported message="Incognito is not supported"/>
        }
        if (!this.state.gameId){
            return this.wrapWithAlerts(<CreateGameScreen
                connected={this.state.connected}
                playerId={this.state.playerId}
                socket={this.socket}
                deleteGame={this.deleteGame}
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
                    logs={this.state.logs}
                    showAlertMessage={this.showAlertMessage}
                    registerGameUpdatedCallback={this.registerGameUpdatedCallback}
                    isCreator={isCreator}
                    toggleShowInfo={this.toggleShowInfo}
                    startGame={this.startGame}
                    pauseGame={this.pauseGame}
                    updateGameSettings={this.updateGameSettings}
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

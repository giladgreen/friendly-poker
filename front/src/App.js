import React, { Component } from 'react';
import moment from 'moment';
import io from 'socket.io-client';
import './style/app.css';
import { version } from '../package.json';

// io.set('heartbeat timeout', 60000);
// io.set('heartbeat interval', 25000);

import CreateGameScreen from "./components/CreateGameScreen";
import OnlineGame from "./components/OnlineGame";
import JoinGameScreen from "./components/JoinGameScreen";
import Loader from "./containers/Loader";
import GamePauseScreen from "./containers/GamePauseScreen";
import NotSupported from "./containers/NotSupported";
import ShowAlert from "./containers/ShowAlert";
import GameInfoScreen from "./containers/GameInfoScreen";
import Confirm from "./containers/Confirm";


const localhost = window.location.origin.indexOf('localhost') >= 0;
const endpoint = localhost ?  'http://127.0.0.1:5000' : window.location.origin;
const serverPrefix = localhost ?  'http://localhost:3000' : window.location.origin;

const ONLINE_GAME_ID = 'gameid';
const body = document.getElementsByTagName('body')[0];
const windowWidth = window.innerWidth || document.documentElement.clientWidth || body.clientWidth;
// const SmartPhoneVertical = (windowWidth < 600);



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

const basePreferences = {
    twoColors:true,
}
if (!localStorage.getItem('playerPreferences')){
    localStorage.setItem('playerPreferences', JSON.stringify(basePreferences));
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
        this.basePopupData = {
            show: false,
            message:'',
            onYes:()=>{},
        };

        this.onCancelPopUp = () => {
            this.setState({popupData:this.basePopupData} );
        }

        this.state = {
            games:null,
            logs:[],
            messages:[],
            pendingJoin:[],
            pendingRebuy:[],
            game:null,
            showAlert:false,
            connected:false,
            showInfoScreen:false,
            playerId: localStorage.getItem('playerId'),
            gameId,
            gamePaused:false,
            popupData: this.basePopupData
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

    getDealerIndex(players){
        let index = -1;
        players.forEach((player,i)=>{
            if (player.dealer){
                index = i;
            }
        });
        return index;
    }

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

        const players = game.players;
        const myIndex = this.getMyIndex(game.players);
        const dealerIndex = this.getDealerIndex(game.players);

        players.forEach((player, index)=>{
            if (index >= myIndex){
                player.locationIndex = index - myIndex +1;
            } else{
                player.locationIndex = game.maxPlayers - myIndex + 1 + index;

            }
        });

        players.forEach((player, index)=>{
            if (index > dealerIndex){
                player.dealIndex = index - dealerIndex;
            } else{
                player.dealIndex = players.length - dealerIndex + index;

            }
        });

        if (game.pineapple && game.waitingForPlayers && !game.timeForDropCard && players.some(p=>p.needToThrow)){
            game.timeForDropCard = 30;
        }
        if (game.gamePhase >0 && game.pineapple && !game.waitingForPlayers){
            delete game.timeForDropCard;
            // game.pineapple = false;
            // game.texas = true;
        }

        const gameClone = {
            ...game,
            players,
        };



        return gameClone;
    };

    getMessage = (messageObject)=>{
        const {time, name, text, playerIndex} = messageObject;
        if (messageObject.action === 'usermessage'){
            messageObject.div = <div key={`msg_${time}_${text}_${(new Date()).getTime()}`}>
                <span className="msg-time" >{time}</span>
                <span className={`msg-text-player-name msg-text-player-name-color${playerIndex}`}>{name}:</span>
                <span className="msg-text">{text}</span>  </div>;
            return;
        }

    }

    playFold = () => {
        try {
            document.getElementById("fold-audio").play();
        } catch (e) {
        }
    };

    playTwoTaps = () => {
        try {
            document.getElementById("two-taps-audio").play();
        } catch (e) {
        }
    };

    playBeep = () => {
        try {
            document.getElementById("beep-audio").play();
        } catch (e) {
        }
    };

    playCardPlace = () => {
        setTimeout(()=>{
            try {
                document.getElementById("card-place-audio45").play();
            } catch (e) {
            }
        },1400)
    };

    playThreeCardPlacing = () => {
        setTimeout(()=>{
            try {
                document.getElementById("card-place-audio1").play();
            } catch (e) {
            }
        },1400)
        setTimeout(()=>{
            try {
                document.getElementById("card-place-audio2").play();
            } catch (e) {
            }
        },1600)
        setTimeout(()=>{
            try {
                document.getElementById("card-place-audio3").play();
            } catch (e) {
            }
        },1800)
    };

    playChips = () => {
        try {
            document.getElementById("chips-audio").play();
        } catch (e) {
        }
    };


    componentDidMount() {
        this.actioToMethodMap = {
            Fold: this.playFold,
            Call: this.playChips,
            Check: this.playTwoTaps,
            Raise: this.playChips,
            Beep: this.playBeep,
            Card: this.playCardPlace,
            Cards: this.playThreeCardPlacing,
        }

        this.socket = io(endpoint, {origins:"*"});

        this.socket.on('gamesdata', (games) => {
            this.setState({ games, connected:true });
        });

        this.socket.on('connect', ()=>{
            // console.log('App on connect.');
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

                    if (this.getGamedataEmitedRef){
                        clearTimeout(this.getGamedataEmitedRef);
                    }
                    this.getGamedataEmitedRef = setTimeout(()=>{

                        this.socket.emit('getgamedata',{gameId: this.state.gameId ,playerId: this.state.playerId});
                    }, 700)


                } else{
                    // console.log('App on connect. gameId:',this.state.gameId, ' has game, emitting updateplayerid, playerId:',this.state.playerId);
                    this.socket.emit('updateplayerid', {playerId: this.state.playerId});
                }
            }

            if (!this.state.connected){
                this.setState({ connected:true});
            }
        });

        this.socket.on('disconnect', (data) => {
            // console.log('App on disconnect',data);
            if (this.state.connected){
                this.setState({connected:false});
            }
        });

        this.socket.on('onerror', (data) => {
            console.error('SERVER ERROR',data);
            if (Boolean(localStorage.getItem('debug'))){
                alert('SERVER ERROR. '+JSON.stringify(data));
            }
            if (data.forceReload){
                window.location = serverPrefix;
            }
        });

        this.socket.on('gameupdate', (game) => {
            // console.log('on game update game.socketId',game.socketId)
            const prevHand = this.state.game ? this.state.game.hand : -1;
            const newHand = prevHand !== game.hand;

            if (!game.paused && game.audioableAction){
                game.audioableAction.forEach((action)=>{
                    const sound = this.actioToMethodMap[action];
                    sound && sound();
                })
            }
            const gameClone = this.getGameClone(game);

            if (this.state.game){
                const activePlayerIndex = this.state.game.players.findIndex(p=>p.active);
                const newActivePlayerIndex = gameClone.players.findIndex(p=>p.active);
                if (activePlayerIndex !== newActivePlayerIndex){
                    const myIndex = this.getMyIndex(this.state.game.players);
                    if (myIndex === newActivePlayerIndex){
                        this.playBeep();
                    }
                }
                if (this.GameUpdatedCallback){
                    if (gameClone.betRoundOver !== this.state.game.betRoundOver ||
                        gameClone.hand !== this.state.game.hand ||
                        gameClone.gamePhase !== this.state.game.gamePhase ||
                        gameClone.currentTimerTime !== this.state.game.currentTimerTime ||
                        gameClone.waitingForPlayers !== this.state.game.waitingForPlayers ||
                        activePlayerIndex !== newActivePlayerIndex){

                        // console.log('GameUpdatedCallback',gameClone)
                        this.GameUpdatedCallback(gameClone);
                    }else{
                        // console.log('GameUpdatedCallback not calling..',gameClone.board)
                        // console.log('gameClone.gamePhase',gameClone.gamePhase)
                    }

                }
            }
            gameClone.players.forEach(p=>{
                p.cardsToShow = newHand ? 0 : 2;
            });
            this.setState({game: gameClone, gameId:gameClone.id, connected:true, gamePaused: game.paused, initial:!game.handOver && game.gamePhase === 0});
            if (newHand){
                const playersWithCards = game.players.filter(p=>!p.sitOut);
                const playersWithCardsCount = playersWithCards.length;
                const delay = 150;
                playersWithCards.forEach((p)=>{
                    const {dealIndex} = p;

                    setTimeout(()=>{
                        gameClone.players.find(pl=>pl.id===p.id).cardsToShow += 1;
                        this.setState({game: gameClone});

                    },(dealIndex+1)*delay);

                    setTimeout(()=>{
                        gameClone.players.find(pl=>pl.id===p.id).cardsToShow += 1;
                        this.setState({game: gameClone});
                    },playersWithCardsCount*delay + (dealIndex+1)*delay);
                })
            }

        });

        this.socket.on('gamecreated', (game) => {
            // console.log('on gamecreated');
            game = this.getGameClone(game);

            const gameId = game.id;
            const existingGames = (localStorage.getItem('games') || '').split(',');
            existingGames.push(gameId);
            localStorage.setItem('games', existingGames.join(','));
            // console.log('going to ',`${serverPrefix}?gameid=${gameId}`)

            this.setState({ game, gameId, connected: true });
            setTimeout(()=>{
                window.location = `${serverPrefix}?gameid=${gameId}`
            },200)
        });

        this.socket.on('operationpendingaproval', () => {
            // console.log('on operationpendingaproval');
            this.setState({ operationpendingaproval: true });
        });

        this.socket.on('joinrequestdeclined', (game) => {
            //console.log('on joinrequestdeclined');
            this.setState({ operationpendingaproval: false, game });
            this.showAlertMessage('join request declined');
        });

        this.socket.on('rebuyrequestdeclined', () => {
            // console.log('on rebuyrequestdeclined');
            this.showAlertMessage('rebuy request declined');
        });

        this.socket.on('onmessage', (message) => {
            const time = (new Date()).AsExactTimeWithSeconds();
            if (message.popupMessage){
                setImmediate(()=>{
                    this.showAlertMessage(message.popupMessage);
                })
            } else if (message.action === 'usermessage'){
                const div = (<div key={`msg_${time}_${message.text}_${message.now}`}>
                    <span className="msg-time" >{time}</span>
                    <span className={`msg-text-player-name msg-text-player-name-color${message.playerIndex}`}>{message.name}:</span>
                    <span className="msg-text">{message.text}</span>  </div>);

                this.setState({ messages: [...this.state.messages, div], connected: true });
                setTimeout(()=>{
                    const objDiv = document.getElementById('messages-box');
                    if (objDiv){
                        objDiv.scrollTop = objDiv.scrollHeight;
                    }
                    },100)
            }
        });
    }

    /**
     *
     * @param op Fold/Call/Check/Raise/Rebuy
     * @param amount - only relevant for Raise/Rebuy
     */
    action = (op, amount)=>{
        const now = `${(new Date()).getTime()}`;
        this.socket.emit('playeraction', {
            now,
            op,
            amount,
            gameId: this.state.gameId,
            hand:this.state.game.hand,
            playerId: this.state.playerId
        });
    };

    fold = (validate)=>{
        if (validate){
            this.setState({ popupData: {
                    show: true,
                    message:'There is no Raise, are you sure you want to Fold?',
                    onYes:()=>{
                        this.action('Fold');
                        this.onCancelPopUp();
                    },
                }} );

        }else{
            return this.action('Fold');
        }
    };

    dropCard = (cardToDrop) =>{
        const now =(new Date()).getTime();
        const { gameId, playerId } = this.state;
        // console.log('emiting pineappledropcard',  {gameId , now, playerId, cardToDrop })

        this.socket.emit('pineappledropcard', {gameId , now, playerId, cardToDrop });
    };

    sitBack = () =>{
        const now =(new Date()).getTime();
        const { gameId, playerId } = this.state;
        // console.log('emiting sitback')

        this.socket.emit('sitback', {gameId , now, playerId });
    };

    dealerChooseGame = (chosenGame) =>{
        const now =(new Date()).getTime();
        const { gameId, playerId } = this.state;
        // console.log('emiting dealerchoosegame')
        this.socket.emit('dealerchoosegame', {gameId , now, playerId, chosenGame });
    };

    standUp = () =>{
        const now =(new Date()).getTime();
        const { gameId, playerId } = this.state;
        // console.log('emiting standup')
        this.socket.emit('standup', {gameId , now, playerId });
    };

    quitGame = () =>{

        this.setState({ popupData: {
                show: true,
                message:'Are you sure?',
                onYes:()=>{
                    const { gameId, playerId } = this.state;
                    //console.log('emiting quitgame')
                    this.socket.emit('quitgame', {gameId, playerId, now: (new Date()).getTime() });
                    localStorage.setItem('playerId', `playerId_${(new Date()).getTime()}`);

                    window.location = serverPrefix;
                    this.onCancelPopUp();
                },
            }} );
    };

    kickOutPlayer = (playerToKickId) =>{
        const player = this.state.game.players.find(p=>p.id ===playerToKickId);
        const action = player.active ? (player.options.includes('Call') ? 'Force Fold Player':'Force Check Player') :'Kick Out Player';
        this.setState({ popupData: {
                show: true,
                message: `Are you sure you want to ${action}?`,
                onYes:()=>{
                    const { gameId, playerId } = this.state;
                    // console.log('emiting kickoutplayer');
                    this.socket.emit('kickoutplayer', {gameId, playerId, now: (new Date()).getTime(), playerToKickId });
                    this.onCancelPopUp();
                },
            }} );

    };

    SkipHand = () =>{

        this.setState({ popupData: {
                show: true,
                message:'Are you sure?',
                onYes:()=>{
                    const now =(new Date()).getTime();
                    const { gameId, playerId } = this.state;
                    // console.log('emiting skiphand');
                    this.socket.emit('skiphand', {gameId , now, playerId });
                    this.onCancelPopUp();
                }
            }} );

    };

    deleteGame = (gameId) =>{

        this.setState({ popupData: {
                show: true,
                message:'Are you sure?',
                onYes:()=>{
                    const { playerId } = this.state;
                    //console.log('emiting deletegame')
                    this.socket.emit('deletegame', {gameId , playerId });
                    this.onCancelPopUp();
                }
            }} );
    };

    sendMessage = (message) =>{
        if (message.length > 0){
            const now =(new Date()).getTime();
            const { gameId, playerId } = this.state;
            // console.log('emiting usermessage')
            this.socket.emit('usermessage', {gameId , now, playerId, message });
        }
    };

    startGame = () =>{
        const now =(new Date()).getTime();
        const { gameId, playerId } = this.state;
        const admin = this.state.game.players.find(p=>p.admin);
        if (admin.id === playerId){
            this.socket.emit('startgame', {gameId , now, playerId });
        }
    };

    updateGameSettings = (time,smallBlind,bigBlind, adminId, newBalances) =>{
        const { gameId, playerId } = this.state;
        // console.log('emiting updategamesettings')
        const now = (new Date()).getTime();
        this.socket.emit('updategamesettings', {gameId, playerId, newBalances, time,smallBlind,bigBlind, now });
        if (adminId !== playerId){
            // console.log('emiting changeadmin')

            this.socket.emit('changeadmin', {gameId, playerId, newAdminId: adminId, now });
        }

        this.showAlertMessage('Update Settings Request Sent');
    }

    pauseGame = () =>{
        const now =(new Date()).getTime();
        const { gameId, playerId } = this.state;
        const admin = this.state.game.players.find(p=>p.admin);
        if (admin.id === playerId){
            this.socket.emit('pausegame', {gameId , now, playerId });
        }
    };

    showCards = () =>{
        const now =(new Date()).getTime();
        const { gameId, playerId } = this.state;
        this.socket.emit('showcards', {gameId , now, playerId });
    };

    resumeGame = () =>{
        const now =(new Date()).getTime();
        const { gameId, playerId } = this.state;
        const admin = this.state.game.players.find(p=>p.admin);
        if (admin.id === playerId){
            this.socket.emit('resumegame', {gameId , now, playerId });
        }
    };

    rebuy = (amount) =>{
        const { gameId, playerId } = this.state;
        this.socket.emit('rebuy', {gameId, playerId, amount, now: (new Date()).getTime() });
    };

    approveJoin = (data) =>{
        const { gameId, playerId } = this.state;
        // console.log('emiting approvejoin')
        this.socket.emit('approvejoin', {gameId , playerId, joinedPlayerId: data.playerId, balance:data.balance, now: (new Date()).getTime() });
    };

    approveRebuy = (data) =>{
        const { gameId, playerId } = this.state;
        // console.log('emiting approverebuy')
        this.socket.emit('approverebuy', {gameId , playerId, rebuyPlayerId: data.playerId, amount:data.amount, now: (new Date()).getTime() });
    };

    declineJoin = (data) =>{
        const { gameId, playerId } = this.state;
        // console.log('emiting declinejoin')
        this.socket.emit('declinejoin', {gameId , playerId, joinedPlayerId: data.playerId, balance:data.balance, now: (new Date()).getTime() });
    };

    declineRebuy = (data) =>{
        const { gameId, playerId } = this.state;
        // console.log('emiting declinerebuy')
        this.socket.emit('declinerebuy', {gameId , playerId, rebuyPlayerId: data.playerId, amount:data.amount, now: (new Date()).getTime() });
    };

    setCreatorAsAdmin = () =>{
        const { gameId, playerId } = this.state;
        // console.log('emiting setcreatorasadmin')
        this.socket.emit('setcreatorasadmin', {gameId , playerId, now: (new Date()).getTime() });
    };

    createGame = ({ smallBlind, bigBlind, time, name, balance, privateGame, requireRebuyAproval, gameType, straddleSupported }) =>{
        const now = (new Date()).getTime();
        const gameId = `${now}`;
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
            requireRebuyAproval,
            gameType,
            straddleSupported,
        });

        this.setState({ gameId, game: null })
    };

    joinGame = ({ name, balance, positionIndex }) =>{
        const { gameId, playerId } = this.state;

        this.socket.emit('joingame',  {
            gameId,
            playerId,
            name,
            balance,
            positionIndex,
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
            <img id="app-name" src="./friendly-poker.png" onClick={()=>window.location = serverPrefix}/>
            <div id="app-version" > v{ version }</div>
            <Confirm show={this.state.popupData.show} message={this.state.popupData.message} onYes={this.state.popupData.onYes} onCancel={this.onCancelPopUp} />
            <audio id='fold-audio' src="./fold.mp3" preload="auto" controls="none" style={{display:'none'}}/>
            <audio id='two-taps-audio' src="./two-taps.mp3" preload="auto" controls="none" style={{display:'none'}}/>
            <audio id='beep-audio' src="./beep.mp3" preload="auto" controls="none" style={{display:'none'}}/>
            <audio id='card-place-audio1' src="./card-place.mp3" preload="auto" controls="none" style={{display:'none'}}/>
            <audio id='card-place-audio2' src="./card-place.mp3" preload="auto" controls="none" style={{display:'none'}}/>
            <audio id='card-place-audio3' src="./card-place.mp3" preload="auto" controls="none" style={{display:'none'}}/>
            <audio id='card-place-audio45' src="./card-place.mp3" preload="auto" controls="none" style={{display:'none'}}/>
            <audio id='chips-audio' src="./chips.mp3" preload="auto" controls="none" style={{display:'none'}}/>
            <div id="connection-status" className={this.state.connected ? 'connected-to-server':'connecting-to-server'}> { this.state.connected ? 'Connected' : 'Connecting..'}</div>
        </div>
    };

    toggleShowInfo = () => {
        this.setState({showInfoScreen: !this.state.showInfoScreen})
    };

    render() {
        const isMobile = ( /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));


        if (this.state.Incognito){
           return <NotSupported message="Incognito Mode is not supported"/>
        }
        if (!this.state.gameId){
            if (isMobile){
               return <NotSupported message="Game creation not supported on mobile view"/>
            }
            return this.wrapWithAlerts(<CreateGameScreen
                connected={this.state.connected}
                playerId={this.state.playerId}
                socket={this.socket}
                deleteGame={this.deleteGame}
                createGame={this.createGame}
                showAlertMessage={this.showAlertMessage}
                games={this.state.games} />);
        } else{
            const {gameId, game, playerId, operationpendingaproval, gamePaused} = this.state;

            if (!game){
                return <Loader waitingAproval={operationpendingaproval}/>;
            }
            if (this.state.showInfoScreen) {
                return <GameInfoScreen game={game} onClose={this.toggleShowInfo}/>
            }

            const admin = game.players.find(p=>p.admin);
            const isAdmin =  (admin.id === playerId);

            const gamePlayer =  game.players.find(p=>p.id === playerId);

            if (gamePlayer){

                return this.wrapWithAlerts(<OnlineGame
                    connected={this.state.connected}
                    messages={this.state.messages}
                    initial={this.state.initial}
                    showAlertMessage={this.showAlertMessage}
                    registerGameUpdatedCallback={this.registerGameUpdatedCallback}
                    isAdmin={isAdmin}
                    toggleShowInfo={this.toggleShowInfo}
                    startGame={this.startGame}
                    pauseGame={this.pauseGame}
                    dealerChooseGame={this.dealerChooseGame}
                    updateGameSettings={this.updateGameSettings}
                    resumeGame={this.resumeGame}
                    showCards={this.showCards}
                    kickOutPlayer={this.kickOutPlayer}
                    rebuy={this.rebuy}
                    sitBack={this.sitBack}
                    standUp={this.standUp}
                    SkipHand={this.SkipHand}
                    quitGame={this.quitGame}
                    sendMessage={this.sendMessage}
                    action={this.action}
                    dropCard={this.dropCard}
                    approveJoin={this.approveJoin}
                    approveRebuy={this.approveRebuy}
                    fold={this.fold}
                    declineJoin={this.declineJoin}
                    declineRebuy={this.declineRebuy}
                    setCreatorAsAdmin={this.setCreatorAsAdmin}
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

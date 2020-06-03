/* eslint-disable jsx-a11y/img-redundant-alt */
/* eslint-disable jsx-a11y/img-has-alt */
import React, { Component } from 'react';
import PlayerInfo from '../containers/PlayerInfo';
import Card from "../containers/Card";
import LogsScreen from "../containers/LogsScreen";
import ShoppingCartIcon from '@material-ui/icons/ShoppingCart';
import AccessibilityNewIcon from '@material-ui/icons/AccessibilityNew';
import DnsIcon from '@material-ui/icons/Dns';
import LinkIcon from '@material-ui/icons/Link';
import SettingsIcon from '@material-ui/icons/Settings';
import ReceiptIcon from '@material-ui/icons/Receipt';
import { withStyles } from '@material-ui/core/styles';

import Modal from '@material-ui/core/Modal';
import Backdrop from '@material-ui/core/Backdrop';
import Fade from '@material-ui/core/Fade';
import Slider from '@material-ui/core/Slider';

import EmojiPeopleIcon from '@material-ui/icons/EmojiPeople';
import TuneIcon from '@material-ui/icons/Tune';

import CancelIcon from '@material-ui/icons/Cancel';
import UserTimer from "./UserTimer";
import GamePauseScreen from "../containers/GamePauseScreen";

import GameSettingModal from "./GameSettingModal";
import Clock from "./Clock";
const isMobile = ( /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));

const PrettoSlider = withStyles({
    root: {
        color: isMobile ? '#888888': '#444444',
        height: 8,
    },
    thumb: {
        height: isMobile ? 12 : 24,
        width: isMobile ? 12 : 24,
        backgroundColor: '#fff',
        border: '2px solid currentColor',
        marginTop: isMobile ? 1 : -2,
        marginLeft: isMobile ? -6 : -12,
        '&:focus, &:hover, &$active': {
            boxShadow: 'inherit',
        },
    },
    active: {},
    valueLabel: {
        left: 'calc(-50% + 4px)',
        color: 'transparent'
    },
    track: {
        height: isMobile ? 11 : 24,
        borderRadius: 0,
    },
    rail: {
        height: isMobile ? 11 : 24,
        borderRadius: 0,
    },
})(Slider);

const serverPrefix = window.location.origin.indexOf('localhost') >= 0 ?  'http://localhost:3000' : window.location.origin;

class OnlineGame extends Component {

    constructor(props) {
        super(props);
        const gameOptions=[
            {name: 'No Limit Texas Holdem', type:'TEXAS'},
            {name: 'Pot Limit Omaha', type: 'OMAHA'},
            {name: 'No Limit Pineapple', type: 'PINEAPPLE'},
            {name: "Dealer's Choice", type: 'DEALER_CHOICE'},
        ];
        const gameName = gameOptions.find(item=>item.type ===props.game.gameType).name;



        const playerPreferences = JSON.parse(localStorage.getItem('playerPreferences'));
        this.state = {
            gameName,
            chosenGame: 'TEXAS',
            betRoundOver:false,
            chatFocused:false,
            chatMessage: '',
            communityCards:[],
            raiseEnabled: false,
            raiseValue: props.game.bigBlind,
            userTimer:0,
            options:[],
            rebuyValue: 10* props.game.bigBlind,
            rebuyValueError: false,
            raiseValueError: false,
            checkFoldPressed: false,
            showSettings: false,
            showPlayerSettings: false,
            rebuySectionOpen: false,
            showInfoScreen: false,
            showLogs: false,
            sideMenu: false,
            me:{},
            playerPreferences,
            gameOptions
        }

        setTimeout(()=>{
            this.onGameUpdate(props.game);
        },300);
    }

    keypress = (event)=>{
        const game = this.props.game;
        const keycode = event.keyCode;
        const key = String.fromCharCode(keycode).toLowerCase();

        if (!chatFocused && (key === 'm' || key === 'צ')){
            setTimeout(()=>{
                document.getElementById("chat-input").focus();
            },120);
            this.setState({chatFocused:true});
            return;
        }
        if (game.handOver || !game.startDate){
            return;
        }

        const {me, isMyTurn, options, raiseEnabled, chatFocused, showSettings, rebuySectionOpen} = this.state;



        const number = `0123456789`.includes(key);
        if (chatFocused || showSettings  || rebuySectionOpen ){
            return;
        }
        if (!number){
            event.preventDefault();
        }

        if (raiseEnabled ){
            if (key === 'a'){
                this.setRaiseValue(this.getMaxRaise());
                return;
            }
            if (key === 'p'){
                this.setRaiseValue(game.pot);
                return;
            }
            if (key === 'c'){
                this.toggleRaiseButton();
                return;
            }
            return;
        }

        if (number && isMyTurn && options.includes('Raise') && me.balance !== 0 && me && !me.fold && !me.sitOut){
            this.setState({ raiseEnabled: true, raiseValue:parseInt(key,10)});
            setTimeout(()=>{
                document.getElementById("raise-input").focus();
            },120)
            return;
        }

        if (!isMyTurn){
            if (key === 'f' || key === 'כ'){
                this.checkFold();
                return;
            }
        }else{
            if (!raiseEnabled){
                if (key === 'f' || key === 'כ'){
                    this.fold();
                    return;
                }
                if (key === 'c' || key === 'c'){
                    if (options.includes('Check')){
                        this.check();
                    }else{
                        this.call();
                    }
                    return;
                }
                if (key === 'r' || key === 'b' || key === 'ר' || key === 'נ'){
                    this.toggleRaiseButton();
                    setTimeout(()=>{
                        document.getElementById("raise-input").focus();
                    },120)
                    return;
                }
            } else{
                if (keycode === 13) {
                    this.raise();
                    this.setState({raiseEnabled:false})
                }
            }
        }
    }

    componentDidMount() {
        this.props.registerGameUpdatedCallback(this.onGameUpdate);


        setTimeout(()=>{
            document.addEventListener('keypress', this.keypress);

        },1000)
    }

    onGameUpdate = (game) =>{

        let rebuyEnabled = false;
        const userTimer = game.timeForDropCard ? game.timeForDropCard : game.currentTimerTime;

        const activeIndex = this.getActiveIndex(game.players);
        const myIndex = this.getMyIndex(game.players);

        const isMyTurn = activeIndex === myIndex && myIndex!==-1;
        let options = [];
        let userHand = null;
        let me = {};
        let cheapLeader = true;
        let showingCards = false;
        let amountToCall = 0;
        if (myIndex >= 0){
            me =  game.players[myIndex];
            options = me.options || [];
            showingCards = me.showingCards;

            amountToCall = game.amountToCall - me.pot[game.gamePhase];
            if (me.balance < amountToCall){
                amountToCall = me.balance;
            }
            if (me.userDesc){
                userHand = me.userDesc;
            }
            if (game.paused || game.handOver || me.balance === 0 || me.sitOut || me.fold){
                rebuyEnabled = true
            }
            const maxBalance = Math.max(...this.props.game.players.map(p => p.balance));
            cheapLeader = me.balance === maxBalance;
        }


        let checkFoldPressed = this.state.checkFoldPressed;
        if (isMyTurn){
            if (this.state.checkFoldPressed){
                if (options.includes('Check')){
                    this.check();
                } else{
                    this.fold();
                }
                checkFoldPressed = false;
            }
        }
        const maxBalance = Math.max(...game.players.map(p => p.balance));

        const getNextPlayerIndex = (index) => {
            return (index + 1 < game.players.length) ? index + 1 : 0;
        };
        const getNextActivePlayerIndex = (index) => {
            let nextPlayerIndex = getNextPlayerIndex(index);
            let count = 0;
            while (game.players[nextPlayerIndex].sitOut) {
                nextPlayerIndex = getNextPlayerIndex(nextPlayerIndex);
                count++;

                if (count > game.players.length + 1) {
                    return null;
                }
            }
            return nextPlayerIndex;
        }
        const getIsNextDealer =  () => {
            let dealerIndex = -1;
            game.players.forEach((player, index) => {
                if (player.dealer) {
                    dealerIndex = index;
                }
            });
            const newDealerIndex = getNextActivePlayerIndex(dealerIndex);
            console.log('game.players',game.players)
            console.log('newDealerIndex',newDealerIndex)
            const newDealer = game.players[newDealerIndex];
            return newDealer.id === me.id;
        }

        const getIsNextStraddle =  () => {
            let bigIndex = -1;
            game.players.forEach((player, index) => {
                if (player.big) {
                    bigIndex = index;
                }
            });
            const newBigIndex = getNextActivePlayerIndex(bigIndex);
            const newStraddleIndex = getNextActivePlayerIndex(newBigIndex);
            const newStraddle = game.players[newStraddleIndex];
            console.log('newStraddle',newStraddle.name)
            return newStraddle.id === me.id;
        }

        const isNextDealer = game.startDate && me ? getIsNextDealer() : false;

        const isNextStraddle = game.startDate && me ? getIsNextStraddle() : false;
        console.log('am i the Next Straddle', isNextStraddle)
        const {gameOptions} = this.state;
        let gameName = gameOptions.find(item=>item.type ===game.gameType).name;
        if (game.gameType === 'DEALER_CHOICE') {
            gameName += `: ${(game.omaha ? gameOptions[1].name : (game.pineapple ? gameOptions[2].name : (gameOptions[0].name)))}`
        }

        const newState = {
            gameName,
            me,
            isNextDealer,
            isNextStraddle,
            showingCards,
            cheapLeader,
            userTimer,
            isMyTurn,
            options,
            raiseEnabled: false,
            betRoundOver: game.betRoundOver,
            userHand,
            rebuyEnabled,
            amountToCall,
            raiseValue: this.getMinRaise(),
            adminId: this.props.game.players.find(p=>p.admin).id,
            adminName: this.props.game.players.find(p=>p.admin).name,
            checkFoldPressed,
            maxBalance,
            rebuyValue:maxBalance - me.balance,
            rebuySectionOpen: this.state.rebuySectionOpen && rebuyEnabled
        };


        if (this.forceUserTimerUpdate){
            this.forceUserTimerUpdate(newState.userTimer)
        }

        this.setState(newState);

    }

    registerForceUserTimerUpdate = (forceUserTimerUpdate)=>{
        this.forceUserTimerUpdate = forceUserTimerUpdate;
    }

    toggleRaiseButton = ()=>{
        this.setState({raiseEnabled:!this.state.raiseEnabled, raiseValue: this.getMinRaise()})
    };

    toggleSideMenu = ()=>{
        const rebuySectionOpen = this.state.sideMenu ? this.state.rebuySectionOpen : false;
        this.setState({sideMenu:!this.state.sideMenu, rebuySectionOpen})
    };

    toggleSettings = ()=>{
        this.setState({showSettings:!this.state.showSettings})
    };

    togglePlayerSettings = ()=>{
        this.setState({showPlayerSettings:!this.state.showPlayerSettings})
    };

    toggleLogs = ()=>{
        if (!this.props.game.startDate){
            return;
        }
        if (!this.state.showLogs){
            setTimeout(()=>{
                const objDiv = document.getElementById('game-logs-modal');
                if (objDiv){
                    objDiv.scrollTop = objDiv.scrollHeight;
                }
            },100)
        }
        this.setState({showLogs:!this.state.showLogs})
    };

    saveSettings = ({time,smallBlind, bigBlind, adminId, newBalances})=>{
        this.props.updateGameSettings(time,smallBlind,bigBlind,adminId, newBalances);
        this.setState({showSettings:false})
    };

    SkipHand = ()=>{
        this.props.SkipHand();
        this.setState({showSettings:false})
    };

    onSendMessage = ()=>{
        this.props.sendMessage(this.state.chatMessage);
        this.setState({chatMessage:'' });
    };

    toggleRebuyButton = ()=>{
        this.setState({rebuySectionOpen:!this.state.rebuySectionOpen });
    };

    sitStand = ()=>{
        if (this.state.me.sitOut){
            this.props.sitBack();
        } else{
            this.props.standUp();
        }
    };

    rebuy = ()=>{
        if (this.state.rebuyValueError){
            return;
        }
        if (this.state.rebuyValue === 0){
            return this.props.showAlertMessage('Rebuy is not possible');
        }

        if (this.state.rebuyEnabled){
            this.props.rebuy(this.state.rebuyValue);
        }else{
            this.rebuyValue = this.state.rebuyValue;
            this.props.showAlertMessage('Rebuy request sent')
        }
        this.setState({rebuySectionOpen:false, rebuyValue:1});

    };

    getActiveIndex(players){
        let index = -1;
        players.forEach((player,i)=>{
            if (player.active){
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

    setChatMessage = (chatMessage) =>{
        this.setState({chatMessage})
    };

    getMinRaise=()=>{
        const game = this.props.game;
        try {
            const me = this.state.me;
            const amountForMeToCall = game.amountToCall - me.pot[game.gamePhase];
            if (amountForMeToCall > 0) {
                const minValue = 2 * game.amountToCall;
                if (me.balance + me.pot[game.gamePhase] < minValue) {
                    return me.balance + me.pot[game.gamePhase];
                }
                return minValue;
            }
            return game.bigBlind + me.pot[game.gamePhase];
        } catch (e) {
            return game.amountToCall ?  2 * game.amountToCall : game.bigBlind;
        }
    }

    getMaxRaise=()=>{
        const game = this.props.game;
        const maxForAllIn = this.state.me.balance + this.state.me.pot[game.gamePhase];
        const amountToCall = (game.amountToCall - this.state.me.pot[game.gamePhase]);
        if (game.omaha){
            const max = amountToCall > 0 ? (game.pot + (2*amountToCall)) : game.pot;
            console.log('amountToCall',amountToCall)
            console.log('game.pot',game.pot)
            console.log('max',max)
            return max < maxForAllIn ? max : maxForAllIn;
        } else{
            return maxForAllIn;
        }
    };

    setRaiseValue = (raiseValue) =>{
        raiseValue = Math.floor(raiseValue);
        raiseValue = raiseValue < 0 ? 0 : raiseValue;
        const minRaise = this.getMinRaise();
        const maxRaise = this.getMaxRaise();
        const raiseValueError = raiseValue < minRaise || raiseValue > maxRaise;
        this.setState({raiseValue, raiseValueError});
    };

    checkFold = ()=>{
        this.setState({checkFoldPressed: !this.state.checkFoldPressed});
    }

    fold = ()=>{
        this.props.fold(this.state.options.includes('Check'));
    };

    showCards = ()=>{
        return this.props.showCards();
    };

    call = ()=>{
        return this.props.action('Call');
    };

    check = ()=>{
        return this.props.action('Check');
    };

    raise = ()=>{
        if (!this.state.raiseValueError && !isNaN(this.state.raiseValue)){
            return this.props.action('Raise',this.state.raiseValue);
        }

    };


    setRebuy= (rebuyValue) =>{
        rebuyValue = rebuyValue < 1 ? 1 : rebuyValue;
        const {requireRebuyAproval} = this.props.game;
        const {maxBalance, me} = this.state;
        const maxRebuy = requireRebuyAproval ? (100 * maxBalance) : (5 * maxBalance) - me.balance;
        const rebuyValueError =  rebuyValue > maxRebuy;
        this.setState({rebuyValue, rebuySectionOpen:true, rebuyValueError})
    };

    setSettingsTime = (val) =>{
        const time = val < 10 ? 10 : (val > 120 ? 120 : val);
        this.setState({ time});
    };

    setSettingsSmallBlind = (val) =>{
        const smallBlind = val < 1 ? 1 : val;
        const bigBlind = 2 * smallBlind;
        this.setState({ smallBlind, bigBlind});
    };

    setSettingsBigBlind = (val) =>{
        const bigBlind = val < this.state.smallBlind ? this.state.smallBlind : val;
        this.setState({bigBlind})
    };

    dealerChooseGame = (chosenGame) =>{
        this.setState({chosenGame});
        this.props.dealerChooseGame(chosenGame);
    }
    render() {
        const { options, cheapLeader, me, betRoundOver, isNextDealer,isNextStraddle, chosenGame, gameName} = this.state;
        const {game, initial} = this.props;
        const { pendingJoin, pendingRebuy, dealerChoice} = game;
        const showPendingIndication = this.props.isAdmin && ((pendingJoin.length >0 || (pendingRebuy.length >0)));
        const pendingIndicationCount = pendingJoin.length + pendingRebuy.length;
        const { pot, displayPot, smallBlind, bigBlind, players, startDate,hand, board} = game;
        const winningHandCards = game.handOver && game.winningHandCards && game.winningHandCards.cards ? game.winningHandCards.cards : [];

        const linkOnClick = ()=>{
            const el = document.createElement('textarea');
            el.value = `${serverPrefix}?gameid=${game.id}`;
            document.body.appendChild(el);
            el.select();
            document.execCommand('copy');
            document.body.removeChild(el);
            this.props.showAlertMessage('link copied')
        };

        const skipHandEnabled = me && me.admin && startDate;
        const showDropCardMessage = game.pineapple && game.waitingForPlayers;
        const showDropCardMessageText = showDropCardMessage && me && me.needToThrow ? 'Choose Card to Throw' : 'Waiting for all players to Throw 1 card';
        const changePlayersBalances = me && me.admin && players.length >1;
        const quitEnabled = me && ((!me.admin && (me.fold || me.sitOut || !startDate)) || (me.admin && (game.players.length === 1)));
        const standSitEnabled = startDate && me && (me.sitOut || me.fold);

        const startButtonEnabled = this.props.isAdmin && !startDate && players.length>1;
        const pauseButtonEnabled = this.props.isAdmin && startDate && !game.paused && game.handOver;
        const resumeButtonEnabled = this.props.isAdmin && game.paused;
        const messages = this.props.messages;


        return (
            <div id="online-game-screen">

                {/* game name */}
                <div id="game-name"> {gameName}  </div>

                {/* game time */}
                {startDate ? <Clock startDate={startDate}/> :  <div />}
                {/* blinds data */}
                <div id="blinds-data">BLINDS: { smallBlind}/{bigBlind}</div>

                {/* hand count + time */}
                { hand && hand >0 ? (<div id="hand-time">
                    <span>Hand #{hand} </span>
                </div>) :  <div />}

                {hand && hand>0 ? (
                    <UserTimer userTimer={this.state.userTimer} time={game.time} registerForceUserTimerUpdate={this.registerForceUserTimerUpdate}/>
                    )
                    :  <div id={"666"}/>}
                {/* your turn indication */}
                { game.playersTurn ? (<div id="your-turn-indication"> <ul><li> Your Turn</li></ul></div>) : <div/>}
                {/* table image */}
                <img id="table-image" src="table.png" />


                {/* players */}
                {players.map((player)=> <PlayerInfo
                    betRoundOver={betRoundOver}
                    initial={initial}
                    key={player.id}
                    playerPreferences={this.state.playerPreferences}
                    admin={me.admin}
                    isMe={player.id === me.id}
                    game={game}
                    dropCard={this.props.dropCard}
                    player={player}
                    index={player.locationIndex}
                    dealIndex={player.dealIndex}
                    winningHandCards={winningHandCards}
                    kickOutPlayer={this.props.kickOutPlayer}/>)}
                {/* game pot */}
                 <div id="community-pot">
                    <div>{ displayPot}</div>
                    {displayPot !== pot && <div className="total-pot-amount">total of {pot}</div>}

                </div>
                {/* game board */}
                {board && <div id="community-cards">
                    <div id="community-card-deck1" ><Card playerPreferences={this.state.playerPreferences}/></div>
                    <div id="community-card-deck2" ><Card playerPreferences={this.state.playerPreferences}/></div>
                    <div id="community-card-deck3" ><Card playerPreferences={this.state.playerPreferences}/></div>
                    {board[0] && <div id="community-card-1" className={winningHandCards.includes(board[0]) ? 'highlight-card':''}><Card playerPreferences={this.state.playerPreferences}  card={board[0]}/></div> }
                    {board[1] && <div id="community-card-2" className={winningHandCards.includes(board[1]) ? 'highlight-card':''}><Card playerPreferences={this.state.playerPreferences}  card={board[1]}/></div> }
                    {board[2] && <div id="community-card-3" className={winningHandCards.includes(board[2]) ? 'highlight-card':''}><Card playerPreferences={this.state.playerPreferences}  card={board[2]}/></div> }
                    {board[3] && <div id="community-card-4" className={winningHandCards.includes(board[3]) ? 'highlight-card':''}><Card playerPreferences={this.state.playerPreferences}  card={board[3]}/></div> }
                    {board[4] && <div id="community-card-5" className={winningHandCards.includes(board[4]) ? 'highlight-card':''}><Card playerPreferences={this.state.playerPreferences}  card={board[4]}/></div> }
                </div>}

                {/* action buttons */}
                <div>
                    {/* show cards button */}
                    { !game.paused && game.handOver && !this.state.showingCards && <div className="action-button" id="show-cards-button"  onClick={this.showCards}> Show Cards </div>}

                    {/* dealer choice button */}
                    {  game.handOver && isNextDealer && dealerChoice && <div  id="dealer-choice-div" >
                        Dealer's Choise
                        <div id="choose-texas" className={chosenGame === 'TEXAS' ? 'chosen-game':'not-chosen-game'} onClick={()=>{ this.dealerChooseGame('TEXAS')}}>
                            <div className="chosen-game-limit">no limit</div>
                            <div className="chosen-game-name">Texas Holdem</div>
                            <img id="texas-map-svg" src="texas.svg" />
                            <img id="bull-horns-svg" src="horns.svg" />
                        </div>
                        <div id="choose-pineapple" className={chosenGame === 'PINEAPPLE' ? 'chosen-game':'not-chosen-game'} onClick={()=>{ this.dealerChooseGame('PINEAPPLE')}}>
                            <div className="chosen-game-limit">no limit</div>
                            <div className="chosen-game-name">Pineapple</div>
                            <img src="Pineapple.svg" />
                        </div>
                        <div id="choose-omaha" className={chosenGame === 'OMAHA' ? 'chosen-game':'not-chosen-game'} onClick={()=>{ this.dealerChooseGame('OMAHA')}}>
                            <div className="chosen-game-limit">pot limit</div>
                            <div className="chosen-game-name">Omaha</div>
                            <img src="omaha.svg" />
                        </div>

                    </div>}
                    {/* straddle choice button */}
                    { game.handOver && game.straddleEnabled && isNextStraddle && <div id="straddle-choice-div" onClick={this.props.straddle}>
                            Straddle
                    </div>}

                    { !game.handOver &&
                    <div>
                        { showDropCardMessage ? <div className="DropCardMessage" >
                             {showDropCardMessageText}
                        </div> : <div/>}
                        {/* basic options */}
                        { !this.state.raiseEnabled && !showDropCardMessage && <div>
                            {/* Fold button */}
                            { options.includes('Fold') && <div id="fold-button" className="action-button " onClick={this.fold}> <span><span className="shortcut">F</span>old</span> </div>}
                            {/* Check button */}
                            { options.includes('Check') && <div id="check-button" className="action-button " onClick={ this.check}> <span><span className="shortcut">C</span>heck</span> </div>}
                            {/* Call button */}
                            { options.includes('Call') && <div id="call-button" className="action-button " onClick={this.call}> <span><span className="shortcut">C</span>all { this.state.amountToCall}</span> </div>}
                            {/* Raise../Bet.. button */}
                            { options.includes('Raise') && <div id="toggle-raise-button" className="action-button " onClick={this.toggleRaiseButton}> {options.includes('Call') || game.gamePhase === 0 ? <span><span className="shortcut">R</span>aise..</span> :<span><span className="shortcut">B</span>et..</span>} </div>}

                        </div> }
                        {/* Check/Fold */}
                        { me && !me.active && !me.sitOut && !me.fold && !me.allIn && game.startDate && !showDropCardMessage && <div>
                            {/* Check/Fold button */}
                            <div id="check-fold-button" className={`${this.state.checkFoldPressed ? 'check-fold-button-pressed' : 'check-fold-button-not-pressed'}`} onClick={this.checkFold}> <span>Check/<span className="shortcut">F</span>old</span>  </div>
                        </div> }

                        {/* Raise options */}
                        { this.state.raiseEnabled && !showDropCardMessage && options.includes('Raise') && <div>
                                {/* Cancel Raise button */}
                                <div id="toggle-raise-button-cancel" className="action-button" onClick={this.toggleRaiseButton}><span><span className="shortcut">C</span>ancel</span> </div>
                                {/* Raise button */}
                                 <div id="raise-button" className="action-button" onClick={this.raise}> {options.includes('Call') || game.gamePhase === 0 ? 'Raise to ' :'Bet'}  {this.state.raiseValue}</div>
                                {/* Add to Raise */}
                                <div id="raise-button-add" className="action-button raise-button-add-remove" onClick={()=> this.setRaiseValue( this.state.raiseValue+game.bigBlind)}> + </div>
                                {/* Raise Input */}
                                <input id="raise-input"
                                       className={this.state.raiseValueError ? 'red-background':''}
                                       type="number"
                                       min={0}
                                       max={this.getMaxRaise()}
                                       step={game.bigBlind}
                                       value={this.state.raiseValue}
                                       onChange={(e)=> this.setRaiseValue(parseInt(e.target.value,10))}
                                       onKeyUp={(event)=>{
                                           event.preventDefault();
                                           if (event.keyCode === 13) {
                                               this.raise();
                                               this.setState({raiseEnabled:false})
                                           }
                                       }}
                                />
                                {/* Raise Input Slider */}
                                <PrettoSlider id="raise-input-slider" valueLabelDisplay="auto" aria-label="pretto slider"   step={1} min={this.getMinRaise()} max={this.getMaxRaise()} value={this.state.raiseValue} onChange={(e,val)=> this.setRaiseValue(parseInt(val),10)} />

                                {/* Subtract to Raise */}
                                <div id="raise-button-sub" className="action-button raise-button-add-remove" onClick={()=> this.setRaiseValue( this.state.raiseValue-game.bigBlind)}> - </div>

                                {/* all in button*/}
                                <div id="all-in-button" className="action-button pot-raise-smaller-font" onClick={()=> this.setRaiseValue(this.getMaxRaise())}> <span><span className="shortcut">A</span>ll In</span></div>

                                {/* pot */}
                                { options.includes('Check') && <div id="raise-button-pot" className="action-buttons-second-row" onClick={()=> this.setRaiseValue(pot)}> <span><span className="shortcut">P</span>ot</span></div>}
                                {/*/!* 2/3 pot *!/*/}
                                { options.includes('Check') && <div id="raise-button-2-3" className="action-buttons-second-row" onClick={()=> this.setRaiseValue(2*pot / 3)}> 2/3 Pot</div>}
                                {/*/!* 1/2 pot *!/*/}
                                { options.includes('Check') && <div id="raise-button-1-2" className="action-buttons-second-row" onClick={()=> this.setRaiseValue(pot / 2)}> 1/2 Pot</div>}
                                {/*/!* 1/3 pot *!/*/}
                                { options.includes('Check') && <div id="raise-button-1-3" className="action-buttons-second-row" onClick={()=> this.setRaiseValue(pot / 3)}> 1/3 Pot</div>}


                            </div>
                        }


                    </div>}

                </div>

                { this.state.sideMenu && <div className="side-menu" id='side-menu-opened' onClick={this.toggleSideMenu}>
                     X
                </div>}

                { !this.state.sideMenu && <div className="side-menu" id="side-menu-closed" onClick={this.toggleSideMenu}>
                    menu
                </div>}

                {/* rebuy.. button */}
                { this.state.sideMenu && !this.state.rebuySectionOpen && <div id="rebuy-button" className={` ${ game.requireRebuyAproval || !cheapLeader ? 'active-button' : 'inactive-button'} `} onClick={game.requireRebuyAproval || !cheapLeader ? this.toggleRebuyButton : ()=>{}}> <span><ShoppingCartIcon/><span className="left-margin">Rebuy..</span></span> </div>}



                {this.state.rebuySectionOpen && this.state.sideMenu && (
                    <div id="rebuy-section"  >
                        <div id="rebuy-header">
                           Rebuy
                        </div>
                        <div id="rebuy-amount-label">
                           Amount:
                        </div>

                        <input id="rebuy-input" className={this.state.rebuyValueError ? 'red-background':''}
                               type="number"
                               min={0}
                               value={this.state.rebuyValue}
                               onChange={(e)=>this.setRebuy(Math.floor(e.target.value))} />


                        {/* rebuy cancel  button */}
                        <div id="cancel-rebuy-button" className="active-button" onClick={this.toggleRebuyButton}>  <span><CancelIcon/><span className="left-margin">Cancel</span></span> </div>

                        {/* rebuy button */}
                        <div id="actual-rebuy-button" className={this.state.rebuyValueError ? 'inactive-button' : 'active-button'} onClick={this.rebuy}>
                            <span><ShoppingCartIcon/><span className="left-margin">Rebuy</span></span>
                        </div>

                </div>)}

                {/* Game Link */}
                {!startDate && <div id="copy-game-link-big" className="copy-game-link" onClick={linkOnClick}><span>Copy Game Link</span> </div>}
                {/* Small Game Link */}
                {!this.state.rebuySectionOpen && this.state.sideMenu && <div id="copy-game-link-small" className="copy-game-link" onClick={linkOnClick}> <LinkIcon/><span className="left-margin">Link</span> </div>}

                {/* stand-sit button */}
                { !this.state.rebuySectionOpen && this.state.sideMenu && <div id="stand-sit-button" className={standSitEnabled ? "active-button": "inactive-button"} onClick={standSitEnabled ? this.sitStand : ()=>{}}><AccessibilityNewIcon/><span className="left-margin">{ this.state.me.sitOut ? 'Sit Back' : 'Stand Up'}</span>  </div>}
                {/* info button */}
                {!this.state.rebuySectionOpen && this.state.sideMenu && <div id="info-button" className="active-button" onClick={this.props.toggleShowInfo}><DnsIcon/><span className="left-margin">Info</span> </div>}
                {/* logs button */}
                {!this.state.rebuySectionOpen && this.state.sideMenu && <div id="game-logs-button" className={ startDate ? "active-button" : "inactive-button"}  onClick={this.toggleLogs}><ReceiptIcon/><span className="left-margin">Logs</span> </div>}

                {/* player setting button */}
                {!this.state.rebuySectionOpen && this.state.sideMenu && <div id="player-settings-button"  onClick={this.togglePlayerSettings}><TuneIcon/>Preferences </div>}

                {/* quit button */}
                {!this.state.rebuySectionOpen && this.state.sideMenu && <div id="quit-button" className={ quitEnabled ? "active-button active-quit-button" : "inactive-quit-button"} onClick={(quitEnabled ? this.props.quitGame : ()=>{})}><EmojiPeopleIcon/><span className="left-margin">Quit</span> </div>}

                {/* settings button */}
                { this.props.isAdmin && !this.state.rebuySectionOpen && this.state.sideMenu && <div id="game-settings-button" className="active-button" onClick={this.toggleSettings}><SettingsIcon/><span className="left-margin">settings</span> </div>}
                {/* creator get back his admin button */}
                { !this.props.isAdmin && me.creator && !this.state.rebuySectionOpen && this.state.sideMenu && <div id="game-settings-button" className="active-button" onClick={this.props.setCreatorAsAdmin}>retrieve admin </div>}


                {/* Pending Joing/rebuy Indication */}
                { showPendingIndication ? <div id="settings-pending-indication" className={`settings-pending-indication-${this.state.sideMenu ? 'on-menu':'on-settings-button'}`} > {pendingIndicationCount} </div> : <div/>}



                {/* start game button */}
                { startButtonEnabled && <div  id="start-pause-game-button" className="big-button active-button" onClick={this.props.startGame}> Start Game </div>}
                {/* pause button */}
                { pauseButtonEnabled && <div id="start-pause-game-button" className="big-button active-button" onClick={this.props.pauseGame}> Pause Game </div>}
                {/* resume button */}
                { resumeButtonEnabled && <div id="start-pause-game-button" className="big-button active-button"  onClick={this.props.resumeGame}> Resume Game </div>}

                {/* settings screen popup */}
                <Modal
                    open={this.state.showSettings}
                    closeAfterTransition
                    BackdropComponent={Backdrop}
                    BackdropProps={{
                        timeout: 500,
                    }}
                >
                    <Fade in={this.state.showSettings}>
                        < GameSettingModal close={this.toggleSettings}
                                           game={this.props.game}
                                           saveSettings={this.saveSettings}
                                           skipHandEnabled={skipHandEnabled}
                                           changePlayersBalances={changePlayersBalances}
                                           SkipHand={this.SkipHand}
                                           approveRebuy={this.props.approveRebuy}
                                           approveJoin={this.props.approveJoin}
                                           declineJoin={this.props.declineJoin}
                                           declineRebuy={this.props.declineRebuy}/>
                    </Fade>
                </Modal>

                {/* logs screen popup */}
                <Modal
                    open={this.state.showLogs}
                    closeAfterTransition
                    BackdropComponent={Backdrop}
                    BackdropProps={{
                        timeout: 500,
                    }}>
                    <Fade in={this.state.showLogs} toggleLogs={this.toggleLogs}>
                        <LogsScreen logs={game.logs} />
                    </Fade>
                </Modal>



                {/* player setting modal */}
                <Modal
                    open={this.state.showPlayerSettings}
                    closeAfterTransition
                    BackdropComponent={Backdrop}
                    BackdropProps={{
                        timeout: 500,
                    }}>
                    <Fade in={this.state.showPlayerSettings}>

                        <div id="player-settings-modal">
                            <div id="player-settings-modal-close-x" onClick={this.togglePlayerSettings}>X</div>
                           <div id="player-settings-header">
                               Player Preferences
                           </div>
                            <div id="Deck-Style-selection">
                                Deck Style:
                                <div id="two-colors-button"
                                     className={`base-Deck-Style ${this.state.playerPreferences.twoColors ? 'selected-Deck-Style': 'unselected-Deck-Style'}` }
                                     onClick={()=>{
                                        const newPlayerPreferences = {...this.state.playerPreferences};
                                        newPlayerPreferences.twoColors = true;
                                        localStorage.setItem('playerPreferences', JSON.stringify(newPlayerPreferences));
                                        this.setState({playerPreferences:newPlayerPreferences})
                                    }}> 2 colors</div>

                                 <div id="four-colors-button" className={`base-Deck-Style ${!this.state.playerPreferences.twoColors ? 'selected-Deck-Style':'unselected-Deck-Style'}` } onClick={()=>{
                                    const newPlayerPreferences = {...this.state.playerPreferences};
                                     newPlayerPreferences.twoColors = false;
                                    localStorage.setItem('playerPreferences', JSON.stringify(newPlayerPreferences));


                                    this.setState({playerPreferences:newPlayerPreferences})
                                }}>4 colors</div>


                                <div id="Deck-Style-card1" ><Card playerPreferences={this.state.playerPreferences} card={"AC"}/></div>
                                <div id="Deck-Style-card2" ><Card playerPreferences={this.state.playerPreferences} card={"AS"}/></div>
                                <div id="Deck-Style-card3" ><Card playerPreferences={this.state.playerPreferences} card={"AH"}/></div>
                                <div id="Deck-Style-card4" ><Card playerPreferences={this.state.playerPreferences} card={"AD"}/></div>


                            </div>
                        </div>
                    </Fade>
                </Modal>




                <div id="chat-header" > <span className="shortcut">M</span>essages </div>
                {/* chat box input */}
                <input id="chat-input"
                       type="text"
                       value={this.state.chatMessage}

                       onFocus={()=>{this.setState({ chatFocused:true })}}
                       onBlur={()=>{this.setState({ chatFocused:false })}}

                       onChange={(e)=>this.setChatMessage(e.target.value)}
                        onKeyUp={(event)=>{

                            event.preventDefault();
                            if (event.keyCode === 13) {
                                this.onSendMessage();
                                setTimeout(()=>{
                                    document.getElementById("chat-input").focus();
                                },120)
                            }
                        }}
                />
                {/* chat box send button */}
                <div id="send-message-button" onClick={()=>{
                    this.onSendMessage();
                    this.setState({chatFocused:false});
                }} >send</div>
                {/* chat box input */}
                <div id="messages-box">
                    {messages}
                </div>

                {game.paused ? <GamePauseScreen  resumeGame={this.props.resumeGame}
                                                 isAdmin={this.props.isAdmin}
                                                 game={this.props.game}/> : <div/>}
            </div>
        );

    }
}

export default OnlineGame;


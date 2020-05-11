/* eslint-disable jsx-a11y/img-redundant-alt */
/* eslint-disable jsx-a11y/img-has-alt */
import React, { Component } from 'react';
import LinearProgress from '@material-ui/core/LinearProgress';
import PlayerInfo from '../containers/PlayerInfo';
import Card from "../containers/Card";
import ShoppingCartIcon from '@material-ui/icons/ShoppingCart';
import AccessibilityNewIcon from '@material-ui/icons/AccessibilityNew';
import DnsIcon from '@material-ui/icons/Dns';
import LinkIcon from '@material-ui/icons/Link';
import SettingsIcon from '@material-ui/icons/Settings';
import ReceiptIcon from '@material-ui/icons/Receipt';
import { withStyles } from '@material-ui/core/styles';
import FormControl from '@material-ui/core/FormControl';
import InputLabel from '@material-ui/core/InputLabel';
import MenuItem from '@material-ui/core/MenuItem';
import Select from '@material-ui/core/Select';
import Modal from '@material-ui/core/Modal';
import Backdrop from '@material-ui/core/Backdrop';
import Fade from '@material-ui/core/Fade';
import Slider from '@material-ui/core/Slider';


import EmojiPeopleIcon from '@material-ui/icons/EmojiPeople';

import CancelIcon from '@material-ui/icons/Cancel';
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


const SECOND = 1000;
const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const serverPrefix = window.location.origin.indexOf('localhost') >= 0 ?  'http://localhost:3000' : window.location.origin;

class OnlineGame extends Component {

    onAdminChange = (adminId)=>{
        const adminName = this.props.game.players.find(p=>p.id === adminId).name;

        this.setState({adminId, adminName})
    }
    getShowableTime = (startDate) =>{
        if (!startDate){
            return null;
        }
        const diff = (new Date()).getTime() - startDate;
        const totalSeconds =  Math.floor(diff / SECOND);

        const days = Math.floor(totalSeconds / DAY);
        let reminder = totalSeconds - days * DAY;


        let hours = Math.floor(reminder / HOUR);
        reminder -=  hours * HOUR;

        hours = hours + days * 24;
        const minutes =  Math.floor(reminder / MINUTE);
        const seconds = reminder - minutes * MINUTE;

        const result = {
            days: days>9 ? `${days}` : `0${days}`,
            hours:hours>9 ? `${hours}` : `0${hours}`,
            minutes:minutes>9 ? `${minutes}` : `0${minutes}`,
            seconds:seconds>9 ? `${seconds}` : `0${seconds}`,
        };
        return `${result.hours}:${result.minutes}:${result.seconds}`;
    }

    toggleRaiseButton = ()=>{
        this.setState({raiseEnabled:!this.state.raiseEnabled, raiseValue: this.getMinRaise()})
    };

    toggleSettings = ()=>{
        this.setState({showSettings:!this.state.showSettings})
    };

    toggleLogs = ()=>{
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

    saveSettings = ()=>{
        this.props.updateGameSettings(this.state.time,this.state.smallBlind,this.state.bigBlind, this.state.adminId);
        this.setState({showSettings:false})
    }

    SkipHand = ()=>{
        this.props.SkipHand();
        this.setState({showSettings:false})
    }

    onSendMessage = ()=>{
        this.props.sendMessage(this.state.chatMessage);
        this.setState({chatMessage:''});
    }

    toggleRebuyButton = ()=>{
        if (this.state.rebuySectionOpen){
            this.rebuyValue = null;
            this.setState({rebuySectionOpen:false, rebuyValue: null });

        }else{

            this.setRebuy(Number.MAX_VALUE);
        }
    };

    sitStand = ()=>{
        if (this.state.me.sitOut){
            this.props.sitBack();
        } else{
            this.props.standUp();
        }
    };

    rebuy = ()=>{
        if (this.state.rebuyValue === 0){
            return this.props.showAlertMessage('Rebuy is not possible');
        }

        if (this.state.rebuyEnabled){
            this.props.rebuy(this.state.rebuyValue);
        }else{
            this.rebuyValue = this.state.rebuyValue;
            this.props.showAlertMessage('Rebuy request sent')

        }
        this.setState({rebuySectionOpen:false, rebuyValue:null});

    };

    constructor(props) {
        super(props);
        this.state = {
            clockMessage: '',
            chatMessage: '',
            communityCards:[],
            raiseEnabled: false,
            raiseValue: props.game.bigBlind,
            userTimer:0,
            options:[],
            rebuyValue: null,
            checkFoldPressed: false,
            showSettings: false,
            rebuySectionOpen: false,
            showInfoScreen: false,
            showLogs: false,
            me:{},
            time: props.game.time,
            smallBlind: props.game.smallBlind,
            bigBlind: props.game.bigBlind,
            adminId: props.game.players.find(p=>p.admin).id,
            adminName: props.game.players.find(p=>p.admin).name,
        }

        setTimeout(()=>{
            this.onGameUpdate(props.game);
        },300);
    }

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

    onGameUpdate = (game) =>{
        let rebuyEnabled = false;
        const userTimer = game.currentTimerTime;
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

        if (game.startDate){

            if (this.timerInterval) {
                clearInterval(this.timerInterval);
            }
            this.timerInterval = setInterval(()=>{
                let newUserTimer = this.state.userTimer;
                newUserTimer -= 0.25;
                if (newUserTimer < 0){
                    newUserTimer = 0;
                    setImmediate(()=>clearInterval(this.timerInterval));
                }
                this.setState({ userTimer: newUserTimer});
            },250);


            if (this.clockInterval) {
                clearInterval(this.clockInterval);
            }
            this.clockInterval = setInterval(()=>{
                if (this.props.game){
                    const clockMessage = this.getShowableTime(this.props.game.startDate);
                    const handTime = this.getShowableTime(this.props.game.handStartDate);
                    this.setState({ clockMessage, handTime});
                }
            },1000)
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
        const newState = {
            me,
            showingCards,
            cheapLeader,
            userTimer,
            isMyTurn,
            options,
            raiseEnabled: false,
            userHand,
            rebuyEnabled,
            amountToCall,
            raiseValue: this.getMinRaise(),
            adminId: this.props.game.players.find(p=>p.admin).id,
            adminName: this.props.game.players.find(p=>p.admin).name,
            checkFoldPressed,
        };
        if (!rebuyEnabled){
            newState.rebuyValue = null;
            newState.rebuySectionOpen = false;
        }else{
            if ( this.rebuyValue){
                this.props.rebuy(this.rebuyValue);
                this.rebuyValue=null;

            }
        }

        this.setState(newState);

    }

    componentDidMount() {
        this.props.registerGameUpdatedCallback(this.onGameUpdate);
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
        return this.state.me.balance + this.state.me.pot[this.props.game.gamePhase] ;
    };

    setRaiseValue = (newVal) =>{
        console.log('setRaiseValue, newVal:',newVal)
        newVal = Math.floor(newVal);
        const minRaise = this.getMinRaise();
        const maxRaise = this.getMaxRaise();
        const raiseValue = newVal < (minRaise) ? minRaise : (newVal > (maxRaise) ? maxRaise : newVal )
        console.log('setRaiseValue, minRaise:',minRaise)
        console.log('setRaiseValue, maxRaise:',maxRaise)
        console.log('setRaiseValue, raiseValue:',raiseValue)

        this.setState({raiseValue});
    };


    getTimeLeft = ()=>{
        const {userTimer} = this.state;
        if (!userTimer){
            return '';
        }
        let minutes =  Math.floor(userTimer / MINUTE).toFixed(0);
        let seconds = (userTimer - minutes * MINUTE).toFixed(0);
        minutes = minutes>9 ? `${minutes}` : `0${minutes}`;
        seconds = seconds>9 ? `${seconds}` : `0${seconds}`;
        return `${minutes}:${seconds}`
    }

    getTimeLeftValue = ()=>{
        const {time} = this.props.game;
        const userTimer = this.state.userTimer || 0;

        const val = userTimer * 100 / time;

        return val < 0 ? 0 : (val > 100 ? 100 : val)
    }

    checkFold = ()=>{
        console.log('### setting checkFoldPressed:', !this.state.checkFoldPressed)
        this.setState({checkFoldPressed: !this.state.checkFoldPressed});
    }
    fold = ()=>{
        if (this.state.options.includes('Check')){
            if (confirm("There is no Raise, are you shure you want to Fold?")){
                return this.props.action('Fold');
            }
        }else{
            return this.props.action('Fold');
        }
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
        console.log('raise',this.state.raiseValue)
        return this.props.action('Raise',this.state.raiseValue);
    };


    setRebuy= (val) =>{
        const maxBalance = Math.max(...this.props.game.players.map(p => p.balance));
        const maxRebuy = maxBalance - this.state.me.balance;
        const minRebuy = maxRebuy > 5 * this.props.game.bigBlind ? 5 * this.props.game.bigBlind : maxRebuy;

        const rebuyValue = val < minRebuy ? minRebuy : (val > maxRebuy ?  maxRebuy : val);
        this.setState({rebuyValue, rebuySectionOpen:true})
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
    render() {
        const {clockMessage,handTime, options, cheapLeader, me} = this.state;
        const {game} = this.props;
        const { pendingJoin, pendingRebuy} = game;
        const showPendingIndication = this.props.isAdmin && ((pendingJoin.length >0 || (pendingRebuy.length >0)));
        const pendingIndicationCount = pendingJoin.length + pendingRebuy.length;
        const { pot, smallBlind, bigBlind, players, startDate,hand, board} = game;
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
        const quitEnabled = me && ((!me.admin && (me.fold || me.sitOut || !startDate)) || (me.admin && (game.players.length === 1)));
        const standSitEnabled = startDate && me && (me.sitOut || me.fold);

        const startButtonEnabled = this.props.isAdmin && !startDate && players.length>1;
        const pauseButtonEnabled = this.props.isAdmin && startDate && !game.paused && game.handOver;
        const resumeButtonEnabled = this.props.isAdmin && game.paused;
        const gamePaused = game.paused;
        const messages = this.props.messages;
        return (
            <div id="online-game-screen" >
                {/* game time */}
                <div id="clock"> {clockMessage && <span>{ clockMessage }</span>}</div>
                {/* blinds data */}
                <div id="blinds-data">BLINDS: { smallBlind}/ {bigBlind}</div>
                {/* hand count + time */}
                {!gamePaused && <div id="hand-time">
                    {hand && hand >0 ? <span>Hand #{hand} </span> :<div/> }
                    {handTime ? <span>: { handTime }</span> : <div/>}
                </div>}
                {/* time left to talk */}
                { !gamePaused && <div id="hand-clock"> { this.getTimeLeft()}</div>}
                {/* time left to talk progess bar */}
                { !gamePaused && hand && hand >0 ? <LinearProgress id="hand-clock-progress" variant="determinate" value={this.getTimeLeftValue()} /> :<div/> }
                {/* your turn indication */}
                { !gamePaused && game.playersTurn && <div id="your-turn-indication"> <ul><li> Your Turn</li></ul></div>}
                {/* table image */}
                <img id="table-image" src="table.png" />
                {/* pause game */}
                { gamePaused && <div><div id="game-pause-indication"  >וו</div><div id="game-pause-indication-text"  >Game Paused</div></div>}

                {/* players */}
                {players.map((player,index)=> <PlayerInfo key={player.id} admin={me.admin} isMe={player.id === me.id} game={game} player={player} index={index} winningHandCards={winningHandCards} kickOutPlayer={this.props.kickOutPlayer}/>)}
                {/* game pot */}
                {Boolean(pot) &&  <div id="community-pot">{pot}</div>}
                {/* game board */}
                {board && <div id="community-cards">
                    <div id="community-card-deck1" ><Card /></div>
                    <div id="community-card-deck2" ><Card /></div>
                    <div id="community-card-deck3" ><Card /></div>
                    {board[0] && <div id="community-card-1" className={winningHandCards.includes(board[0]) ? 'highlight-card':''}><Card card={board[0]}/></div> }
                    {board[1] && <div id="community-card-2" className={winningHandCards.includes(board[1]) ? 'highlight-card':''}><Card card={board[1]}/></div> }
                    {board[2] && <div id="community-card-3" className={winningHandCards.includes(board[2]) ? 'highlight-card':''}><Card card={board[2]}/></div> }
                    {board[3] && <div id="community-card-4" className={winningHandCards.includes(board[3]) ? 'highlight-card':''}><Card card={board[3]}/></div> }
                    {board[4] && <div id="community-card-5" className={winningHandCards.includes(board[4]) ? 'highlight-card':''}><Card card={board[4]}/></div> }
                </div>}

                {/* action buttons */}
                { !gamePaused && <div>
                    {/* show cards button */}
                    { game.handOver && !this.state.showingCards && <div className="action-button" id="show-cards-button"  onClick={this.showCards}> Show Cards </div>}

                    { !game.handOver &&
                    <div>
                        {/* basic options */}
                        { !this.state.raiseEnabled && <div>
                            {/* Fold button */}
                            { options.includes('Fold') && <div id="fold-button" className="action-button " onClick={this.fold}> Fold </div>}
                            {/* Check button */}
                            { options.includes('Check') && <div id="check-button" className="action-button " onClick={ this.check}> Check </div>}
                            {/* Call button */}
                            { options.includes('Call') && <div id="call-button" className="action-button " onClick={this.call}> Call { this.state.amountToCall} </div>}
                            {/* Raise../Bet.. button */}
                            { options.includes('Raise') && <div id="toggle-raise-button" className="action-button " onClick={this.toggleRaiseButton}> {options.includes('Call') || game.gamePhase === 0 ? 'Raise..' :'Bet..'} </div>}

                        </div> }
                        {/* Check/Fold */}
                        { me && !me.active && !me.sitOut && !me.fold && !me.allIn && game.startDate && <div>
                            {/* Check/Fold button */}
                            <div id="check-fold-button" className={`${this.state.checkFoldPressed ? 'check-fold-button-pressed' : 'check-fold-button-not-pressed'}`} onClick={this.checkFold}> Check/Fold </div>
                        </div> }

                        {/* Raise options */}
                        { this.state.raiseEnabled && options.includes('Raise') && <div>
                                {/* Cancel Raise button */}
                                <div id="toggle-raise-button-cancel" className="action-button" onClick={this.toggleRaiseButton}> Cancel </div>
                                {/* Raise button */}
                                 <div id="raise-button" className="action-button" onClick={this.raise}> {options.includes('Call') ? 'Raise to ' :'Bet'}  {this.state.raiseValue}</div>
                                {/* Add to Raise */}
                                <div id="raise-button-add" className="action-button raise-button-add-remove" onClick={()=> this.setRaiseValue( this.state.raiseValue+game.bigBlind)}> + </div>
                                {/* Raise Input */}
                                <input id="raise-input" type="number" min={this.getMinRaise()} max={this.getMaxRaise()} value={this.state.raiseValue} onChange={(e)=> this.setRaiseValue(parseInt(e.target.value),10)}/>
                                {/* Raise Input Slider */}
                                <PrettoSlider id="raise-input-slider" valueLabelDisplay="auto" aria-label="pretto slider"   step={1} min={this.getMinRaise()} max={this.getMaxRaise()} value={this.state.raiseValue} onChange={(e,val)=> this.setRaiseValue(parseInt(val),10)} />

                                {/* Subtract to Raise */}
                                <div id="raise-button-sub" className="action-button raise-button-add-remove" onClick={()=> this.setRaiseValue( this.state.raiseValue-game.bigBlind)}> - </div>

                                {/* pot */}
                                {/*<div id="raise-button-pot" className={`action-button pot-raise-smaller-font`} onClick={()=> this.setRaiseValue(pot + (2*game.amountToCall))}> pot</div>*/}
                                {/*/!* 1/2 pot *!/*/}
                                {/*<div id="raise-button-1-2" className={`action-button pot-raise-smaller-font ${game.amountToCall > 0 ? 'inactive-button':''} `}  onClick={()=> this.setRaiseValue(pot / 2)}> 1/2 pot</div>*/}
                                {/*/!* 1/3 pot *!/*/}
                                {/*<div id="raise-button-1-3" className={`action-button pot-raise-smaller-font ${game.amountToCall > 0 ? 'inactive-button':''} `}  onClick={()=> this.setRaiseValue(pot / 3)}> 1/3 pot</div>*/}
                                {/* all in */}
                                <div id="all-in-button" className="action-button pot-raise-smaller-font" onClick={()=> this.setRaiseValue(this.getMaxRaise())}> All In</div>


                            </div>
                        }


                    </div>}

                </div>}
                {/* Game Link */}
                <div id={`copy-game-link-${startDate ? 'small': 'big'}`} className="copy-game-link" onClick={linkOnClick}>{startDate ? <span> <LinkIcon/><span className="left-margin">Link</span></span>:<span>Copy Game Link</span>} </div>
                {/* rebuy.. button */}
                <div id="rebuy-button" className={` ${ startDate && !cheapLeader ? 'active-button' : 'inactive-button'} `} onClick={startDate && !cheapLeader ? this.toggleRebuyButton : ()=>{}}>  { this.state.rebuySectionOpen ? <span><CancelIcon/><span className="left-margin">Cancel</span></span> :<span><ShoppingCartIcon/><span className="left-margin">Rebuy..</span></span> }  </div>

                {/* opened rebuy section */}
                {this.state.rebuySectionOpen && <div id="actual-rebuy-button" className="active-button" onClick={this.rebuy}>
                    <span><ShoppingCartIcon/><span className="left-margin">Rebuy</span></span>
                </div>}
                {this.state.rebuySectionOpen && <div id="rebuy-section"  >
                    <div>
                        <span id="rebuy-label" >Amount</span>
                    </div>
                    <div>
                        <input id="rebuy-input"
                               type="number"
                               value={this.state.rebuyValue}
                               onChange={(e)=>this.setRebuy(Math.floor(e.target.value))} />
                    </div>
                </div>}
                {/* stand-sit button */}
                <div id="stand-sit-button" className={standSitEnabled ? "active-button": "inactive-button"} onClick={standSitEnabled ? this.sitStand : ()=>{}}><AccessibilityNewIcon/><span className="left-margin">{ this.state.me.sitOut ? 'Sit Back' : 'Stand Up'}</span>  </div>
                {/* info button */}
                <div id="info-button" className="active-button" onClick={this.props.toggleShowInfo}><DnsIcon/><span className="left-margin">Info</span> </div>
                {/* quit button */}
                <div id="quit-button" className={ quitEnabled ? "active-button" : "inactive-button"} onClick={(quitEnabled ? this.props.quitGame : ()=>{})}><EmojiPeopleIcon/><span className="left-margin">Quit</span> </div>
                {/* logs button */}
                <div id="game-logs-button" className="active-button" onClick={this.toggleLogs}><ReceiptIcon/><span className="left-margin">Logs</span> </div>
                {/* settings button */}
                { this.props.isAdmin && <div id="game-settings-button" className="active-button" onClick={this.toggleSettings}><SettingsIcon/><span className="left-margin">settings</span> </div>}
                {/* creator get back his admin button */}
                { !this.props.isAdmin && me.creator && <div id="game-settings-button" className="active-button" onClick={this.props.setCreatorAsAdmin}>retrieve admin </div>}


                {/* Pending Joing/rebuy Indication */}
                { showPendingIndication && <div id="settings-pending-indication" > {pendingIndicationCount} </div>}


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
                        <div id="game-settings-modal">
                            <div id="game-settings-modal-close-x" onClick={this.toggleSettings}>X</div>
                            <div id="game-settings-modal-title">Game Settings</div>

                           <div className="game-settings-item">
                               <span className="game-settings-label">Player Time To Think:</span>
                               <input className="game-settings-input"
                                      type="number"
                                      min="10"
                                      value={this.state.time}
                                      onChange={(e)=>this.setSettingsTime(Math.floor(e.target.value))}
                                      step="10"
                               />
                               <span className="game-settings-secondary-label"> Seconds</span>
                           </div>
                            <div className="game-settings-item">
                               <span className="game-settings-label">Small Blind:</span>
                               <input className="game-settings-input"
                                      type="number"
                                      min="1"
                                      value={this.state.smallBlind}
                                      onChange={(e)=>this.setSettingsSmallBlind(Math.floor(e.target.value))}
                                      step="1"
                               />
                           </div>
                            <div className="game-settings-item">
                               <span className="game-settings-label">Big Blind:</span>
                               <input className="game-settings-input"
                                      type="number"
                                      min={this.state.smallBlind}
                                      value={this.state.bigBlind}
                                      onChange={(e)=>this.setSettingsBigBlind(Math.floor(e.target.value))}
                                      step="1"
                               />
                           </div>
                            {(this.props.game.players.length >1) &&  <div className="game-settings-item">
                                <span className="game-settings-label">Select Game Admin:</span>
                                <Select

                                    id="select-admin-dropdown"
                                    value={this.state.adminId}
                                    onChange={(e) => this.onAdminChange(e.target.value)} >
                                    {this.props.game.players.map(player => {
                                        return  <MenuItem value={player.id}>{ player.name}</MenuItem>
                                    })}

                                </Select>
                           </div>}

                           <div id="game-settings-save-button" onClick={this.saveSettings}> Save Settings </div>


                            {(skipHandEnabled) && <div id="force-skip-hand-button" className="active-button" onClick={this.SkipHand}>Force Skip Hand</div>}

                            {showPendingIndication && <div id="pending-requests">
                                <div id="pending-requests-header">{pendingIndicationCount} pending requests</div>
                                <div id="pending-requests-body">
                                    {pendingJoin.map(joinData =>{
                                        return <div key={`join_${joinData.playerId}`} className="pending-row"><span className="pending-name">{joinData.name}</span> has requested to join the game with an initial balance of<span className="pending-number"> {joinData.balance}</span> <span className="approve-pending" onClick={()=>this.props.approveJoin(joinData)}> Approve</span><span className="decline-pending" onClick={()=>this.props.declineJoin(joinData)}> Decline</span>   </div>
                                    }) }
                                    {pendingRebuy.map(rebuyData =>{
                                        console.log('rebuyData',rebuyData)
                                        return <div key={`rebuy_${rebuyData.playerId}`} className="pending-row"><span className="pending-name">{rebuyData.name}</span>  has requested to rebuy an extra <span className="pending-number">{rebuyData.amount}</span><span className="approve-pending" onClick={()=>this.props.approveRebuy(rebuyData)}> Approve</span><span className="decline-pending" onClick={()=>this.props.declineRebuy(rebuyData)}> Decline</span>  </div>
                                    }) }


                                </div>
                            </div>}
                        </div>
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
                    <Fade in={this.state.showLogs}>

                        <div id="game-logs-modal">
                            <div id="game-logs-modal-close-x" onClick={this.toggleLogs}>X</div>
                            {this.props.logs}
                        </div>
                    </Fade>
                </Modal>

                {/* chat box input */}
                <input id="chat-input"
                       type="text"
                       value={this.state.chatMessage}
                       onChange={(e)=>this.setChatMessage(e.target.value)}
                        onKeyUp={(event)=>{

                            event.preventDefault();
                            if (event.keyCode === 13) {
                                this.onSendMessage();
                            }
                        }}
                />
                {/* chat box send button */}
                <div id="send-message-button" onClick={this.onSendMessage} >send</div>
                {/* chat box input */}
                <div id="messages-box">
                    {messages}
                </div>
            </div>
        );

    }
}

export default OnlineGame;
// todo: chat box: and add each incoming message event


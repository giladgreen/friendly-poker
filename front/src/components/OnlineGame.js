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
import SendIcon from '@material-ui/icons/Send';

import EmojiPeopleIcon from '@material-ui/icons/EmojiPeople';

import CancelIcon from '@material-ui/icons/Cancel';


const SECOND = 1000;
const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const serverPrefix = window.location.origin.indexOf('localhost') >= 0 ?  'http://localhost:3000' : window.location.origin;

class OnlineGame extends Component {

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
        this.setState({raiseEnabled:!this.state.raiseEnabled, raiseValue: this.state.game ? this.state.game.bigBlind : 1})
    };

    onSendMessage = ()=>{
        this.props.sendMessage(this.state.chatMessage);
        this.setState({chatMessage:''});
    }

    toggleRebuyButton = (ignore)=>{
        if (ignore){
            return;
        }
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
            raiseValue:1,
            userTimer:0,
            options:[],
            rebuyValue: null,
            rebuySectionOpen: false,
            showInfoScreen: false,
            me:{}
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
            console.log('## me',me)
            console.log('## me.pot',me.pot)
            console.log('## game',game)
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
    }

    setRaiseValue = (newVal) =>{
        newVal = Math.floor(newVal);
        const minRaise = 2 * parseInt(this.props.game.amountToCall, 10);
        const maxRaise = this.props.game.players[this.getActiveIndex(this.props.game.players)].balance;
        const raiseValue = newVal < (minRaise) ? minRaise : (newVal > (maxRaise) ? maxRaise : newVal )
        this.setState({raiseValue});
    }

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

    fold = ()=>{
        return this.props.action('Fold');
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
        return this.props.action('Raise',this.state.raiseValue);
    };

    getMessage = (messageObject)=>{
        const {time, name, names, balance, amount, hand, text,playerIndex} = messageObject;
        let message = null;
        if (messageObject.action === 'game_started'){
            message = `game started by ${name}`;
        }
        if (messageObject.action === 'won_without_showdown'){
            message = `${name} won ${amount} - no show-down`;
        }
        if (messageObject.action === 'won_with_showdown'){
            message = `${name} won ${amount} with ${hand}`;
        }
        if (messageObject.action === 'split_win'){
            message = `${names} won ${amount} each with ${hand}`;
        }
        if (messageObject.action === 'join'){
            message = `${name} has join the game, initial buy-in: ${balance}`;
        }
        if (messageObject.action === 'rebuy'){
            message = `${name} did a rebuy of ${amount}`;
        }



        if (['Flop','Turn','River'].includes(messageObject.action)){
            message = `${messageObject.action}. ${messageObject.board.map(card=> card.replace('T','10')).join(',')}`;
        }

        if (['game_resumed','game_paused'].includes(messageObject.action)){
            message = messageObject.popupMessage;
        }
        if (messageObject.action === 'usermessage'){
            console.log('playerIndex',playerIndex)
            return <div key={`msg_${time}_${message}`}>
                <span className="msg-time" >{time}</span>
                <span className={`msg-text-player-name msg-text-player-name-color${playerIndex}`}>{name}:</span>
                <span className="msg-text">{text}</span>  </div>
        }
        if (message === null){
            return <div/>;
        }

        return <div key={`msg_${time}_${message}`}>
            <span className="msg-time" >{time}</span>
            <span className="msg-text">{message}</span>
        </div>

    }

    setRebuy= (val) =>{
        const maxBalance = Math.max(...this.props.game.players.map(p => p.balance));
        const maxRebuy = maxBalance - this.state.me.balance;
        const minRebuy = maxRebuy > 5 * this.props.game.bigBlind ? 5 * this.props.game.bigBlind : maxRebuy;

        const rebuyValue = val < minRebuy ? minRebuy : (val > maxRebuy ?  maxRebuy : val);
        this.setState({rebuyValue, rebuySectionOpen:true})
    };

    render() {
        const {clockMessage,handTime, options, cheapLeader, me} = this.state;
        const {game} = this.props;

        const { pot, smallBlind, bigBlind, players, time, startDate,hand, board} = game;
        const winningHandCards = game.handOver && game.winningHandCards && game.winningHandCards.cards ? game.winningHandCards.cards : [];
        //const pres = (100 * userTimer / time).toFixed(0) - 1;
        const gameLink = `${serverPrefix}?gameid=${game.id}`;

        const linkOnClick = ()=>{
            const el = document.createElement('textarea');
            el.value = gameLink;
            document.body.appendChild(el);
            el.select();
            document.execCommand('copy');
            document.body.removeChild(el);
            this.props.showAlertMessage('link copied')
        };

        const gameLinkDiv = <div id={`copy-game-link-${startDate ? 'small': 'big'}`} className="copy-game-link" onClick={linkOnClick}>{startDate ? <span> <LinkIcon/><span className="left-margin">Link</span></span>:<span>Copy Game Link</span>} </div>;
        const rebuyButton = startDate ? <div id="rebuy-button" className={` ${ cheapLeader ? 'disabled-button':'active-button'} `} onClick={()=>this.toggleRebuyButton(cheapLeader)}>  { this.state.rebuySectionOpen ? <span><CancelIcon/><span className="left-margin">Cancel</span></span> :<span><ShoppingCartIcon/><span className="left-margin">Rebuy..</span></span> }  </div> : <div/>;
        const actualRebuyButton = this.state.rebuySectionOpen ? <div id="actual-rebuy-button" className="active-button" onClick={this.rebuy}> <span><ShoppingCartIcon/><span className="left-margin">Rebuy</span></span>  </div> : <div/>;
        const rebuySectionDiv = this.state.rebuySectionOpen ? <div id="rebuy-section"  >
            <div>
                <span id="rebuy-label" >Amount</span>
            </div>
            <div>
            <input id="rebuy-input"
                   type="number"
                   value={this.state.rebuyValue}
                   onChange={(e)=>this.setRebuy(Math.floor(e.target.value))} />
            </div>
        </div> : <div/>;

        const standButton = startDate ? <div id="stand-sit-button" className="active-button" onClick={this.sitStand}><AccessibilityNewIcon/><span className="left-margin">{ this.state.me.sitOut ? 'Sit Back' : 'Stand Up'}</span>  </div> : <div/>;
        const quitButton = <div id="quit-button" className="active-button" onClick={this.props.quitGame}><EmojiPeopleIcon/><span className="left-margin">Quit</span> </div>;
        const infoButton = <div id="info-button" className="active-button" onClick={this.props.toggleShowInfo}><DnsIcon/><span className="left-margin">Info</span> </div>;


        const startGameButton = this.props.isCreator && !startDate && players.length>1 ?
            <div  id="start-pause-game-button" className="big-button active-button" onClick={this.props.startGame}> Start Game </div>
            : <div/>;

        const pauseGameButton = this.props.isCreator && startDate && !game.paused && game.handOver ?
            <div id="start-pause-game-button" className="big-button active-button" onClick={this.props.pauseGame}> Pause Game </div>
            : <div/>;


        const resumeGameButton = this.props.isCreator && game.paused ?
            <div id="start-pause-game-button" className="big-button active-button"  onClick={this.props.resumeGame}> Resume Game </div>
            : <div/>;


        const messages = this.props.messages.map(messageObject=>this.getMessage(messageObject));

        return (
            <div id="online-game-screen" >

                <div id="blinds-data">BLINDS: { smallBlind}/ {bigBlind}</div>

                <div id="clock"> {clockMessage && <span>{ clockMessage }</span>}</div>
                {!game.paused && <div id="hand-time">
                    {hand && hand >0 ? <span>Hand #{hand} </span> :<div/> }
                    {handTime ? <span>: { handTime }</span> : <div/>}
                </div>}

                { !game.paused && <div id="hand-clock"> { this.getTimeLeft()}</div>}
                { !game.paused && hand && hand >0 ? <LinearProgress id="hand-clock-progress" variant="determinate" value={this.getTimeLeftValue()} /> :<div/> }
                { !game.paused && <div id="player-hand" >{ this.state.userHand && <span>{`You Got ${this.state.userHand}`}</span>}</div>}

                { !game.paused && game.playersTurn && <div id="your-turn-indication"> Your Turn</div>}
                <img id="table-image" src="table.png" />
                { game.paused && <div id="game-pause-indication"  >וו</div>}
                { game.paused && <div id="game-pause-indication-text"  >Game Paused</div>}

                {players.map((player,index)=> <PlayerInfo key={player.id} game={game} player={player} index={index} winningHandCards={winningHandCards} />)}

                {Boolean(pot) &&  <div id="community-pot">
                    {pot}
                </div>}
                {board && <div id="community-cards">
                    {board[0] && <div id="community-card-1" className={winningHandCards.includes(board[0]) ? 'highlight-card':''}><Card card={board[0]}/></div> }
                    {board[1] && <div id="community-card-2" className={winningHandCards.includes(board[1]) ? 'highlight-card':''}><Card card={board[1]}/></div> }
                    {board[2] && <div id="community-card-3" className={winningHandCards.includes(board[2]) ? 'highlight-card':''}><Card card={board[2]}/></div> }
                    {board[3] && <div id="community-card-4" className={winningHandCards.includes(board[3]) ? 'highlight-card':''}><Card card={board[3]}/></div> }
                    {board[4] && <div id="community-card-5" className={winningHandCards.includes(board[4]) ? 'highlight-card':''}><Card card={board[4]}/></div> }

                </div>}
                <div id="buttons">
                    { !game.paused && game.handOver && !this.state.showingCards && <div id="show-cards-button" className="big-button active-button" onClick={this.showCards}> Show Cards </div>}
                    { !game.paused && options.length>0 && <div id="fold-button" className={`big-button ${options.includes('Fold') ? 'active':'inactive'}-button`} onClick={this.fold}> Fold </div>}
                    { !game.paused && options.length>0 && <div id="check-button" className={`big-button ${options.includes('Check') ? 'active':'inactive'}-button`} onClick={this.check}> Check </div>}
                    { !game.paused && options.length>0 && <div id="call-button" className={`big-button ${options.includes('Call') ? 'active':'inactive'}-button`} onClick={this.call}> Call {this.state.amountToCall} </div>}
                    { !game.paused && options.length>0 && <div id="toggle-raise-button" className={`big-button ${options.includes('Raise') ? 'active':'inactive'}-button`} onClick={this.toggleRaiseButton}> Raise... </div>}
                    { !game.paused && options.length>0 && this.state.raiseEnabled && <div id="raise-buttons">
                        { !game.paused &&    <div id="raise-button" className="big-button active-button" onClick={this.raise}> Raise {this.state.raiseValue}</div>}
                        { !game.paused &&   <div id="raise-button-add-1" className="big-button active-button raise-button-add-remove" onClick={()=> this.setRaiseValue( this.state.raiseValue+game.bigBlind)}> +{game.bigBlind}</div>}

                        { !game.paused &&   <input id="raise-input" type="number" min={bigBlind} value={this.state.raiseValue} onChange={(e)=> this.setRaiseValue(parseInt(e.target.value),10)}/>}

                        { !game.paused &&   <div id="raise-button-sub-1" className="big-button active-button raise-button-add-remove" onClick={()=> this.setRaiseValue( this.state.raiseValue-game.bigBlind)}> -{game.bigBlind}</div>}

                        { !game.paused &&   <div id="raise-button-2-3" className="big-button active-button raise-button-pot-ref" onClick={()=> this.setRaiseValue(2* pot / 3)}> 2/3 pot</div>}
                        { !game.paused &&   <div id="raise-button-1-2" className="big-button active-button raise-button-pot-ref" onClick={()=> this.setRaiseValue(pot / 2)}> 1/2 pot</div>}
                        { !game.paused &&   <div id="raise-button-1-3" className="big-button active-button raise-button-pot-ref" onClick={()=> this.setRaiseValue(pot / 3)}> 1/3 pot</div>}

                        { !game.paused && me.balance &&  <div id="all-in-button" className="big-button active-button raise-button-pot-ref" onClick={()=> this.setRaiseValue(me.balance)}> All In</div>}

                        {/*{ !game.paused &&   <div id="raise-button-5x" className="big-button active-button raise-button-pot-ref" onClick={()=> this.setRaiseValue(bigBlind * 5)}> 5BB</div>}*/}
                        {/*{ !game.paused &&   <div id="raise-button-3x" className="big-button active-button raise-button-pot-ref" onClick={()=> this.setRaiseValue(bigBlind * 3)}> 3BB</div>}*/}
                        {/*{ !game.paused &&   <div id="raise-button-2x" className="big-button active-button raise-button-pot-ref" onClick={()=> this.setRaiseValue(bigBlind * 2)}> 2BB</div>}*/}


                    </div>}


                </div>
                {gameLinkDiv}
                {rebuyButton}
                {actualRebuyButton}
                {rebuySectionDiv}
                {standButton}
                {quitButton}
                {infoButton}

                {startGameButton}
                {pauseGameButton}
                {resumeGameButton}


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

                <div id="send-message-button" onClick={this.onSendMessage} >send</div>

                <div id="messages-box">
                    {messages}
                </div>
            </div>
        );

    }
}

export default OnlineGame;
// todo: chat box: and add each incoming message event


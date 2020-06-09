/* eslint-disable jsx-a11y/img-redundant-alt */
/* eslint-disable jsx-a11y/img-has-alt */
import EmojiEventsIcon from '@material-ui/icons/EmojiEvents';
import React, { Component } from 'react';
import Loader from "../containers/Loader";
const isMobile = ( /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));

class JoinGameScreen extends Component {

    constructor(props) {
        super(props);
        const name = localStorage.getItem('myName') || '';
        document.title = `F.L.O.P - ${name}`;
        const balances = props.game.players.filter(p=>Boolean(p)).map(p=>p.balance);
        const maxPlayerBalance = Math.max(...balances);
        let maxBuyIn = props.game.requireRebuyApproval ? 50 * maxPlayerBalance : maxPlayerBalance * 3;
        maxBuyIn = maxBuyIn - (maxBuyIn % props.game.bigBlind);
        maxBuyIn = maxBuyIn - (maxBuyIn % 10);

        const minBuyIn = 10 * props.game.bigBlind;
        this.takenNames = props.game.players.filter(p=>Boolean(p)).map(p=>p.name);
        const buyIn =  props.game.defaultBuyIn;
        this.state = {
            name,
            buyIn,
            showNameError:name.length === 0,
            showAmountError:false,
            joinRequestSent: false,
            maxBuyIn,
            minBuyIn,
            gameOptions:[
                {value: 1, name: 'No Limit Texas Holdem', type:'TEXAS'},
                {value: 2, name: 'Pot Limit Omaha', type: 'OMAHA'},
                {value: 3, name: 'No Limit Pineapple', type: 'PINEAPPLE'},
                {value: 4, name: "Dealer's Choice", type: 'DEALER_CHOICE'},
            ],
        }
    }

    onJoin = (positionIndex)=>{

        if (this.state.showAmountError || this.state.showNameError || !this.state.name || this.state.name.length === 0){
            return;
        }

        localStorage.setItem('myName',this.state.name);
        document.title = `F.L.O.P - ${this.state.name}`;
        this.props.joinGame({
            name: this.state.name,
            balance:parseInt(this.state.buyIn, 10),
            positionIndex
        });


        this.setState({showAmountError:false, showNameError:false});
    };

    setName = (name) =>{
        const showNameError = this.takenNames.includes(name) || name.length === 0 || name.length > 9;
        this.setState({name, showNameError})
    };

    setBuyIn = (buyIn) =>{
        buyIn = buyIn > 0 ? buyIn : 0;
        const showAmountError = buyIn < this.state.minBuyIn || buyIn > this.state.maxBuyIn;
        this.setState({buyIn, showAmountError})
    };


    render() {
        if (this.state.joinRequestSent){
            return <Loader/>;
        }
        const {game}=this.props;
        const {smallBlind, bigBlind, time, players, gameType, timeBankEnabled }=game;
        const playersCount = players.filter(p=>Boolean(p)).length;
        const canJoin = playersCount < game.maxPlayers && !this.state.showNameError && this.state.name && this.state.name.length>0 && this.state.buyIn > 0 && !this.state.showAmountError;

        return (
            <div id="join-screen"  >

                    <div id="join-game-section"  >
                        <header>
                            Join Game
                        </header>
                        <div>{this.state.gameOptions.find(option=>option.type === gameType).name}</div>

                        <div>
                            Small Blind: {smallBlind}
                        </div>
                        <div>
                            Big Blind:  {bigBlind}
                        </div>
                        <div>
                            Decision Time Limit:  { time} seconds {timeBankEnabled ? '(Time Bank)':''}
                        </div>

                        <div id="join-screen-name-input">
                            Name: <input
                            disabled={playersCount >= game.maxPlayers}
                            className={`join-game-input
                            ${this.state.showNameError ? 'red-border red-background':''}`}
                            type="text" value={this.state.name}
                            onChange={(e)=>this.setName(e.target.value)} />
                        </div>
                        <div id="join-screen-balance-input">
                            Initial Buy-In:  <input
                            disabled={playersCount >= game.maxPlayers}
                            className={`join-game-input buy-in ${this.state.showAmountError ? 'red-border red-background':''}`}
                            type="number"
                            min={0}
                            step={bigBlind}
                            value={this.state.buyIn}
                            onChange={(e)=>this.setBuyIn(Math.floor(e.target.value))} />

                        </div>



                    </div>

                    <div id="existing-players">
                        <header>
                            {playersCount} Player{playersCount>1 ? 's':''}
                        </header>

                        <img id="join-table-image" src="table.png" />
                        {
                            players.map((player,index)=>{
                                if (player){
                                    const gamesWonId = `player-games-won-${index}`;
                                    const balanceId = `player-current-balance-${index}`;
                                    const longName = player.name.length>4;
                                    return <div key={player.id}
                                                id={`join-table-existing-player-${index+1}`}
                                                className="existing-player">
                                        {!isMobile ? <div id={gamesWonId} className="player-games-won"> {player.handsWon}<EmojiEventsIcon/></div> : <div/>}
                                        <div className={longName ? 'long-name' : 'short-name'} > {player.name}</div>
                                        {!isMobile ? <div id={balanceId} className="player-balance" >{player.balance}</div>: <div/>}
                                    </div>
                                } else{
                                    return <div key={`potential_sit_${index}`}
                                                id={`join-table-existing-player-${index+1}`}
                                                onClick={()=>this.onJoin(index)}
                                                className={canJoin ?'sit-here-button':'do-not-sit'}>
                                        {canJoin ? 'SIT' : ''}
                                    </div>
                                }

                            })
                        }


                        {playersCount >= game.maxPlayers && <div id="full-game-div">
                            <span id="full-game-text" >Game is Full</span>

                        </div>}

                    </div>

            </div>
        );

    }
}

export default JoinGameScreen;



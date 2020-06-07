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
        const balances = props.game.players.map(p=>p.balance);
        const maxPlayerBalance = Math.max(...balances);
        let maxBuyIn = props.game.requireRebuyApproval ? 50 * maxPlayerBalance : maxPlayerBalance * 3;
        maxBuyIn = maxBuyIn - (maxBuyIn % props.game.bigBlind);
        maxBuyIn = maxBuyIn - (maxBuyIn % 10);

        const minBuyIn = 10 * props.game.bigBlind;
        this.takenNames = props.game.players.map(p=>p.name);
        const buyIn =  props.game.defaultBuyIn;
        this.state = {
            name,
            buyIn,
            showNameError:false,
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
        const {smallBlind, bigBlind, time, players, gameType}=game;
        const playersCount = players.length;
        const canJoin = players.length < game.maxPlayers && !this.state.showNameError && this.state.name && this.state.name.length>0 && this.state.buyIn > 0 && !this.state.showAmountError;

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
                            Decision Time Limit:  {time} seconds
                        </div>

                        <div>
                            Name: <input
                            disabled={playersCount >= game.maxPlayers}
                            className={`join-game-input name-input 
                            ${this.state.showNameError ? 'red-border red-background':''}`}
                            type="text" value={this.state.name}
                            onChange={(e)=>this.setName(e.target.value)} />
                        </div>
                        <div>
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
                                const gamesWonId = `player-games-won-${index}`;
                                const balanceId = `player-current-balance-${index}`;
                                const longName = player.name.length>4;
                                return <div key={player.id}
                                            onMouseOver={()=>{
                                                const gamesWonElement =  document.getElementById(gamesWonId);
                                                gamesWonElement.className = gamesWonElement.className.replace('hidden', 'visible');

                                                const balanceElement =  document.getElementById(balanceId);
                                                balanceElement.className = balanceElement.className.replace('hidden', 'visible');
                                            }}
                                            onMouseOut={()=>{
                                                const gamesWonElement =  document.getElementById(gamesWonId);
                                                gamesWonElement.className = gamesWonElement.className.replace('visible', 'hidden');

                                                const balanceElement =  document.getElementById(balanceId);
                                                balanceElement.className = balanceElement.className.replace('visible', 'hidden');
                                            }}

                                            id={`join-table-existing-player-${index+1}`}
                                            className="existing-player">
                                            {!isMobile ? <div id={gamesWonId} className="player-games-won-hidden"> {player.handsWon}<EmojiEventsIcon/></div> : <div/>}
                                            <div className={longName ? 'long-name' : 'short-name'} > {player.name}</div>
                                            {!isMobile ? <div id={balanceId} className={`player-games-won-hidden ${longName ? 'player-games-won-long-name':'player-games-won-short-name'}`} >{player.balance}</div>: <div/>}
                                </div>
                            })
                        }

                        { playersCount < game.maxPlayers ?
                            players.map((player,index)=>{

                                return <div key={`join_after_${player.id}`}
                                            id={`join-after-existing-player-${index+1}`}
                                            onClick={()=>this.onJoin(index+1)}
                                            className={canJoin ?'sit-here-button':'do-not-sit'}>
                                        {canJoin ? 'SIT' : ''}
                                </div>
                            }) : <div/>
                        }
                        {canJoin && playersCount < game.maxPlayers-1 ? <div key={`join_before_first`}
                                                  id={`join-after-existing-player-${game.maxPlayers-1}`}
                                                  onClick={()=>this.onJoin(0)}
                                                  className="sit-here-button">
                            SIT
                        </div> : <div/>}

                        {playersCount >= game.maxPlayers && <div id="full-game-div">
                            <span id="full-game-text" >Game is Full</span>

                        </div>}

                    </div>

            </div>
        );

    }
}

export default JoinGameScreen;



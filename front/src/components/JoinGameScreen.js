/* eslint-disable jsx-a11y/img-redundant-alt */
/* eslint-disable jsx-a11y/img-has-alt */

import React, { Component } from 'react';
import Loader from "../containers/Loader";

class JoinGameScreen extends Component {

    constructor(props) {
        super(props);
        const name = localStorage.getItem('myName') || '';
        const maxPlayerBalance = Math.max(...props.game.players.map(p=>p.balance));
        let maxBuyIn = maxPlayerBalance * 5;
        maxBuyIn = maxBuyIn - (maxBuyIn % props.game.bigBlind);
        maxBuyIn = maxBuyIn - (maxBuyIn % 10);

        const minBuyIn = 10 * props.game.bigBlind;
        this.takenNames = props.game.players.map(p=>p.name);
        const buyIn =  maxPlayerBalance;
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
        const canJoin = players.length < 8 && !this.state.showNameError && this.state.name && this.state.name.length>0;
        console.log('this.state.gameOptions',this.state.gameOptions)
        console.log('gameType',gameType)
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
                            disabled={playersCount >= 8}
                            className={`join-game-input name-input 
                            ${this.state.showNameError ? 'red-border red-background':''}`}
                            type="text" value={this.state.name}
                            onChange={(e)=>this.setName(e.target.value)} />
                        </div>
                        <div>
                            Initial Buy-In:  <input
                            disabled={playersCount >= 8}
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

                                return <div key={player.id}
                                            id={`join-table-existing-player-${index+1}`}
                                            className={player.name.length>4 ? 'existing-player-long-name' : 'existing-player'}>
                                             {player.name}
                                </div>
                            })
                        }

                        { playersCount < 8 ?
                            players.map((player,index)=>{

                                return <div key={`join_after_${player.id}`}
                                            id={`join-after-existing-player-${index+1}`}
                                            onClick={()=>this.onJoin(index+1)}
                                            className={canJoin ?'sit-here-button':'do-not-sit'}>
                                        {canJoin ? 'SIT' : ''}
                                </div>
                            }) : <div/>
                        }
                        {canJoin && playersCount < 7 ? <div key={`join_before_first`}
                                                  id={`join-after-existing-player-7`}
                                                  onClick={()=>this.onJoin(0)}
                                                  className="sit-here-button">
                            SIT
                        </div> : <div/>}

                        {playersCount >= 8 && <div id="full-game-div">
                            <span id="full-game-text" >Game is Full</span>

                        </div>}

                    </div>

            </div>
        );

    }
}

export default JoinGameScreen;



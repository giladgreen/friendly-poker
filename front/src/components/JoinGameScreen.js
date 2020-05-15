/* eslint-disable jsx-a11y/img-redundant-alt */
/* eslint-disable jsx-a11y/img-has-alt */

import React, { Component } from 'react';
import Loader from "../containers/Loader";

class JoinGameScreen extends Component {

    constructor(props) {
        super(props);
        const name = localStorage.getItem('myName') || '';
        const maxPlayerBalance = props.game.players.length >0 ? Math.max(...props.game.players.map(p=>p.balance)) : 100 * props.game.bigBlind;
        let maxBuyIn = maxPlayerBalance - (maxPlayerBalance % props.game.bigBlind);
        maxBuyIn = maxBuyIn - (maxBuyIn % 10);
        const minBuyIn = 10 * props.game.bigBlind;
        this.takenNames = props.game.players.map(p=>p.name);
        const buyIn = props.game.players.length >0 ? maxBuyIn : 100 * props.game.bigBlind;
        this.state = {
            name,
            buyIn,
            showNameError:false,
            showAmountError:false,
            joinRequestSent: false,
            maxBuyIn,
            minBuyIn,
        }
    }

    onJoin = ()=>{

        if (this.state.showAmountError || this.state.showNameError){
            return;
        }

        localStorage.setItem('myName',this.state.name);
        this.props.joinGame({
            name: this.state.name,
            balance:parseInt(this.state.buyIn, 10)
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
        const {smallBlind, bigBlind, time, players}=this.props.game;
        const playersCount = players.length;
        return (
            <div id="join-screen"  >

                    <div id="join-game-section"  >
                        <header>
                            Join Game
                        </header>
                        <div>
                            Small Blind: {smallBlind}
                        </div>
                        <div>
                            Big Blind:  {bigBlind}
                        </div>
                        <div>
                            Time To Action:  {time} seconds
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


                        {playersCount < 8 &&<div id="join-button-div">
                            <span className={`${this.state.showAmountError || this.state.showNameError ? 'join-button-disabled' : 'join-button'}`}  onClick={this.onJoin}>Join</span>
                        </div>}
                        {playersCount >= 8 && <div id="join-button-full-game-div">
                            <span id="join-button-full-game" >Game is full</span>

                        </div>}

                    </div>

                    <div id="existing-players">
                        <header>
                            {playersCount} Player{playersCount>1 ? 's':''}
                        </header>
                        <div id="existing-players-list">
                            {
                                playersCount === 0 ? '' :

                                    players.map((player,index)=>{

                                        return <div key={player.id}
                                                    className={`${index % 2 ===0 ?'greyPlayer':'whitePlayer'} existing-player`  }>
                                           {player.name} - {player.balance}
                                        </div>
                                    })
                            }
                        </div>
                    </div>

            </div>
        );

    }
}

export default JoinGameScreen;



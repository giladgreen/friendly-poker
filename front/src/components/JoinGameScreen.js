/* eslint-disable jsx-a11y/img-redundant-alt */
/* eslint-disable jsx-a11y/img-has-alt */

import React, { Component } from 'react';
import Loader from "../containers/Loader";

class JoinGameScreen extends Component {

    constructor(props) {
        super(props);
        const name = localStorage.getItem('myName') || '';
        const maxBuyIn = Math.max(...props.game.players.map(p=>p.balance));
        this.takenNames = props.game.players.map(p=>p.name);
        const buyIn = props.game.players.length >0 ? maxBuyIn : 100 * props.game.bigBlind;
        this.state = {
            name,
            buyIn,
            showErrors:false,
            joinRequestSent: false,
            maxBuyIn,
        }
    }

    onJoin = ()=>{
        if (!this.state.name || this.state.name.length === 0 ||
            !this.state.buyIn || this.state.buyIn===0){
            this.props.showAlertMessage('all fields are mandatory');
            this.setState({showErrors:true});
            return;
        }
        if (this.takenNames.includes(this.state.name)) {
            this.props.showAlertMessage('please pick unique name');
            this.setState({showErrors:true});
            return;
        }
        localStorage.setItem('myName',this.state.name);
        this.props.joinGame({
            name: this.state.name,
            balance:parseInt(this.state.buyIn, 10)
        });


        this.setState({showErrors:false});
    };

    setName = (val) =>{
        const name = val.length <= 9 ? val : val.substr(0,9);
        this.setState({name})
    };

    setBuyIn = (val) =>{
        const min =  10 * this.props.game.bigBlind;
        const buyIn = val < this.state.maxBuyIn ? (val > min ? val : min) : this.state.maxBuyIn;
        this.setState({buyIn})
    };


    render() {
        if (this.state.joinRequestSent){
            return <Loader/>;
        }
        return (
            <div id="join-screen"  >

                    <div id="join-game-section"  >
                        <header>
                            Join Game
                        </header>
                        <div>
                            Small Blind: {this.props.game.smallBlind}
                        </div>
                        <div>
                            Big Blind:  {this.props.game.bigBlind}
                        </div>
                        <div>
                            Time To Action:  {this.props.game.time} seconds
                        </div>

                        <div>
                            Name: <input
                            disabled={this.props.game.players.length >= 8}
                            className={`join-game-input name-input 
                            ${this.state.showErrors ? 'red-border':''}`}
                            type="text" value={this.state.name}
                            onKeyUp={(event)=>{

                                event.preventDefault();
                                if (event.keyCode === 13) {
                                    this.onJoin();
                                }
                            }}

                            onChange={(e)=>this.setName(e.target.value)} />
                        </div>
                        <div>
                            Initial Buy-In:  <input
                            disabled={this.props.game.players.length >= 8}
                            className={`join-game-input buy-in ${this.state.showErrors ? 'red-border':''}`}
                            type="number"
                            value={this.state.buyIn}
                            max={Math.max(...this.props.game.players.map(p=>p.balance))}
                            onChange={(e)=>this.setBuyIn(Math.floor(e.target.value))} />

                        </div>


                        {this.props.game.players.length < 8 &&<div id="join-button-div">
                            <span id="join-button" onClick={this.onJoin}>Join</span>
                        </div>}
                        {this.props.game.players.length >= 8 && <div id="join-button-full-game-div">
                            <span id="join-button-full-game" >Game is full</span>

                        </div>}

                    </div>

                    <div id="existing-players">
                        <header>
                            {this.props.game.players.length} Player{this.props.game.players.length>1 ? 's':''}
                        </header>
                        <div id="existing-players-list">
                            {
                                this.props.game.players.length === 0 ? '' :

                                    this.props.game.players.map((player,index)=>{

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



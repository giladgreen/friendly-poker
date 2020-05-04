/* eslint-disable jsx-a11y/img-redundant-alt */
/* eslint-disable jsx-a11y/img-has-alt */

import React, { Component } from 'react';
import Loader from "../containers/Loader";

class JoinGameScreen extends Component {

    constructor(props) {
        super(props);
        const buyIn = props.game.players.length >0 ? Math.max(...props.game.players.map(p=>p.balance)) : 100 * props.game.bigBlind;
        this.state = {
            name:'',
            buyIn,
            showErrors:false,
            joinRequestSent: false,
        }
    }

    onJoin = ()=>{
        if (!this.state.name || this.state.name.length === 0 ||
            !this.state.buyIn || this.state.buyIn===0){

            this.props.showAlertMessage('all fields are mandatory');
            this.setState({showErrors:true});
            return;
        }

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


    render() {
        if (this.state.joinRequestSent){
            return <Loader/>;
        }
        return (
            <div id="join-screen"  className="container">
                <div id="two-sections" className="row">
                    <div id="join-game-section" className="col-xs-7" >
                        <header>
                            Join Game
                        </header>
                        <div>
                            Small Blind: {this.props.game.smallBlind}
                            <br/>
                            Big Blind:  {this.props.game.bigBlind}
                            <br/>
                            Time To Action:  {this.props.game.time} seconds
                        </div>
                        <div id="join-game-inputs">

                            <div>
                                Name: <input disabled={this.props.game.players.length >= 8} className={`name-input ${this.state.showErrors ? 'red-border':''}`} type="text" value={this.state.name} onChange={(e)=>this.setName(e.target.value)} />
                                <br/>
                                Initial Buy-In:  <input
                                disabled={this.props.game.players.length >= 8}
                                pattern="\d*"
                                className={`buy-in ${this.state.showErrors ? 'red-border':''}`}
                                type="number"
                                value={this.state.buyIn}
                                onChange={(e)=>this.setState({buyIn:Math.floor(e.target.value)})} />
                                <br/>
                            </div>

                        </div>
                        {this.props.game.players.length <8 &&<div id="join-button-div">
                            <span id="join-button" onClick={this.onJoin}>Join</span>
                        </div>}
                        {this.props.game.players.length >= 8 && <div id="join-button-full-game-div">
                            <span id="join-button-full-game" >Game is full</span>

                        </div>}

                    </div>

                    <div id="existing-players" className="col-xs-4">
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
            </div>
        );

    }
}

export default JoinGameScreen;



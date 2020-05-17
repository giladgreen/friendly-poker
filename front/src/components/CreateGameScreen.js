/* eslint-disable jsx-a11y/img-redundant-alt */
/* eslint-disable jsx-a11y/img-has-alt */
import Checkbox from '@material-ui/core/Checkbox';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import { withStyles } from '@material-ui/core/styles';

const WhiteCheckbox = withStyles({
    root: {
        color: 'white',
        '&$checked': {
            color: 'white',
        },
    },
    checked: {},
})((props) => <Checkbox color="default" {...props} />);

import React, { Component } from 'react';
import Select from "@material-ui/core/Select/Select";
import MenuItem from "@material-ui/core/MenuItem";

const serverPrefix = window.location.origin.indexOf('localhost') >= 0 ?  'http://localhost:3000' : window.location.origin;

class CreateGameScreen extends Component {

    constructor(props) {
        super(props);
        const name = localStorage.getItem('myName') || '';
        const privateGame = (localStorage.getItem('private-game') === 'true');
        const aprovalRequired = (localStorage.getItem('rebuy-aproval-required') === 'true');
        const SB = parseInt((localStorage.getItem('create-game-sb') || '1'), 10);
        const BB = parseInt((localStorage.getItem('create-game-bb') || '2'), 10);
        const time = parseInt((localStorage.getItem('create-game-time') || '40'), 10);
        const buyIn = parseInt((localStorage.getItem('create-game-buyIn') || '100'), 10);
        this.state = {
            name,
            privateGame,
            aprovalRequired,
            SB,
            BB,
            time,
            buyIn,
            showErrors:false,
            gameOptions:[
                {value: 1, name: 'No Limit Texas Holdem'},
                {value: 2, name: 'Pot Limit Omaha'}
            ],
            selectedGame: 1,
        }
    }

    onCreate = ()=>{
        if (!this.state.name || this.state.name.length === 0 ||
            !this.state.SB || this.state.SB === 0 ||
            !this.state.BB || this.state.BB === 0 ||
            !this.state.time || this.state.time === 0 ||
            !this.state.buyIn || this.state.buyIn===0){

            this.props.showAlertMessage('all fields are mandatory');
            this.setState({showErrors:true});
            return;
        }
        localStorage.setItem('myName',this.state.name);
        localStorage.setItem('private-game',this.state.privateGame ? 'true':'false');
        localStorage.setItem('rebuy-aproval-required',this.state.aprovalRequired ? 'true':'false');
        localStorage.setItem('create-game-sb',this.state.SB);
        localStorage.setItem('create-game-bb',this.state.BB);
        localStorage.setItem('create-game-time',this.state.time) ;
        localStorage.setItem('create-game-buyIn',this.state.buyIn);

        this.props.createGame({
            smallBlind:parseInt(this.state.SB,10),
            bigBlind:parseInt(this.state.BB, 10),
            time: parseInt(this.state.time,10),
            name:this.state.name,
            balance:parseInt(this.state.buyIn, 10),
            privateGame: this.state.privateGame,
            requireRebuyAproval: this.state.aprovalRequired,
            texas: this.state.selectedGame === 1,
            omaha: this.state.selectedGame === 2,
        });

        this.setState({showErrors:false});
    };

    setName = (val) =>{
        const name = val.length <= 9 ? val : val.substr(0,9);
        this.setState({name})
    };


    setSmallBlind = (val) =>{
        const smallBlind = val < 1 ? 1 : val;
        const bigBlind = 2 * smallBlind;
        this.setState({SB: smallBlind, BB: bigBlind})
    };


    setBigBlind = (val) =>{
        const bigBlind = val < this.state.SB ? this.state.SB : val;
        this.setState({BB: bigBlind})
    };


    setTime= (val) =>{
        const time = val < 10 ? 10 : (val > 120 ? 120 : val);
        this.setState({time})
    };


    setBuyIn= (val) =>{
        const buyIn = val < 10 * this.state.BB ? 10 * this.state.BB : (val > 100000 ? 100000 : val);
        this.setState({buyIn})
    };


    setPrivate= (e) =>{
        this.setState({privateGame: e.target.checked })
    };

    onSelectedGameChange = (selectedGame)=>{
        this.setState({selectedGame})
    }

    setAprovalRequired= (e) =>{
        this.setState({aprovalRequired: e.target.checked })
    };

    getGameCreator(game){
        let creatorName = 'N/A';
        const creator = game.players.find(p=>p.creator);
        if (creator){
            if (creator.id === this.props.playerId){
                creatorName = 'me'
            } else {
                creatorName = creator.name;
            }
        }
        return creatorName;
    }
    render() {
        const isMobile = ( /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));


        return (
            <div id="create-new-game-screen">
                <div id="create-new-game-section" className="config-screens-top-level-sections"  >
                    <div id="create-new-game-section-header" className="config-screens-top-level-sections-header">
                        Create New Online Game
                    </div>
                    <div id="create-new-game-section-body" className="config-screens-top-level-sections-body">
                        <div id="create-new-game-name-div">
                            <span id="create-new-game-name-label" className="create-new-game-labels tablecell">Name:</span>
                            <input id="create-new-game-name-input"
                                   className={this.state.showErrors ? 'red-border':''}
                                   type="text"
                                   value={this.state.name}
                                   onKeyUp={(event)=>{

                                       event.preventDefault();
                                       if (event.keyCode === 13) {
                                           this.onCreate();
                                       }
                                   }}

                                   onChange={(e)=>this.setName(e.target.value)} />

                        </div>
                        <div id="create-new-game-blinds-div">
                            <span id="create-new-game-small-blind-label" className="create-new-game-labels">Small Blind:</span>
                            <input id="create-new-game-small-blind-input"
                                   className={this.state.showErrors ? 'red-border':''}
                                   min="1"
                                   step="1"
                                   type="number"
                                   value={this.state.SB}
                                   onChange={(e)=>this.setSmallBlind(Math.floor(e.target.value))} />
                            <span id="create-new-game-big-blind-label" className="create-new-game-labels">Big Blind:</span>
                            <input id="create-new-game-big-blind-input"
                                   className={this.state.showErrors ? 'red-border':''}
                                   min={this.state.SB}
                                   step="1"
                                   type="number" value={this.state.BB}
                                   onChange={(e)=>this.setBigBlind(Math.floor(e.target.value))} />
                        </div>
                        <div id="create-new-game-action-time-div">
                            <span id="create-new-game-action-time-label" className="create-new-game-labels">Decision Time Limit:</span>
                            <input id="create-new-game-action-time-input"
                                   className={this.state.showErrors ? 'red-border':''}
                                   type="number"
                                   min="10"
                                   value={this.state.time}
                                   onChange={(e)=>this.setTime(Math.floor(e.target.value))}
                                   step="5"
                            />
                            <span className="create-new-game-labels">Seconds</span>
                        </div>
                        <div id="create-new-game-buy-in-div">
                            <span id="create-new-game-buy-in-label" className="create-new-game-labels">Initial Buy-In:</span>
                            <input id="create-new-game-buy-in-input"
                                   className={this.state.showErrors ? 'red-border':''}
                                   type="number"
                                   max="100000"
                                   value={this.state.buyIn}
                                   onChange={(e)=>this.setBuyIn(Math.floor(e.target.value))} />
                        </div>
                        {!isMobile && false && <div id="select-game-div">
                            <span id="select-game-label">Select Game:</span>
                            <Select
                                id="select-game-dropdown"
                                value={this.state.selectedGame}
                                onChange={(e) => this.onSelectedGameChange(e.target.value)} >
                                {this.state.gameOptions.map(option => {
                                    return  <MenuItem value={option.value}>{ option.name}</MenuItem>
                                })}

                            </Select>
                        </div>}

                        <div id="create-new-game-private-checkbox">
                            <FormControlLabel
                                control={
                                    <WhiteCheckbox
                                        checked={this.state.privateGame}
                                        onChange={this.setPrivate}
                                        name="checkedB"
                                        color="primary"
                                    />
                                }
                                label={<span style={{ fontSize: isMobile ? '1em': '2em' }}>Private Game</span>}

                            />
                        </div>
                        <div id="create-new-game-aproval-required-checkbox">
                            <FormControlLabel
                                control={
                                    <WhiteCheckbox
                                        checked={this.state.aprovalRequired}
                                        onChange={this.setAprovalRequired}
                                        name="checkedB"
                                        color="primary"
                                    />
                                }
                                label={<span style={{ fontSize: isMobile ? '1em': '2em' }}>Join/Rebuy Approvals Required</span>}

                            />
                        </div>
                    </div>
                    <div id="create-game-button" className={this.props.connected ? '' : 'disabled-create-game-button'} onClick={this.onCreate}>
                        Create
                    </div>

                </div>

                {this.props.games && (
                <div id="my-existing-games" className="config-screens-top-level-sections">
                    <div id="my-existing-games-header" className="config-screens-top-level-sections-header">
                        {this.props.games.length > 0 ? this.props.games.length : 'No'} Existing Game{ this.props.games.length === 1 ? '' : 's' }
                    </div>
                    <div id="my-existing-games-body" className="config-screens-top-level-sections-body">
                        {
                            this.props.games.length === 0 ? <div/> :

                                this.props.games.map((game,index)=>{
                                    const admin = game.players.find(p=>p.admin);
                                    const isAdmin = admin && admin.id === this.props.playerId;
                                    const gameId = game.id;
                                    const epoc = parseInt(gameId, 10);
                                    const date = new Date(epoc);
                                    return <div key={game.id}
                                                className={index % 2 ===0 ?'existing-game greyGame':'existing-game whiteGame'}>
                                        <div  onClick={()=>window.location = `${serverPrefix}?gameid=${game.id}`}>
                                            <div>{game.omaha ? 'Pot Limit Omaha' : 'No Limit Texas Holdem'}</div>
                                            <div>{game.privateGame ? 'private game' : 'public game'}</div>
                                            <div> created by {this.getGameCreator(game)}</div>
                                            <div> blinds: {game.smallBlind}/{game.bigBlind}</div>
                                            <div>{date.AsGameName()} {date.AsExactTime()}</div>
                                            <div>{game.players.length} players</div>
                                        </div>
                                        {isAdmin && <div id="delete-game-button" onClick={()=>this.props.deleteGame(game.id)}>Delete Game</div>}
                                    </div>
                                })
                        }
                    </div>
                </div>)}

            </div>
        );

    }
}

export default CreateGameScreen;



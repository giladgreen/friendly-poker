/* eslint-disable jsx-a11y/img-redundant-alt */
/* eslint-disable jsx-a11y/img-has-alt */
import React, { Component } from 'react';
import Select from "@material-ui/core/Select/Select";
import MenuItem from "@material-ui/core/MenuItem";
import Checkbox from '@material-ui/core/Checkbox';

import FormControlLabel from "@material-ui/core/FormControlLabel/FormControlLabel";
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
const isMobile = ( /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));

class GameSettingModal extends Component {

    resetPlayers=(players)=>{
        if (players.filter(p=>Boolean(p)).length >1){
            const fromPlayer = players.filter(p=>Boolean(p))[0];
            const fromPlayerId = fromPlayer.id;
            const fromPlayerName = fromPlayer.name;
            const fromPlayerBalance = fromPlayer.balance;

            const toPlayer = players.filter(p=>Boolean(p))[1];
            const toPlayerId = toPlayer.id;
            const toPlayerName = toPlayer.name;
            const toPlayerBalance = toPlayer.balance;

            return {
                fromPlayerId,
                fromPlayerName,
                fromPlayerBalance,
                toPlayerId,
                toPlayerName,
                toPlayerBalance,
                amount:1,
            }
        }
        return {}

    }
    constructor(props) {
        super(props);
        const admin = props.game.players.find(p=>p && p.admin)
        const playersData = this.resetPlayers(props.game.players);
        this.state = {
            time: props.game.time,
            smallBlind: props.game.smallBlind,
            bigBlind: props.game.bigBlind,
            ...playersData,
            adminId: admin.id,
            adminName: admin.name,
            newBalances: [],
            sendTrasfer:false,
            showSmallBlindError:false,
            showBigBlindError:false,
            showTimeError:false,
            amountError:false,
            showBalancesScreen:false,
            timeBankEnabled: props.game.timeBankEnabled,
            requireRebuyApproval: props.game.requireRebuyApproval,
            straddleEnabled: props.game.straddleEnabled,
            showPendingRequests: true,
            gameOptions:[
                {value: 1, name: 'No Limit Texas Holdem', type:'TEXAS', icons: ["horns.svg"]  },
                {value: 2, name: 'Pot Limit Omaha', type: 'OMAHA',icons: ["omaha.svg"] },
                {value: 3, name: 'No Limit Pineapple', type: 'PINEAPPLE',  icons: ["black_pineapple.svg"] },
                {value: 4, name: "Dealer's Choice", type: 'DEALER_CHOICE',  icons: ["horns.svg", "omaha.svg", "black_pineapple.svg"]},
            ],
            selectedGame: 1,
        }

    }
    toggleShowPendingRequests= () =>{
        this.setState({showPendingRequests: !this.state.showPendingRequests })
    };

    onSelectedGameChange = (selectedGame)=>{
        this.setState({selectedGame})
    }
    setApprovalRequired= (e) =>{
        this.setState({requireRebuyApproval: e.target.checked })
    };

    setSettingsTime = (time) =>{
        const showTimeError = time < 10 || time > 180;
        this.setState({time, showTimeError})
    };

    toggleChangeBalances = () =>{
        this.setState({showBalancesScreen: !this.state.showBalancesScreen})
    };


    setSmallBlind = (smallBlind) =>{
        const showSmallBlindError = smallBlind < 1 || smallBlind > this.state.bigBlind || smallBlind > 999;
        const showBigBlindError = this.state.bigBlind < smallBlind || this.state.bigBlind > 999;
        this.setState({smallBlind, showSmallBlindError, showBigBlindError})
    };

    setBigBlind = (bigBlind) =>{
        const showSmallBlindError = this.state.smallBlind < 1 || this.state.smallBlind > bigBlind || this.state.smallBlind > 999;
        const showBigBlindError = bigBlind < this.state.smallBlind || bigBlind > 999;
        this.setState({bigBlind, showSmallBlindError, showBigBlindError})
    };

    onAdminChange = (adminId)=>{
        const adminName = this.props.game.players.find(p=>p && p.id === adminId).name;
        this.setState({adminId, adminName})
    };
    setStraddleEnabled= (e) =>{
        this.setState({straddleEnabled: e.target.checked })
    };

    onFromPlayerChange = (fromPlayerId)=>{
        const fromPlayer = this.props.game.players.find(p=>p && p.id === fromPlayerId);
        const fromPlayerName = fromPlayer.name;
        const fromPlayerBalance = fromPlayer.balance;
        let toPlayerId = this.state.toPlayerId;
        let toPlayerName = this.state.toPlayerName;
        let toPlayerBalance = this.state.toPlayerBalance;
        if (this.state.toPlayerId === fromPlayerId){
            const toPlayer = this.props.game.players.filter(player => player && player.id !== fromPlayerId)[0];
            toPlayerId = toPlayer.id;
            toPlayerName = toPlayer.name;
            toPlayerBalance = toPlayer.balance;
        }

        // console.log('from player changed',{fromPlayerId, fromPlayerName, fromPlayerBalance,toPlayerId,toPlayerName, toPlayerBalance, amount: 1})
        this.setState({fromPlayerId, fromPlayerName, fromPlayerBalance,toPlayerId,toPlayerName, toPlayerBalance, amount: 1})
    };

    setTimeBankEnabled= (e) =>{
        this.setState({timeBankEnabled: e.target.checked })
    };

    onToPlayerChange = (toPlayerId)=>{
        const toPlayer = this.props.game.players.find(p=>p && p.id === toPlayerId);
        const toPlayerName = toPlayer.name;
        const toPlayerBalance = toPlayer.balance;
        this.setState({toPlayerId, toPlayerName, toPlayerBalance, amount: 1})
    };

    setTransferAmount = (amount)=>{
        const amountError = amount > this.state.fromPlayerBalance;
        this.setState({amount, amountError})
    };

    saveSettings = ()=>{
        const {showSmallBlindError, showBigBlindError, showTimeError, time, smallBlind, bigBlind, gameOptions,
            adminId, sendTrasfer,  fromPlayerId, toPlayerId,  amount, requireRebuyApproval, straddleEnabled, timeBankEnabled, selectedGame } = this.state;
        if (showSmallBlindError || showBigBlindError || showTimeError){
            return;
        }

        let newBalances;
        if (sendTrasfer){
            newBalances = [
                {fromPlayerId, toPlayerId, amount}
            ]
        }
        const gameType = gameOptions.find(option=>option.value === selectedGame).type;
        this.props.saveSettings({time, smallBlind, bigBlind, adminId, newBalances, requireRebuyApproval, straddleEnabled, timeBankEnabled, gameType});
    };

    clostIfLastRequest = ()=>{
        const { game} = this.props;
        const { pendingJoin, pendingRebuy} = game;
        const totalREquests = pendingJoin.length + pendingRebuy.length;
        if (totalREquests === 1){
            this.props.close();
        }
    }
    approveJoin = (joinData)=>{
        this.props.approveJoin(joinData);
        this.clostIfLastRequest();
    };

    declineJoin = (joinData)=>{
        joinData.message = prompt("Why?", "bad join amount..");

        this.props.declineJoin(joinData);
        this.clostIfLastRequest();
    };

    approveRebuy = (rebuyData)=>{
        this.props.approveRebuy(rebuyData);
        this.clostIfLastRequest();
    };

    declineRebuy = (rebuyData)=>{
        rebuyData.message = prompt("Why?", "bad rebuy amount..");
        this.props.declineRebuy(rebuyData);
        this.clostIfLastRequest();
    };

    render() {
        const { skipHandEnabled, changePlayersBalances, game} = this.props;
        const { pendingJoin, pendingRebuy, players, requireRebuyApproval} = game;
        const { showSmallBlindError, showBigBlindError, showTimeError, showBalancesScreen, newBalances, amountError } = this.state;
        const gamePendingJoin = requireRebuyApproval ? pendingJoin : [];
        const gamePendingRebuy = requireRebuyApproval ? pendingRebuy : [];
        if (showBalancesScreen){
            return  <div id="game-settings-modal">
                <div id="game-settings-modal-close-x" onClick={()=>{
                    const playersData = this.resetPlayers(this.props.game.players);
                    this.setState({ ...playersData, showBalancesScreen:false, sendTrasfer:false});
                }}>X</div>
                <div id="game-settings-modal-title">Transfer between players</div>

                <div id="transfer-from" className="game-subsettings-item">
                    <span className="transfer-money-label">From:</span>
                    <Select
                        id="select-from-player-dropdown"
                        className="select-player-dropdown"
                        value={this.state.fromPlayerId}
                        onChange={(e) => this.onFromPlayerChange(e.target.value)} >
                        {this.props.game.players.filter(p => p).map(player => {
                            return <MenuItem value={player.id}>{ player.name} ({player.balance})</MenuItem>
                        })}

                    </Select>
                </div>
                <div id="transfer-to" className="game-subsettings-item">
                    <span className="transfer-money-label">To:</span>
                    <Select
                        id="select-to-player-dropdown"
                        className="select-player-dropdown"
                        value={this.state.toPlayerId}
                        onChange={(e) => this.onToPlayerChange(e.target.value)} >
                        {this.props.game.players.filter(player=> player.id !== this.state.fromPlayerId).map(player => {
                            return <MenuItem value={player.id}>{ player.name} ({player.balance})</MenuItem>
                        })}

                    </Select>
                </div>
                <div id="transfer-amount" className="game-subsettings-item">
                    <span className="game-settings-label">Amount:</span>
                    <input className={`game-subsettings-input ${this.state.amountError ? 'red-border red-background':''}`}
                           type="number"
                           max="999999"
                           min="1"
                           value={this.state.amount}
                           onChange={(e)=>this.setTransferAmount(Math.floor(e.target.value))}
                           step="1"
                    />
                </div>
                <div id="transfer-summary" className="game-subsettings-item">
                    <div className="game-settings-item">
                        transferring <span className="bold-blue-text">{this.state.amount}</span> from  <span className="bold-blue-text">{this.state.fromPlayerName}</span> to  <span className="bold-blue-text">{this.state.toPlayerName}</span>,
                    </div>
                    <div className="game-settings-item">
                        <div>
                            new balances:
                        </div>
                        <div>
                             <span className="bold-blue-text">{this.state.fromPlayerName}</span> with  <span className="bold-blue-text">{this.state.fromPlayerBalance - this.state.amount}</span> (instead of  <span className="bold-blue-text">{this.state.fromPlayerBalance}</span>),
                        </div>
                        <div>
                             <span className="bold-blue-text">{this.state.toPlayerName}</span> with  <span className="bold-blue-text">{this.state.toPlayerBalance + this.state.amount}</span> (instead of  <span className="bold-blue-text">{this.state.toPlayerBalance}</span>),
                        </div>
                    </div>
                </div>

                <div id="game-subsettings-save-button"
                     className={amountError ? 'disabled-save-game-subsettings-button':'game-subsettings-save-button'}
                     onClick={()=>{
                         if (!amountError){
                             this.setState({ showBalancesScreen:false, sendTrasfer:true});
                         }
                     }}> Save </div>

            </div>
        }

        const saveButtonDisabled = showSmallBlindError || showBigBlindError || showTimeError;

        const pendingIndicationCount = gamePendingJoin.length + gamePendingRebuy.length;
        const hasPendingRequests = pendingIndicationCount > 0;


        return  <div id="game-settings-modal">
            <div id="game-settings-modal-close-x" onClick={this.props.close}>X</div>

            <div id="game-settings-modal-title">Game Settings</div>

            <div id="game-settings-modal-select-game-div">
                <span id="game-settings-modal-select-game-label" className="game-settings-label">Select Game:</span>
                <Select
                    id="select-game-dropdown"
                    value={this.state.selectedGame}
                    onChange={(e) => this.onSelectedGameChange(e.target.value)} >
                    {this.state.gameOptions.map(option => {
                        return  <MenuItem value={option.value} key={`__gamename_${option.name}`}>
                            <span> {option.icons.map(src => <img key={src} style={{width: '30px'}} src={src} />)}  { option.name} </span>
                        </MenuItem>
                    })}

                </Select>
            </div>

            <div id="game-settings-blinds">
                <span className="game-settings-label">Small Blind:</span>
                <input className={`game-settings-input ${this.state.showSmallBlindError ? 'red-border red-background':''}`}
                       type="number"
                       max="999"
                       min="1"
                       value={this.state.smallBlind}
                       onChange={(e)=>this.setSmallBlind(Math.floor(e.target.value))}
                       step="1"
                />
                <span className="game-settings-label">Big Blind:</span>
                <input  className={`game-settings-input ${this.state.showBigBlindError ? 'red-border red-background':''}`}
                        type="number"
                        max="999"
                        value={this.state.bigBlind}
                        onChange={(e)=>this.setBigBlind(Math.floor(e.target.value))}
                        step="1"
                />
            </div>

            <div id="game-settings-Decision-Time-Limit">
                {this.state.timeBankEnabled ?
                    <span className="game-settings-label">Decision Time Limit: 20 Seconds</span>:
                    <span className="game-settings-label">Decision Time Limit:</span>}

                {this.state.timeBankEnabled ? <div/> : <input className={`game-settings-input ${this.state.showTimeError ? 'red-border red-background':''}`}
                       type="number"
                       min="10"
                       value={this.state.time}
                       onChange={(e)=>this.setSettingsTime(Math.floor(e.target.value))}
                       step="10"
                />}
                {this.state.timeBankEnabled ? <div/> :<span className="game-settings-secondary-label"> Seconds</span>}
            </div>

            <div id="game-settings-timebank-enabled-checkbox">
                <FormControlLabel
                    control={
                        <WhiteCheckbox
                            checked={this.state.timeBankEnabled}
                            onChange={this.setTimeBankEnabled}
                            name="checkedB"
                            color="primary"
                        />
                    }
                    label={<span style={{ fontSize: isMobile ? '1em': '2em' }}>Time-Bank Enabled</span>}

                />
            </div>

            <div id="game-settings-approval-required-checkbox">
                <FormControlLabel
                    control={
                        <WhiteCheckbox
                            checked={this.state.requireRebuyApproval}
                            onChange={this.setApprovalRequired}
                            name="checkedB"
                            color="primary"
                        />
                    }
                    label={<span style={{ fontSize: isMobile ? '1em': '2em' }}>Join/Rebuy Approvals Required</span>}

                />
            </div>
            <div id="game-settings-straddle-enabled-checkbox">
                <FormControlLabel
                    control={
                        <WhiteCheckbox
                            checked={this.state.straddleEnabled}
                            onChange={this.setStraddleEnabled}
                            name="checkedB"
                            color="primary"
                        />
                    }
                    label={<span style={{ fontSize: isMobile ? '1em': '2em' }}>Straddle Enabled</span>}

                />
            </div>

            {(this.props.game.players.length >1) &&  <div id="game-settings-select-admin">
                <span className="game-settings-label">Select Game Admin:</span>
                <Select

                    id="select-admin-dropdown"
                    value={this.state.adminId}
                    onChange={(e) => this.onAdminChange(e.target.value)} >
                    {this.props.game.players.filter(player=>Boolean(player)).map(player => {
                        return <MenuItem  key={`_mi_${player.name}`}  value={player.id}>{ player.name}</MenuItem>
                    })}

                </Select>
            </div>}

            {(changePlayersBalances) && <div id="open-change-balances-button" className="active-button" onClick={this.toggleChangeBalances}>Change Players Balances</div>}

            {(skipHandEnabled) && <div id="force-skip-hand-button" className="active-button" onClick={this.props.SkipHand}>Force Skip Hand</div>}

            {(hasPendingRequests) && <div id="toggle-show-requests-button" className="active-button" onClick={this.toggleShowPendingRequests}>{this.state.showPendingRequests ? 'Hide requests':'Show requests..'}</div>}


            {newBalances.length >0 ? <div id="new-balances-section" >
                {newBalances.map(({fromPlayerId, toPlayerId, amount})=>{
                    const fromName = players.find(p=>p && p.id===fromPlayerId).name;
                    const toName = players.find(p=>p && p.id===toPlayerId).name;
                    return <div>{fromName} => {amount} => {toName}</div>
                })}
            </div> :<div/>}




            {hasPendingRequests && this.state.showPendingRequests && <div id="pending-requests">
                <div id="pending-requests-header">{pendingIndicationCount} pending requests</div>
                <div id="pending-requests-body">
                    {gamePendingJoin.map(joinData =>{
                        return <div key={`join_${joinData.id}`} className="pending-row"><span className="pending-name">{joinData.name}</span> has requested to join the game with an initial balance of<span className="pending-number"> {joinData.balance}</span> <span className="approve-pending" onClick={()=>this.approveJoin(joinData)}> Approve</span><span className="decline-pending" onClick={()=>this.declineJoin(joinData)}> Decline</span>   </div>
                    }) }
                    {gamePendingRebuy.map(rebuyData =>{
                        return <div key={`rebuy_${rebuyData.id}`} className="pending-row"><span className="pending-name">{rebuyData.name}</span>  has requested to rebuy an extra <span className="pending-number">{rebuyData.amount}</span><span className="approve-pending" onClick={()=>this.approveRebuy(rebuyData)}> Approve</span><span className="decline-pending" onClick={()=>this.declineRebuy(rebuyData)}> Decline</span>  </div>
                    }) }


                </div>
            </div>}

            <div id="game-settings-save-button" className={saveButtonDisabled ? 'disabled-save-game-settings-button':'game-settings-save-button'} onClick={this.saveSettings}> Save Settings </div>

        </div>

    }
}

export default GameSettingModal;


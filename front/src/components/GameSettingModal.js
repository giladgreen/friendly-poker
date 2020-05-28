/* eslint-disable jsx-a11y/img-redundant-alt */
/* eslint-disable jsx-a11y/img-has-alt */
import React, { Component } from 'react';
import Select from "@material-ui/core/Select/Select";
import MenuItem from "@material-ui/core/MenuItem";


class GameSettingModal extends Component {

    resetPlayers=(players)=>{
        if (players.length >1){
            const fromPlayer = players[0];
            const fromPlayerId = fromPlayer.id;
            const fromPlayerName = fromPlayer.name;
            const fromPlayerBalance = fromPlayer.balance;

            const toPlayer = players[1];
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
        const playersData = this.resetPlayers(props.game.players);
        this.state = {
            time: props.game.time,
            smallBlind: props.game.smallBlind,
            bigBlind: props.game.bigBlind,
            ...playersData,
            adminId: props.game.players.find(p=>p.admin).id,
            adminName: props.game.players.find(p=>p.admin).name,
            newBalances: [],
            sendTrasfer:false,
            showSmallBlindError:false,
            showBigBlindError:false,
            showTimeError:false,
            amountError:false,
            showBalancesScreen:false,
        }

    }
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
        const adminName = this.props.game.players.find(p=>p.id === adminId).name;
        this.setState({adminId, adminName})
    };
    onFromPlayerChange = (fromPlayerId)=>{
        const fromPlayer = this.props.game.players.find(p=>p.id === fromPlayerId);
        const fromPlayerName = fromPlayer.name;
        const fromPlayerBalance = fromPlayer.balance;
        let toPlayerId = this.state.toPlayerId;
        let toPlayerName = this.state.toPlayerName;
        let toPlayerBalance = this.state.toPlayerBalance;
        if (this.state.toPlayerId === fromPlayerId){
            const toPlayer = this.props.game.players.filter(player => player.id !== fromPlayerId)[0];
            toPlayerId = toPlayer.id;
            toPlayerName = toPlayer.name;
            toPlayerBalance = toPlayer.balance;
        }

        // console.log('from player changed',{fromPlayerId, fromPlayerName, fromPlayerBalance,toPlayerId,toPlayerName, toPlayerBalance, amount: 1})
        this.setState({fromPlayerId, fromPlayerName, fromPlayerBalance,toPlayerId,toPlayerName, toPlayerBalance, amount: 1})
    };

    onToPlayerChange = (toPlayerId)=>{
        const toPlayer = this.props.game.players.find(p=>p.id === toPlayerId);
        const toPlayerName = toPlayer.name;
        const toPlayerBalance = toPlayer.balance;
        this.setState({toPlayerId, toPlayerName, toPlayerBalance, amount: 1})
    };

    setTransferAmount = (amount)=>{
        const amountError = amount > this.state.fromPlayerBalance;
        this.setState({amount, amountError})
    };

    saveSettings = ()=>{
        const {showSmallBlindError, showBigBlindError, showTimeError, time, smallBlind, bigBlind,
            adminId, sendTrasfer,  fromPlayerId, toPlayerId,  amount } = this.state;
        if (showSmallBlindError || showBigBlindError || showTimeError){
            return;
        }

        let newBalances;
        if (sendTrasfer){
            newBalances = [
                {fromPlayerId, toPlayerId, amount}
            ]
        }
        this.props.saveSettings({time, smallBlind, bigBlind, adminId, newBalances});
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
        this.props.declineJoin(joinData);
        this.clostIfLastRequest();
    };

    approveRebuy = (rebuyData)=>{
        this.props.approveRebuy(rebuyData);
        this.clostIfLastRequest();
    };

    declineRebuy = (rebuyData)=>{
        this.props.declineRebuy(rebuyData);
        this.clostIfLastRequest();
    };

    render() {
        const { skipHandEnabled, changePlayersBalances, game} = this.props;
        const { pendingJoin, pendingRebuy, players} = game;
        const { showSmallBlindError, showBigBlindError, showTimeError, showBalancesScreen, newBalances, amountError } = this.state;

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
                        {this.props.game.players.map(player => {
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

        const pendingIndicationCount = pendingJoin.length + pendingRebuy.length;
        const hasPendingRequests = pendingIndicationCount > 0;


        return  <div id="game-settings-modal">
            <div id="game-settings-modal-close-x" onClick={this.props.close}>X</div>

            <div id="game-settings-modal-title">Game Settings</div>

            <div className="game-settings-item">
                <span className="game-settings-label">Decision Time Limit:</span>
                <input className={`game-settings-input ${this.state.showTimeError ? 'red-border red-background':''}`}
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
                <input className={`game-settings-input ${this.state.showSmallBlindError ? 'red-border red-background':''}`}
                       type="number"
                       max="999"
                       min="1"
                       value={this.state.smallBlind}
                       onChange={(e)=>this.setSmallBlind(Math.floor(e.target.value))}
                       step="1"
                />
            </div>
            <div className="game-settings-item">
                <span className="game-settings-label">Big Blind:</span>
                <input  className={`game-settings-input ${this.state.showBigBlindError ? 'red-border red-background':''}`}
                       type="number"
                       max="999"
                       value={this.state.bigBlind}
                       onChange={(e)=>this.setBigBlind(Math.floor(e.target.value))}
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
                        return <MenuItem value={player.id}>{ player.name}</MenuItem>
                    })}

                </Select>
            </div>}

            <div id="game-settings-save-button" className={saveButtonDisabled ? 'disabled-save-game-settings-button':'game-settings-save-button'} onClick={this.saveSettings}> Save Settings </div>

            {newBalances.length >0 ? <div id="new-balances-section" >
                {newBalances.map(({fromPlayerId, toPlayerId, amount})=>{
                    const fromName = players.find(p=>p.id===fromPlayerId).name;
                    const toName = players.find(p=>p.id===toPlayerId).name;
                    return <div>{fromName} => {amount} => {toName}</div>
                })}
            </div> :<div/>}
            {(changePlayersBalances) && <div id="open-change-balances-button" className="active-button" onClick={this.toggleChangeBalances}>Change Players Balances</div>}
            {(skipHandEnabled) && <div id="force-skip-hand-button" className="active-button" onClick={this.props.SkipHand}>Force Skip Hand</div>}

            {hasPendingRequests && <div id="pending-requests">
                <div id="pending-requests-header">{pendingIndicationCount} pending requests</div>
                <div id="pending-requests-body">
                    {pendingJoin.map(joinData =>{
                        return <div key={`join_${joinData.playerId}`} className="pending-row"><span className="pending-name">{joinData.name}</span> has requested to join the game with an initial balance of<span className="pending-number"> {joinData.balance}</span> <span className="approve-pending" onClick={()=>this.approveJoin(joinData)}> Approve</span><span className="decline-pending" onClick={()=>this.declineJoin(joinData)}> Decline</span>   </div>
                    }) }
                    {pendingRebuy.map(rebuyData =>{
                        return <div key={`rebuy_${rebuyData.playerId}`} className="pending-row"><span className="pending-name">{rebuyData.name}</span>  has requested to rebuy an extra <span className="pending-number">{rebuyData.amount}</span><span className="approve-pending" onClick={()=>this.approveRebuy(rebuyData)}> Approve</span><span className="decline-pending" onClick={()=>this.declineRebuy(rebuyData)}> Decline</span>  </div>
                    }) }


                </div>
            </div>}
        </div>

    }
}

export default GameSettingModal;


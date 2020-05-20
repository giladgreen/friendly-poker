/* eslint-disable jsx-a11y/img-redundant-alt */
/* eslint-disable jsx-a11y/img-has-alt */
import React, { Component } from 'react';
import Select from "@material-ui/core/Select/Select";
import MenuItem from "@material-ui/core/MenuItem";


class GameSettingModal extends Component {

    constructor(props) {
        super(props);

        this.state = {
            time: props.game.time,
            smallBlind: props.game.smallBlind,
            bigBlind: props.game.bigBlind,
            adminId: props.game.players.find(p=>p.admin).id,
            adminName: props.game.players.find(p=>p.admin).name,
            showSmallBlindError:false,
            showBigBlindError:false,
            showTimeError:false,
        }

    }
    setSettingsTime = (time) =>{
        const showTimeError = time < 10 || time > 180;
        this.setState({time, showTimeError})
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

    saveSettings = ()=>{
        const {showSmallBlindError, showBigBlindError, showTimeError, time, smallBlind, bigBlind, adminId} = this.state;
        if (showSmallBlindError || showBigBlindError || showTimeError){
            return;
        }
        this.props.saveSettings({time, smallBlind, bigBlind, adminId});
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
        const { skipHandEnabled, game} = this.props;
        const { pendingJoin, pendingRebuy} = game;
        const { showSmallBlindError, showBigBlindError, showTimeError } = this.state;
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


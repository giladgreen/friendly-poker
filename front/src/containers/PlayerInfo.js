/* eslint-disable jsx-a11y/img-redundant-alt */
/* eslint-disable jsx-a11y/img-has-alt */
import React from 'react'
import Card from "./Card";

const PlayerInfo = (props) => {

    const {game, player, index, winningHandCards, isMe} = props;
    const showCards = game.showPlayersHands.includes(player.id);
    const card1 = player.cards ? player.cards[0] : null;
    const card2 = player.cards ? player.cards[1] : null;
    return  <div key={`player_${index}`} id={`player${index+1}`} className={`player ${player.active ? 'active-player' : ''}`}>
        <div className={`player-div`}>
            <Card isMe={isMe} card={card1} folded={!showCards && (player.fold || !game.startDate)} left={true} shown={showCards} highlight={winningHandCards.includes(card1)}/>
            <Card isMe={isMe} card={card2} folded={!showCards && (player.fold || !game.startDate)} right={true} shown={showCards} highlight={winningHandCards.includes(card2)}/>

            <div className={`player-info ${ player.active ? 'active-player-info' :''} ${ player.winner ? 'winner-player' :''} `}>
                <div className={`player-name ${ player.winner ? 'player-name-winner' :''} `} >
                    {player.name}
                </div>
                <div className={`player-balance ${ player.winner ? 'player-balance-winner' :''} `} >
                    {Math.floor(player.balance)}
                </div>
            </div>
            { player.dealer && <div id={`dealer-button-${index+1}`} className="dealer-button" > D </div>}
            { player.small && <div id="small-blind-button" > SB </div>}
            { player.big && <div id="big-blind-button" > BB </div>}

            { player.pot && player.pot[game.gamePhase] > 0 && <div id={`player${index+1}-pot`} className="player-pot">{(player.pot[game.gamePhase])}</div>}
            { player.status && <div  className="player-status">{player.status}</div>}
            { player.offline && <div  className="player-offline-indication">OFFLINE</div>}
            { props.admin && !props.isMe && <div  className={`kickOut-button ${ player.active ? 'force-action-button':''}`} onClick={()=>props.kickOutPlayer(player.id)}>{player.active ? (player.options.includes('Call') ? 'Force Fold':'Force Check') :'Kick Out'}</div>}
            { player.sitOut && <div  className="player-sitOut-indication">{game.pendingPlayers.includes(player.id) ? 'Joining next hand': 'Sitting Out'}</div>}
            { player.userDesc && <div  className="player-hand-description">{player.userDesc}</div>}

         </div>
    </div>
}

export default PlayerInfo;

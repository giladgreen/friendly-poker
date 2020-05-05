import React from 'react'
import Card from "./Card";

const PlayerInfo = (props) => {

    const {game, player, index, winningHandCards} = props;
    const showCards = game.showPlayersHands.includes(player.id);
    const card1 = player.cards ? player.cards[0] : null;
    const card2 = player.cards ? player.cards[1] : null;
    return  <div key={`player_${index}`} id={`player${index+1}`} className={`player ${player.active ? 'active-player' : ''}`}>
        <div className="player-div">
            <Card card={card1} folded={!showCards && (player.fold || !game.startDate)} left={true} shown={showCards} highlight={winningHandCards.includes(card1)}/>
            <Card card={card2} folded={!showCards && (player.fold || !game.startDate)} right={true} shown={showCards} highlight={winningHandCards.includes(card2)}/>

            <div className="player-info" >
                <div className="player-name">
                    {player.name}
                </div>
                <div className="player-balance">
                    {Math.floor(player.balance)}
                </div>
            </div>
            { player.dealer && <div id={`dealer-button-${index+1}`} className="dealer-button" > D </div>}
            { player.small && <div id="small-blind-button" > SB </div>}
            { player.big && <div id="big-blind-button" > BB </div>}

            { player.pot && player.pot[game.gamePhase] > 0 && <div id={`player${index+1}-pot`} className="player-pot">{(player.pot[game.gamePhase])}</div>}
            { player.status && <div  className="player-status">{player.status}</div>}
            { player.offline && <div  className="player-offline-indication">OFFLINE</div>}
            { player.sitOut&& <div  className="player-sitOut-indication">{player.pendingPlayers.includes(player.id) ? 'Joining next hand': 'Sitting Out'}</div>}
            { player.userDesc && <div  className="player-hand-description">{player.userDesc}</div>}

         </div>
    </div>
}

export default PlayerInfo;

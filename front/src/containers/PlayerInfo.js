/* eslint-disable jsx-a11y/img-redundant-alt */
/* eslint-disable jsx-a11y/img-has-alt */
import React from 'react'
import Card from "./Card";
import { CSSTransition } from "react-transition-group";

import EmojiEventsIcon from '@material-ui/icons/EmojiEvents';
const PlayerInfo = (props) => {

    const {game, player, index, winningHandCards, isMe, initial, betRoundOver} = props;
    const { pineapple } = game;

    const {cardsToShow, needToThrow} = player;
    const dropEnabled = pineapple && needToThrow;

    const showCards = game.showPlayersHands.includes(player.id);
    const card1 = player.cards ? player.cards[0] : null;
    const card2 = player.cards ? player.cards[1] : null;
    const card3 = player.cards && (game.omaha || game.pineapple) ? player.cards[2] : null;
    const card4 = player.cards && game.omaha ? player.cards[3] : null;

    const handsWon = `${player.handsWon}`;
    const handWonClass = `trophy-badge trophy-badge-${handsWon.length}-digit`;

    const forceAction = player.active ? (player.options.includes('Call') ? 'F':'C') :'K';
    const actionClass = player.active ? (player.options.includes('Call') ? 'force-fold':'force-check') :'kick-out';

    console.log(' index ',index, ' texas ',game.texas, ' initial ',initial)


    return  <div key={`player_${index}`} id={`player${index}`} className={`player ${player.active ? 'active-player' : ''}`}>
        <div className={`player-div`}>

            {cardsToShow > 0 &&               <Card dropEnabled={dropEnabled} dropCard={()=>props.dropCard(card1)} playerPreferences={props.playerPreferences} initial={initial} index={index} isMe={isMe} card={card1} folded={!showCards && (player.fold || !game.startDate)} first={true} texas={game.texas}  omaha={game.omaha}  pineapple={game.pineapple}  shown={showCards} highlight={winningHandCards.includes(card1)}/>}
            {cardsToShow > 1 &&               <Card dropEnabled={dropEnabled} dropCard={()=>props.dropCard(card2)} playerPreferences={props.playerPreferences} initial={initial} index={index} isMe={isMe} card={card2} folded={!showCards && (player.fold || !game.startDate)} second={true} texas={game.texas}  omaha={game.omaha} pineapple={game.pineapple}  shown={showCards} highlight={winningHandCards.includes(card2)}/>}
            {(game.omaha || game.pineapple) && cardsToShow > 1 && <Card dropEnabled={dropEnabled}  dropCard={()=>props.dropCard(card3)} playerPreferences={props.playerPreferences} initial={initial} index={index} isMe={isMe} card={card3} folded={!showCards && (player.fold || !game.startDate)} third={true} omaha={game.omaha} pineapple={game.pineapple}  shown={showCards} highlight={winningHandCards.includes(card3)}/>}
            {game.omaha && cardsToShow > 1 && <Card playerPreferences={props.playerPreferences} initial={initial} index={index} isMe={isMe} card={card4} folded={!showCards && (player.fold || !game.startDate)} fourth={true} omaha={game.omaha}  shown={showCards} highlight={winningHandCards.includes(card4)}/>}

            <div className={`player-info ${ player.active ? 'active-player-info' :''} ${ player.winner ? 'winner-player' :''} `}>
                <div className={`player-name ${ player.winner ? 'player-name-winner' :''} `} >
                    {player.name} {player.isMobile ? ' 📱':' 🖥️'}
                </div>
                <div className={`player-balance ${ player.winner ? 'player-balance-winner' :''} `} >
                      {player.winner ?  Math.floor(player.balance)- Math.floor(player.winner) : Math.floor(player.balance)}
                </div>
            </div>
            { player.dealer && <div id={`player-${index}-dealer-button`} className="base-dealer-button" > D </div>}
            { player.straddle && <div id={`player-${index}-straddle-button`} className="base-straddle-button" > S </div>}
             <div className={handWonClass} >  {handsWon}<EmojiEventsIcon/> </div>
            { player.small && <div id="small-blind-button" > SB </div>}
            { player.big && <div id="big-blind-button" > BB </div>}

            <CSSTransition
                in={!game.handOver && player.pot && player.pot[game.gamePhase] > 0 && !betRoundOver}
                timeout={1000}
                classNames={`player${index}-pot-mid`}
                unmountOnExit
                appear>

                 <div id={`player${index}-pot-mid`} className={`player-pot player-pot-mid-hand player${index}-pot-mid`}>+{(player.pot[game.gamePhase])}</div>

            </CSSTransition>

            { game.handOver && player.winner  && <div className="player-pot player-pot-hand-over" id={`player${index}-pot-end`} >+{player.winner}</div>}

            { player.status && <div  className="player-status">{player.status}</div>}
            { player.offline && <div  className="player-offline-indication">OFFLINE</div>}
            { props.admin && !props.isMe && <div className="user-menu" onClick={()=>props.kickOutPlayer(player.id)}><span className={actionClass}>{forceAction}</span></div>}
            {/*{ false && props.admin && !props.isMe && <div  className={`kickOut-button ${ player.active ? 'force-action-button':''}`} onClick={()=>props.kickOutPlayer(player.id)}>{player.active ? (player.options.includes('Call') ? 'Force Fold':'Force Check') :'Kick Out'}</div>}*/}
            { player.sitOut && <div  className="player-sitOut-indication">{game.pendingPlayers.includes(player.id) ? 'Joining next hand': 'Sitting Out'}</div>}
            { player.userDesc && game.gamePhase === 1 && <div  className={`player-hand-description player-hand-description-at-game-phase-1`}>{player.userDesc}</div>}
            { player.userDesc && game.gamePhase === 2 && <div  className={`player-hand-description player-hand-description-at-game-phase-2`}>{player.userDesc}</div>}
            { player.userDesc && game.gamePhase === 3 && <div  className={`player-hand-description player-hand-description-at-game-phase-3`}>{player.userDesc}</div>}

         </div>
    </div>
}

export default PlayerInfo;

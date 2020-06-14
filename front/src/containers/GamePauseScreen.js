/* eslint-disable jsx-a11y/img-redundant-alt */
/* eslint-disable jsx-a11y/img-has-alt */
import React from 'react'

import infoHelper from '../infoHelper';
const { getPlayersInfo } = infoHelper;
const GameInfoScreen = (props) => {

    const {game, isAdmin, resumeGame } = props;
    const {playersData, serverError, players} = game;

    const canResume = isAdmin && (!game.handOver || game.players.filter(player => player && !player.sitOut && player.balance > 0) > 1)
    return  <div  id="game-pause-screen">
        <div id="game-pause-buy-ins-section">
            <div>
                <div id="game-pause-indication"  >וו</div>
                <div id="game-pause-indication-text"  >Game Paused</div>
            </div>
            {serverError ? <div id="server-error-message"  >
                <div> Ooops, something went wrong.. </div>
                <div> There is a problem in the game server </div>
                <div> please copy the game info and start a new game.. </div>
            </div> : <div/>}


            <div id="game-pause-info-screen-header"> Game summary</div>
            {canResume &&  <div id="start-pause-game-button" className="big-button active-button"  onClick={resumeGame}> Resume Game </div>}

            <div id="game-pause-info-screen-body">
                {getPlayersInfo(playersData, players)}
            </div>


        </div>
    </div>
}

export default GameInfoScreen;

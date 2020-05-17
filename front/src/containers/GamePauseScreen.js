/* eslint-disable jsx-a11y/img-redundant-alt */
/* eslint-disable jsx-a11y/img-has-alt */
import React from 'react'

const GameInfoScreen = (props) => {

    const {game, isAdmin, resumeGame } = props;
    const {playersData,players} = game;

    const playersItems = playersData.map(pd=> {
        const player = players.find(p => p.id === pd.id);
        let bottomLine = pd.cashOut ?
            pd.cashOut.amount - pd.totalBuyIns :
            player ? player.balance - pd.totalBuyIns : null;
        const bottomLineStyle = bottomLine && bottomLine > 0 ? 'player-info-bottom-line-green' : 'player-info-bottom-line-red';
        if (bottomLine && bottomLine > 0) {
            bottomLine = `+${bottomLine}`;
        }

         const data = {
            name: pd.name,
            totalBuyIns: pd.totalBuyIns,
            cashOut: pd.cashOut ? pd.cashOut.amount : (player ? player.balance : null),
            bottomLine,
            bottomLineStyle
        }

        return  <tr>
                <th>{data.name}</th>
                <th>{data.totalBuyIns}</th>
                <th>{data.cashOut} {pd.cashOut ? '': '(still in game)'}</th>
                <th><span className={data.bottomLineStyle}> {data.bottomLine}</span></th>
            </tr>

    });

    return  <div  id="game-pause-screen">
        <div id="game-pause-buy-ins-section">
            <div><div id="game-pause-indication"  >וו</div><div id="game-pause-indication-text"  >Game Paused</div></div>


            <div id="game-pause-info-screen-header"> Game summary</div>
            {isAdmin &&  <div id="start-pause-game-button" className="big-button active-button"  onClick={resumeGame}> Resume Game </div>}

            <div id="game-pause-info-screen-body">
                <table id="game-pause-info-screen-body-table">
                    <tr>
                        <th>Name</th>
                        <th>Buy-in</th>
                        <th>Cash-Out / Current Balance</th>
                        <th>Bottom-Line</th>
                    </tr>
                    { playersItems }
                </table>


            </div>


        </div>
    </div>
}

export default GameInfoScreen;

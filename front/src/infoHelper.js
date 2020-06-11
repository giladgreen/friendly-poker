import React from "react";

function getPlayersInfo(playersData, players){

    let handsCount = 0;
    let totalMoney = 0;
    let totalCashout = 0;
    const playersItems = playersData.map(pd=> {
        const player = players.find(p => p && p.id === pd.id);
        let bottomLine = pd.cashOut ?
            pd.cashOut.amount - pd.totalBuyIns :
            player ? player.balance - pd.totalBuyIns : null;
        const bottomLineStyle = (!bottomLine || bottomLine === 0) ? 'player-info-bottom-line-gray' : (bottomLine > 0 ? 'player-info-bottom-line-green' : 'player-info-bottom-line-red');
        if (bottomLine && bottomLine > 0) {
            bottomLine = `+${bottomLine}`;
        }

        const data = {
            name: pd.name,
            totalBuyIns: pd.totalBuyIns,
            cashOut: pd.cashOut ? pd.cashOut.amount : (player ? player.balance : null),
            bottomLine,
            bottomLineStyle,
            handsWon: pd.handsWon || (player ? player.handsWon : 0)
        }
        handsCount += data.handsWon;
        totalMoney += data.totalBuyIns;
        totalCashout += (pd.cashOut ? pd.cashOut.amount : 0)
        return  <tr>
            <th>{data.name}</th>
            <th>{data.totalBuyIns}</th>
            <th>{data.cashOut} {pd.cashOut ? '': '(still in game)'}</th>
            <th><span className={data.bottomLineStyle}> {data.bottomLine}</span></th>
            <th>{data.handsWon}</th>
        </tr>

    });

    const stillInGame = totalMoney - totalCashout;
    return <div>
        <div>
           Total Hands: {handsCount}
        </div>
        <div>
           Total Amount: {totalMoney} {stillInGame ? `(${stillInGame} still in game)` :''}
        </div>


        <table id="game-pause-info-screen-body-table">
        <tr>
            <th>Name</th>
            <th>Buy-in</th>
            <th>Cash-Out / Current Balance</th>
            <th>Bottom-Line</th>
            <th>Hands Won</th>
        </tr>
        { playersItems }
    </table></div>
}

export default {
    getPlayersInfo
};

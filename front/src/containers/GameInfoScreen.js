/* eslint-disable jsx-a11y/img-redundant-alt */
/* eslint-disable jsx-a11y/img-has-alt */
import React from 'react'


const GameInfoScreen = (props) => {

    const {game} = props;
    const {playersData, moneyInGame,players} = game;

    return  <div  id="game-info-screen">
        <div id="exit-game-info-screen-button" onClick={props.onClose}>X</div>
        <div id="buy-ins-section">
            <div id="info-screen-header"> Players BuyIn/CashOut Info</div>
            <div id="info-screen-total-amount"> Total amount still in game: {moneyInGame}</div>
            <div id="info-screen-body">
                {
                    playersData.map(pd=>{
                        const player = players.find(p=>p.id === pd.id);
                        let bottomLine =  pd.cashOut ?
                            pd.cashOut.amount - pd.totalBuyIns :
                            (player && (player.fold || player.sitOut || player.balance===0)) ? player.balance - pd.totalBuyIns : null;
                        const bottomLineStyle = (!bottomLine || bottomLine === 0) ? 'player-info-bottom-line-gray' : (bottomLine > 0 ? 'player-info-bottom-line-green' : 'player-info-bottom-line-red');
                        if (bottomLine && bottomLine>0){
                            bottomLine = `+${bottomLine}`;
                        }
                        return <div key={pd.id} className="player-screen-player-info">
                            <div className="player-info-player-name"> {pd.name}</div>
                            {pd.buyIns.length} Buy-In{pd.buyIns.length > 1 ? 's' :''}: (total of {pd.totalBuyIns}):
                            {
                                pd.buyIns.map(bi=><div className="player-info-player-buyin-row">{(new Date(bi.time)).AsExactTime()}  <span className="player-buyin-data">+{bi.amount}</span> </div>)
                            }
                            {pd.cashOut ? <div>
                                Cash-Out:
                                <div className="player-info-player-buyin-row">{(new Date(pd.cashOut.time)).AsExactTime()}  <span className="player-buyin-data">+{pd.cashOut.amount}</span> </div>
                                <div> bottom-line: <div className={bottomLineStyle}>{bottomLine }</div></div>

                            </div> :
                                <div>
                                    Current balance:
                                    <div className="player-info-player-buyin-row"> <span className="player-buyin-data">+{player.balance}</span> </div>
                                    {bottomLine!==null && <div> bottom-line: <div className={bottomLineStyle}>{bottomLine }</div></div>}

                                </div>


                            }
                        </div>
                    })
                }
            </div>


        </div>
    </div>
}

export default GameInfoScreen;

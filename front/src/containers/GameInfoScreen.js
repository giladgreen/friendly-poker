/* eslint-disable jsx-a11y/img-redundant-alt */
/* eslint-disable jsx-a11y/img-has-alt */
import React from 'react'


const GameInfoScreen = (props) => {

    const {game} = props;
    const {playersData, moneyInGame} = game;

    return  <div  id="game-info-screen">
        <div id="exit-game-info-screen-button" onClick={props.onClose}>X</div>
        <div id="buy-ins-section">
            <div id="info-screen-header"> Players BuyIn/CashOut Info</div>
            <div id="info-screen-total-amount"> Total amount still in game: {moneyInGame}</div>
            <div id="info-screen-body">
                {
                    playersData.map(pd=>{
                        let bottomLine =  pd.cashOut ? pd.cashOut.amount - pd.buyIns.map(bi=>bi.amount).reduce((all,one)=> all+one,0) : 0;
                        const bottomLineStyle = bottomLine > 0 ? 'player-info-bottom-line-green':'player-info-bottom-line-red';
                        if (bottomLine>0){
                            bottomLine = `+${bottomLine}`;
                        }
                        return <div key={pd.id} className="player-screen-player-info">
                            <div className="player-info-player-name"> {pd.name}</div>
                            Buy-Ins:
                                {
                                    pd.buyIns.map(bi=>{
                                        return <div className="player-info-player-buyin-row">{(new Date(bi.time)).AsExactTime()}  <span className="player-buyin-data">+{bi.amount}</span> </div>

                                    })
                                }
                            {pd.cashOut && <div>
                                Cash-Out:
                                <div className="player-info-player-buyin-row">{(new Date(pd.cashOut.time)).AsExactTime()}  <span className="player-buyin-data">+{pd.cashOut.amount}</span> </div>
                                <div> bottom-line: <div className={bottomLineStyle}>{bottomLine }</div></div>

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

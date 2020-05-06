/* eslint-disable jsx-a11y/img-redundant-alt */
/* eslint-disable jsx-a11y/img-has-alt */
import React from 'react'

const Card = (props) => {

    const heart =  <i className="em-svg em-hearts"/>;
    const spade =  <i className="em-svg em-spades"/>;
    const diamond =<i className="em-svg em-diamonds"/>;
    const club =   <i className="em-svg em-clubs"/>;
    const signToSignmap = {
        'H':heart,
        'S':spade,
        'D':diamond,
        'C':club,
    }

    const { card, folded, left, right, highlight, shown } = props;

    const number = card && !folded ? card[0].replace('T','10') : '';
    const sign = card && !folded ? signToSignmap[card[1]] : '';
    const color = card ? (['D','H'].includes(card[1]) ? 'red-card' : 'black-card' ) : '';

    return  <div key={`card_${card}`} className={`simple-card-base ${left ? 'left-card':'' } ${right ? 'right-card':'' } ${highlight ? 'highlight-card':''} ${shown ? 'shown-card':''}`}>
                <div className={folded ? 'simple-card-folded' : (card ? 'simple-card-front':'simple-card-back') }>
                    <div className={`card-number ${color}`}>
                        {number}
                    </div>
                    <div className={`card-sign`}>
                        {sign}
                    </div>
                </div>
            </div>
}

export default Card;

/* eslint-disable jsx-a11y/img-redundant-alt */
/* eslint-disable jsx-a11y/img-has-alt */
import React from 'react'

const Card = (props) => {
    const { card, folded, first, second, third, fourth, highlight, shown, isMe, omaha, playerPreferences, index, initial } = props;

    const {twoColors} = playerPreferences;

    const heart =  <i className="em-svg em-hearts"/>;
    const spade =  <i className="em-svg em-spades"/>;
    const diamond =<i className={`em-svg em-${twoColors ? 2 : 4 }diamonds`}/>;
    const club =   <i className={`em-svg em-${twoColors ? 2 : 4 }clubs`}/>;
    const signToSignmap = {
        'H':heart,
        'S':spade,
        'D':diamond,
        'C':club,
    }

    if (!omaha && (third || fourth)){
        return <div/>;
    }
    const number = card && (isMe || !folded) ? card[0].replace('T','10') : '';
    const sign = card && (isMe || !folded) ? signToSignmap[card[1]] : '';
    let color = card ? (['D','H'].includes(card[1]) ? 'red-card' : 'black-card' ) : '';
    if (card && !twoColors){
        if (card[1] === 'C'){
            color = 'club-color-card'
        }
        if (card[1] === 'D'){
            color = 'diamond-color-card'
        }
    }

    const id = index ? ( initial ? (`player${index}-${first?'first':'second'}-card-texas`): (`player${index}-${first?'first':'second'}-card-texas-no-anim`)) : undefined;
    if (!isMe && initial){
        console.log('initial TRUE')
    } else if (!isMe && !initial){
        console.log('initial FALSE')
    }



    const className = `simple-card-base  ${first ? 'first-card':'' } ${second ? 'second-card':'' } ${third ? 'third-card':'' } ${fourth ? 'fourth-card':'' } ${highlight ? 'highlight-card':''} ${shown ? 'shown-card':''}`;

    return  <div key={`card_${card}`} id={id}
                 className={className}>
                <div className={folded ? (isMe ? 'my-folded-card' :'simple-card-folded') : (card ? 'simple-card-front':'simple-card-back') }>
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

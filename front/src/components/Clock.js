/* eslint-disable jsx-a11y/img-redundant-alt */
/* eslint-disable jsx-a11y/img-has-alt */
import React, { Component } from 'react';

const SECOND = 1000;
const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

class Clock extends Component {

    constructor(props) {
        super(props);
        const {startDate} = props;
        this.state = {
            clockMessage: this.getShowableTime(startDate)
        }

        this.clockInterval = setInterval(()=>{
                this.setState({ clockMessage: this.getShowableTime(startDate) });
        },1000)

    }
    getShowableTime = (startDate) =>{
        if (!startDate){
            return null;
        }
        const diff = (new Date()).getTime() - startDate;
        const totalSeconds =  Math.floor(diff / SECOND);

        const days = Math.floor(totalSeconds / DAY);
        let reminder = totalSeconds - days * DAY;


        let hours = Math.floor(reminder / HOUR);
        reminder -=  hours * HOUR;

        hours = hours + days * 24;
        const minutes =  Math.floor(reminder / MINUTE);
        const seconds = reminder - minutes * MINUTE;

        const result = {
            days: days>9 ? `${days}` : `0${days}`,
            hours:hours>9 ? `${hours}` : `0${hours}`,
            minutes:minutes>9 ? `${minutes}` : `0${minutes}`,
            seconds:seconds>9 ? `${seconds}` : `0${seconds}`,
        };
        return `${result.hours}:${result.minutes}:${result.seconds}`;
    }

    render() {
        return <div id="clock">{ this.state.clockMessage }</div>
    }
}

export default Clock;


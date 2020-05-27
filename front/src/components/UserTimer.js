/* eslint-disable jsx-a11y/img-redundant-alt */
/* eslint-disable jsx-a11y/img-has-alt */
import React, { Component } from 'react';
import LinearProgress from "@material-ui/core/LinearProgress/LinearProgress";

const MINUTE = 60;

class UserTimer extends Component {

    constructor(props) {
        super(props);
        const {userTimer} = props;
        this.state = {
            userTimer
        }
    }
    forceUpdate = (userTimer)=>{
        this.setState({ userTimer});
        if (userTimer){
            this.startInterval();
        }
    }
    startInterval=()=>{
        if (this.timerInterval){
            clearInterval(this.timerInterval);
        }
        this.timerInterval = setInterval(()=>{
            let newUserTimer = this.state.userTimer;
            newUserTimer -= 0.25;
            if (newUserTimer < 0){
                newUserTimer = 0;
                setImmediate(()=>clearInterval(this.timerInterval));
            }
            this.setState({ userTimer: newUserTimer});
        },250);
    }
    componentDidMount() {
        if (this.state.userTimer){
            this.startInterval();
        }

        this.props.registerForceUserTimerUpdate(this.forceUpdate);
    }

    componentWillUnmount() {
        if (this.timerInterval){
            clearInterval(this.timerInterval);
        }

    }

    getTimeLeft = ()=>{
        const {userTimer} = this.state;
        if (!userTimer){
            return '';
        }
        let minutes =  Math.floor(userTimer / MINUTE).toFixed(0);
        let seconds = (userTimer - minutes * MINUTE).toFixed(0);
        minutes = minutes>9 ? `${minutes}` : `0${minutes}`;
        seconds = seconds>9 ? `${seconds}` : `0${seconds}`;
        return `${minutes}:${seconds}`;
    }

    getTimeLeftValue = ()=>{
        const {time} = this.props;
        const userTimer = this.state.userTimer || 0;

        const val = userTimer * 100 / time;

        return val < 0 ? 0 : (val > 100 ? 100 : val)
    }

    render() {
        return <div>
            {/* time left to talk */}
            <div id="hand-clock"> { this.getTimeLeft()} </div>

            {/* time left to talk progess bar */}
             <LinearProgress id="hand-clock-progress" variant="determinate" value={this.getTimeLeftValue()} />
        </div>
    }
}

export default UserTimer;


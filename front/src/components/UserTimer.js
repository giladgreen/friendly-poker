/* eslint-disable jsx-a11y/img-redundant-alt */
/* eslint-disable jsx-a11y/img-has-alt */
import React, { Component } from 'react';
import LinearProgress from "@material-ui/core/LinearProgress/LinearProgress";
import { MuiThemeProvider, createMuiTheme } from '@material-ui/core/styles';
const MINUTE = 60;

const theme = createMuiTheme({
    palette: {
        secondary: {
            main: '#ff0000'
        }
    }
});


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
        if (this.props.registerForceUserTimerUpdate){
            this.props.registerForceUserTimerUpdate(this.forceUpdate);
        }
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
        console.log('time',time)
        const userTimer = this.state.userTimer || 0;
        console.log('userTimer',userTimer)
        const val = userTimer * 100 / time;
        console.log('val',val)
        return val < 0 ? 0 : (val > 100 ? 100 : val)
    }

    render() {
        const val = this.getTimeLeftValue();

        return <div>
            {/* time left to talk */}
            <div id="hand-clock"> { this.getTimeLeft()} </div>

            <MuiThemeProvider theme={theme}>
                {/* time left to talk progess bar */}
                <LinearProgress id="hand-clock-progress" variant="determinate" color="secondary" value={val} />
            </MuiThemeProvider>


        </div>
    }
}

export default UserTimer;


import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';
import { transitions, positions, Provider as AlertProvider } from 'react-alert';
import AlertTemplate from 'react-alert-template-basic';
import './style/bootstrap.css';
import './style/onlineGame.css';
import './style/createNewGameScreen.css';
import './style/joinGameScreen.css';
import './style/loader.css';
import './style/cards.css';
import './style/playerInfo.css';
import './style/gameInfoScreen.css';

const options = {
    // you can also just use 'bottom center'
    position: positions.BOTTOM_LEFT,
    timeout: 4000,
    offset: '70px',
    // you can also just use 'scale'
    transition: transitions.SCALE
}

const Root = () => (
    <AlertProvider template={AlertTemplate} {...options}>
        <App />
    </AlertProvider>
)


ReactDOM.render(
    <Root/>,
    document.getElementById('root')
);

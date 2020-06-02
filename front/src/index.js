import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';
import { transitions, positions, Provider as AlertProvider } from 'react-alert';
import AlertTemplate from 'react-alert-template-basic';
const isMobile = ( /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));

const options = {
    // you can also just use 'bottom center'
    position: positions.BOTTOM_LEFT,
    timeout: isMobile ? 2500 : 4000,
    offset: isMobile ? '0px':'70px',
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

/* eslint-disable jsx-a11y/img-redundant-alt */
/* eslint-disable jsx-a11y/img-has-alt */
import React from 'react'

export default (props) => (<div id="loader-screen">
    <div>Please Wait..</div>
    {props.waitingApproval && <div>Waiting for game admin approval..</div>}
    <img id="app-name-loader-screen" src="./friendly-poker.png"/></div> );




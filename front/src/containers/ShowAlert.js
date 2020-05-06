/* eslint-disable jsx-a11y/img-redundant-alt */
/* eslint-disable jsx-a11y/img-has-alt */
import React from 'react'
import { useAlert } from 'react-alert'
let messages = [];
const ShowAlert = (props) => {
    const alert = useAlert();

    const {message} = props;
    if (message){
        if (!messages.includes(message)){
            alert.show(message);
            messages.push(message);
        }
        setImmediate(props.hideAlertMessage);
    }

    if (messages.length>10){
        messages = messages.slice(messages.length-10,messages.length)
    }

    return (
        <div/>
    )
}

export default ShowAlert;

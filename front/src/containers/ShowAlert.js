import React from 'react'
import { useAlert } from 'react-alert'

const ShowAlert = (props) => {
    const alert = useAlert();

    const {message} = props;
    if (message){
        alert.show(message);
        setTimeout(props.hideAlertMessage,100);
    }

    return (
        <div/>
    )
}

export default ShowAlert;

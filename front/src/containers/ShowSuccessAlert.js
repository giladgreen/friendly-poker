import React from 'react'
import { useAlert } from 'react-alert'

const ShowSuccessAlert = (props) => {
    const alert = useAlert();
    const {message} = props;
    if (message){
       // setTimeout(()=>{
            try {
                alert.success(message);
            } catch (e) {
                console.log('error using useAlert().success()..');
                console.log('message',message);

            }

        //},1);
    }

    return (
        <div/>
    )
}

export default ShowSuccessAlert;

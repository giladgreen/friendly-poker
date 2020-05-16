/* eslint-disable jsx-a11y/img-redundant-alt */
/* eslint-disable jsx-a11y/img-has-alt */
import React from 'react'
import Modal from '@material-ui/core/Modal';
import Fade from '@material-ui/core/Fade';
import Backdrop from "@material-ui/core/Backdrop/Backdrop";

export default (props) => ( <Modal
        open={props.show}
        closeAfterTransition
        BackdropComponent={Backdrop}
        BackdropProps={{
            timeout: 500,
        }}>
        <Fade in={props.show}>
            <div className="confirm-popup">
                <div>{props.message}</div>
                <div><span>Yes</span><span>Cancel</span></div>

            </div>
        </Fade>
    </Modal>
);




/* eslint-disable jsx-a11y/img-redundant-alt */
/* eslint-disable jsx-a11y/img-has-alt */
import React from 'react'


const LogsScreen = (props) => {
    return  <div id="game-logs-modal">
        <div id="game-logs-modal-close-x" onClick={props.toggleLogs}>X</div>
        {props.logs.map(log => <div key={`${log.now}_log_${log.text}`} className="log"> <span className="log-time" > { (new Date(log.now)).AsExactTimeWithSeconds()}</span> <span className="log-hand" > Hand #{log.hand} </span><span className="log-text">{log.text}</span></div>)}
    </div>
}

export default LogsScreen;

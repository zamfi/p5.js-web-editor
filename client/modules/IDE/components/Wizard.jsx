import PropTypes from 'prop-types';
import React from 'react';
// import { Helmet } from 'react-helmet';
// import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';
// import { bindActionCreators } from 'redux';
// import { connect } from 'react-redux';
// import * as PreferencesActions from '../actions/preferences';

// import PlusIcon from '../../../images/plus.svg';
// import MinusIcon from '../../../images/minus.svg';
// import beepUrl from '../../../sounds/audioAlert.mp3';

const synth = window.speechSynthesis;
const isWizard = (window.location.hash === '#wizard');

class WizardPanel extends React.Component {
  constructor(props) {
    super(props);

    this.inputBox = React.createRef();

    this.ws = new WebSocket(`ws://${window.location.hostname}:${8113}`);
    if (!isWizard) {
      this.ws.onmessage = event => this.handleSpokenMessage(event);
    } else {
      this.ws.onmessage = event => this.handleParticipantMessage(event);
    }

    this.state = {
      proposedMessage: '',
      sentMessages: [],
      lastMessageInProgress: false,
      isWizard
    };
  }

  handleSpokenMessage(event) {
    // console.log(event);
    const utterance = new SpeechSynthesisUtterance(JSON.parse(event.data).msg);
    utterance.onend = () => {
      // console.log('utterance ended!');
      this.ws.send(JSON.stringify({ isDone: true }));
    };
    // console.log('SPEAKING!');
    synth.speak(utterance);
  }

  handleParticipantMessage(event) {
    // console.log('got participant message', event.data);
    const data = JSON.parse(event.data);
    if (data.isDone) {
      this.setState({
        lastMessageInProgress: false
      });
    }
  }

  updateProposedMessage(event) {
    this.setState({
      proposedMessage: event.target.value
    });
  }

  teeUp(msg) {
    this.setState({
      proposedMessage: msg.replace(/\.\.\.$/, '')
    }, () => this.inputBox.current.focus());
  }

  sendImmediately(msg) {
    this.sayMessage(msg);
  }

  sendTeedMessage() {
    this.sayMessage(this.state.proposedMessage);
    this.setState({
      proposedMessage: ''
    });
  }

  sayMessage(msg) {
    this.ws.send(JSON.stringify({ msg }));
    this.setState(state => ({
      lastMessageInProgress: true,
      sentMessages: [...state.sentMessages, msg]
    }));
  }

/* eslint-disable */
  render() {
    // const beep = new Audio(beepUrl);
    if (! this.state.isWizard) {
      return '';
    }

    const defaultMessages = [
      'Tell me about this function?',
      'Tell me about what you are thinking?',
      'Why did you choose to ...'
    ];

    return (
      <section className="wizard">
        <div className="default-messages">
          {defaultMessages.map((msg, i) => (
            <div key={`default-message-${i}`}>{msg}
              <button onClick={()=>this.teeUp(msg)}>🏌🏿‍♀️</button>
              <button onClick={()=>this.sendImmediately(msg)}>🚀</button>
            </div>
          ))}
        </div>
        <div className="scrolls-view">
          {this.state.sentMessages.map((msg, i, arr) =>
            <div key={`sent-message-${i}`}>{msg}
              <button onClick={()=>this.teeUp(msg)}>🏌🏿‍♀️</button>
              {i === arr.length-1 && this.state.lastMessageInProgress ?
                <button onClick={()=>this.justStopTalking()}>✋🏼</button> :
                <button onClick={()=>this.sendImmediately(msg)}>🚀</button>
              }
            </div>
          )}
        </div>
        🗣<input
            className="sayanything-box"
            ref={this.inputBox}
            onKeyPress={event => event.key === 'Enter' && this.sendTeedMessage()}
            type="text"
            placeholder="Say anything..."
            value={this.state.proposedMessage}
            onChange={(event) => this.updateProposedMessage(event)} />
        <button onClick={()=>this.sendTeedMessage()}>📢</button>
      </section>
    );
  }
}
/* eslint-enable */

WizardPanel.propTypes = {
};

export default WizardPanel;

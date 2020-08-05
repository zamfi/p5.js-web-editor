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
    const indexOfSelection = msg.indexOf('...');
    this.setState({
      proposedMessage: msg
    }, () => {
      this.inputBox.current.focus();
      if (indexOfSelection >= 0) {
        this.inputBox.current.setSelectionRange(indexOfSelection, indexOfSelection + 3);
      }
    });
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
      'Can you tell me about this function?',
      'What are you thinking about right now?',
      'Can you tell me why you choose to ...?',
      'What does the code on line... do?',
      'Can I add a comment about ...?'
    ];

    return (
      <section className="wizard">
        <div className="default-messages message-list">
          <h6>Canned Messages</h6>
          {defaultMessages.map((msg, i) => (
            <div key={`default-message-${i}`}><span onClick={()=>this.teeUp(msg)}>{msg}</span>
              <button onClick={()=>this.teeUp(msg)}>🏌🏿‍♀️</button>
              <button onClick={()=>this.sendImmediately(msg)} className="rocket-button">🚀</button>
            </div>
          ))}
        </div>
        <div className="scrolls-view message-list">
          <h6>Message History</h6>
          {this.state.sentMessages.length > 0 ? this.state.sentMessages.map((msg, i, arr) =>
            <div key={`sent-message-${i}`}><span onClick={()=>this.teeUp(msg)}>{msg}</span>
              <button onClick={()=>this.teeUp(msg)}>🏌🏿‍♀️</button>
              {i === arr.length-1 && this.state.lastMessageInProgress ?
                <button onClick={()=>this.justStopTalking()}>✋🏼</button> :
                <button onClick={()=>this.sendImmediately(msg)} className="rocket-button">🚀</button>
              }
            </div>
          ) : <span className="info">No message history (yet!)</span>}
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

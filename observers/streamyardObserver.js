
class StreamyardObserver {
  constructor() {
    this._timer = null;
    this._observer = null;
    this._updateLoops = 0;

    this.isInMeeting = false;
    this.isMuted = false;
    this.isVideoStarted = false;
    this.isShareStarted = false;
    this.isRecordStarted = false;
  };

  initialize = () => {
    // detect whether streamyard.com is the hostname of the page, otherwise do not initialize
    if (window.location.hostname !== 'streamyard.com') {
      console.log('Not on Streamyard page, not initializing Streamyard');
      return;
    }

    console.log('Initializing StreamyardObserver');
    this._observer = new MutationObserver(this._handleElementChange);
    this._observer.observe(document.body, {
      childList: false,
      attributes: true,
      attributeFilter: ["class"],
      attributeOldValue: true,
      subtree: true,
    });

    this._timer = setInterval(this.updateStreamyardStatus, 1000);
  };

  _handleElementChange = (mutationsList) => {
    this.updateStreamyardStatus();
  };

  updateStreamyardStatus = () => {
    let changed = false;

    // find the mute button
    let buttonMute = document.querySelector('button[aria-label="Mute microphone"]');
    if (buttonMute) {
      if (this.isMuted) {
        changed = true;
      }
      this.isMuted = false;
      this.isInMeeting = true;
    }
    else {
      // find the unmute button
      let buttonUnmute = document.querySelector('button[aria-label="Unmute microphone"]');
      if (buttonUnmute) {
        if (!this.isMuted) {
          changed = true;
        }
        this.isMuted = true;
        this.isInMeeting = true;
      } else {
        this.isInMeeting = false;
      }
    }

    if (this.isInMeeting) {
      // find the camera button in this html based on the "Stop cam" text:
      let stopCamSpan = Array.from(document.querySelectorAll('button span')).find(span => span.textContent === 'Stop cam');
      if (stopCamSpan) {
        if (!this.isVideoStarted) {
          changed = true;
        }
        this.isVideoStarted = true;
      }
      else {
        if (this.isVideoStarted) {
          changed = true;
        }
        this.isVideoStarted = false;
      }

      // find the stop sharing button
      let buttonStopSharing = document.querySelector('button[aria-label^="Stop sharing"]');
      if (buttonStopSharing) {
        if (!this.isShareStarted) {
          changed = true;
        }
        this.isShareStarted = true;
      }
      else {
        if (this.isShareStarted) {
          changed = true;
        }
        this.isShareStarted = false;
      }

      // find the end record button
      let buttonEndRecording = document.querySelector('button[aria-label="End recording"]');
      if (buttonEndRecording) {
        if (!this.isRecordStarted) {
          changed = true;
        }
        this.isRecordStarted = true;
      }
      else {
        // try the "End strean" button
        let buttonEndStream = document.querySelector('button[aria-label="End stream"]');
        if (buttonEndStream) {
          if (!this.isRecordStarted) {
            changed = true;
          }
          this.isRecordStarted = true;
        }
        else {
          if (this.isRecordStarted) {
            changed = true;
          }
          this.isRecordStarted = false;
        }
      }
    } // end if this.isInMeeting

    // send meeting status if it has been updated, or if it's been 1 second (250ms * 4) since the last update
    if (changed || this._updateLoops >= 3) {
      this.sendStreamyardStatus();
      this._updateLoops = 0;
    } else {
      this._updateLoops++;
    }
  }

  /**
   * Actions
   */

  toggleMute = () => {
    // find the mute button
    let buttonMute = document.querySelector('button[aria-label="Mute microphone"]');
    if (buttonMute) {
      buttonMute.click();
    }
    else {
      // find the unmute button
      let buttonUnmute = document.querySelector('button[aria-label="Unmute microphone"]');
      if (buttonUnmute) {
        buttonUnmute.click();
      }
      else {
        console.log('Unable to find mute/unmute button');
      }
    }
  }

  toggleVideo = () => {
    if (this.isVideoStarted) {
      let stopCamSpan = Array.from(document.querySelectorAll('button span')).find(span => span.textContent === 'Stop cam');
      if (stopCamSpan) {
        let buttonElement = stopCamSpan.closest('button');
        buttonElement.click();
      }
      else {
        console.log('Unable to find stop video button');
      }
    }
    else {
      let startCamSpan = Array.from(document.querySelectorAll('button span')).find(span => span.textContent === 'Start cam');
      if (startCamSpan) {
        let buttonElement = startCamSpan.closest('button');
        buttonElement.click();
      }
      else {
        console.log('Unable to find start video button');
      }
    }
  }

  toggleShare = () => {
    if (this.isShareStarted) {
      let buttonStopSharing = document.querySelector('button[aria-label^="Stop sharing"]');
      if (buttonStopSharing) {
        buttonStopSharing.click();
        console.log('Clicked stop sharing button');
      }
    }
    else {
      let buttonShare = document.querySelector('button[aria-label="Present"]');
      buttonShare.click();
    }
  };

  toggleRecord = () => {
    if (this.isRecordStarted) {
      let buttonEndRecording = document.querySelector('button[aria-label="End recording"]');
      if (buttonEndRecording) {
        buttonEndRecording.click();
        setTimeout(this._pressEndRecordConfirmationButton, 250);
      }
      else {
        // try the "End strean" button
        let buttonEndStream = document.querySelector('button[aria-label="End stream"]');
        if (buttonEndStream) {
          buttonEndStream.click();
          setTimeout(this._pressEndRecordConfirmationButton, 250);
        }
      }
    } // end if this.isRecordStarted
    else {
      let recordSpan = Array.from(document.querySelectorAll('button span')).find(span => span.textContent === 'Record');
      if (recordSpan) {
        let buttonElement = recordSpan.closest('button');
        buttonElement.click();
        setTimeout(this._pressRecordConfirmationButton, 250);
      }
      else {
        console.log('Unable to find record button');
      }
    }
  };

  _pressRecordConfirmationButton = () => {
    // Find the outer div element starting with "GoLiveOverlay"
    let outerDiv = document.querySelector('div[class^="GoLiveOverlay"]');

    // Check if the outer div is found
    if (outerDiv) {
      // Search for the button element with the text "Record"
      let recordSpan = Array.from(outerDiv.querySelectorAll('button span')).find(button => button.textContent.trim() === 'Record');

      // Check if the button element is found
      if (recordSpan) {
        let recordButton = recordSpan.closest('button');
        recordButton.click();
        console.log('Clicking record button');
      } else {
        console.log('Button with text "Record" not found within the outer div.');
      }
    } else {
      console.log('Outer div starting with "GoLiveOverlay" not found.');
    }
  };

  _pressEndRecordConfirmationButton = () => {
    // Find the outer div element starting with "GoLiveOverlay"
    let outerDiv = document.querySelector('div[class^="EndBroadcastOverlay"]');

    // Check if the outer div is found
    if (outerDiv) {
      // Search for the button element with the text "End recording" or "End stream"
      let recordSpan = Array.from(outerDiv.querySelectorAll('button span')).find(button => button.textContent.trim() === 'End recording' || button.textContent.trim() === 'End stream');

      // Check if the button element is found
      if (recordSpan) {
        let recordButton = recordSpan.closest('button');
        recordButton.click();
        console.log('Clicking end record/stream button');
      } else {
        console.log('Button with text "End [recording|stream]" not found within the outer div.');
      }
    } else {
      console.log('Outer div starting with "EndBroadcastOverlay" not found.');
    }
  };

  leaveCall = () => {
    let buttonLeave = document.querySelector('a[aria-label="Leave studio"]');
    buttonLeave.click();
    setTimeout(this._pressLeaveConfirmationButton, 250);
  }

  _pressLeaveConfirmationButton = () => {
    let leaveSpan = Array.from(document.querySelectorAll('a span')).find(button => button.textContent.trim() === 'Leave studio');
    // Check if the button element is found
    if (leaveSpan) {
      let leaveButton = leaveSpan.closest('a');
      leaveButton.click();
      console.log('Clicking leave link');
    } else {
      console.log('Button with text "Leave studio" not found within the outer div.');
    }
  };

  sendStreamyardStatus = () => {
    if (!this.isInMeeting) {
      return;
    }
    const message = {
      'source': 'browser-extension-plugin',
      'action': 'update-status',
      'status': this.isInMeeting ? 'call' : 'closed',
      'mute': this.isMuted ? 'muted' : 'unmuted',
      'video': this.isVideoStarted ? 'started' : 'stopped',
      'share': this.isShareStarted ? 'started' : 'stopped',
      'record': this.isRecordStarted ? 'started' : 'stopped',
      'control': 'streamyard',
    };
    //console.log(message);
    chrome.runtime.sendMessage({ action: "updateMuteDeckStatus", message: message });
  }
}
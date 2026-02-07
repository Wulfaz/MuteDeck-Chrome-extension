
class GoogleMeetObserver {
  constructor() {
    this._timer = null;
    this._observer = null;
    this._updateLoops = 0;

    this.isInMeeting = false;
    this.isInCompanionMode = false;
    this.isMuted = false;
    this.isVideoStarted = false;
    this.isShareStarted = false;
    this.isRecordStarted = false;
  };

  initialize = () => {
    // detect whether meet.google.com is the hostname of the page, otherwise do not initialize
    if (window.location.hostname !== 'meet.google.com') {
      console.log('Not on Google Meet page, not initializing GoogleMeetObserver');
      return;
    }

    console.log('Initializing GoogleMeetObserver');
    this._observer = new MutationObserver(this._handleElementChange);
    this._observer.observe(document.body, {
      childList: false,
      attributes: true,
      attributeFilter: ["data-is-muted"],
      attributeOldValue: true,
      subtree: true,
    });

    this._timer = setInterval(this.updateGoogleMeetStatus, 1000);
  };

  _handleElementChange = (mutationsList) => {
    this.updateGoogleMeetStatus();
  };

  updateGoogleMeetStatus = () => {
    let changed = false;

    // check if the meeting info icon is on the canvas. if yes, then we're in a meeting.
    let meetingInfo = document.querySelector('button[jsname="A5il2e"]');
    if (meetingInfo) {
      if (!this.isInMeeting) {
        changed = true;
      }
      this.isInMeeting = true;

      // check if the meeting mute button is on the canvas. if not, then we're in Companion mode.
      let muteButton = document.querySelector('button[jsname="hw0c9"]');
      if (muteButton) {
        if (this.isMuted !== Boolean(muteButton.getAttribute("data-is-muted") === 'true')) {
          this.isMuted = Boolean(muteButton.getAttribute("data-is-muted") === 'true');
          changed = true;
        }
        this.isInCompanionMode = false;
      } else {
        console.log('Mic button not found.');
        if (!this.isInCompanionMode) {
          changed = true;
        }
        this.isInCompanionMode = true;
      }

      let videoButton = document.querySelector('button[jsname="psRWwc"]');
      if (videoButton) {
        if (this.isVideoStarted !== Boolean(videoButton.getAttribute("data-is-muted") === 'false')) {
          this.isVideoStarted = Boolean(videoButton.getAttribute("data-is-muted") === 'false');
          changed = true;
        }
      } else {
        console.log('Video button not found.');
      }

      let currentlySharing = document.querySelector('div[jsname="mLjGHe"] button');
      if (currentlySharing) {
        if (!this.isShareStarted) {
          changed = true;
        }
        this.isShareStarted = true;
      } else {
        if (this.isShareStarted) {
          changed = true;
        }
        this.isShareStarted = false;
      }

      let isRecordingDiv = document.querySelector('div[jscontroller="e2jnoe"]');
      if (isRecordingDiv) {
        this.isRecordStarted = true;
      }
      else {
        this.isRecordStarted = false;
      }

    } else {
      if (this.isInMeeting) {
        changed = true;
      }
      this.isInMeeting = false;
    }

    // send meeting status if it has been updated, or if it's been 1 second (250ms * 4) since the last update
    if (changed || this._updateLoops >= 3) {
      // force sendGoogleMeetStatus when leaving a meeting
      this.sendGoogleMeetStatus(changed && !this.isInMeeting); // 'was in meeting but no more' -> force send
      this._updateLoops = 0;
    } else {
      this._updateLoops++;
    }
  }

  /**
   * Actions
   */

  toggleMute = () => {
    if (this.isInCompanionMode) {
      console.log('Do not toggle mute when in companion mode');
      return;
    }
    let muteButton = document.querySelector('button[jsname="hw0c9"]');
    if (muteButton) {
      console.log('Clicking mute button');
      muteButton.click();
    }
    else {
      console.log('Unable to find mute button');
    }
  }

  toggleVideo = () => {
    if (this.isInCompanionMode) {
      console.log('Do not toggle video when in companion mode');
      return;
    }
    let videoButton = document.querySelector('button[jsname="psRWwc"]');
    if (videoButton) {
      console.log('Clicking video button');
      videoButton.click();
    }
    else {
      console.log('Unable to find video button');
    }
  }

  /** Presenting functions */
  _pressStopPresenting = () => {
    let stopButton = document.querySelector('li:has(svg path[d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14H4V6h16v12z"])');
    if (stopButton) {
      console.log('Clicking stop presenting button');
      stopButton.click();
    }
    else {
      console.log('Unable to find stop presenting button');
    }
  }

  toggleShare = () => {
    if (this.isInCompanionMode) {
      console.log('Do not toggle share when in companion mode');
      return;
    }
    let currentlySharing = document.querySelector('div[jsname="mLjGHe"] button');
    if (currentlySharing) {
      console.log('Clicking stop sharing button');
      currentlySharing.click();
      setTimeout(this._pressStopPresenting, 250);
      return;
    }

    let startSharing = document.querySelector('button[jsname="hNGZQc"]');
    if (startSharing) {
      console.log('Clicking start sharing button');
      startSharing.click();
      return;
    }

    console.log('Unable to find share button');
  }

  /** Recording functions */
  _pressMoreOptionsButton = () => {
    let moreButton = document.querySelector('div[jsname="aGHX8e"] button');
    if (moreButton) {
      console.log('Clicking more options button');
      moreButton.click();
      return true;
    }

    console.log('Unable to find the More Options button where recording is hidden.');
    return false;
  }

  _pressControlRecording = () => {
    let controlRecordingButton = document.querySelector('ul[jsname="rymPhb"] li[jsname="wcuPXe"]');
    if (controlRecordingButton) {
      console.log('Clicking control recording button');
      controlRecordingButton.click();
      setTimeout(this._pressStartOrStopRecording, 500);
    }
    else {
      console.log('Unable to find control recording button');
    }
  }

  _pressStartOrStopRecording = () => {
    let startRecordingButton = document.querySelector(this.isRecordStarted ? 'button[jsname="ahMSA"]' : 'button[jsname="A0ONe"]');
    if (startRecordingButton) {
      console.log('Clicking start/stop recording button');
      startRecordingButton.click();
      setTimeout(this._pressReallyStartRecording, 250);
    }
    else {
      console.log('Unable to find start/stop recording button');
    }
  }

  _pressReallyStartRecording = () => {
    let reallyStartRecordingButton = document.querySelector('button[data-mdc-dialog-action="A9Emjd"]');
    if (reallyStartRecordingButton) {
      console.log('Clicking really start recording button');
      reallyStartRecordingButton.click();
    }
    else {
      console.log('Unable to find really start recording button');
    }
  }

  toggleRecord = () => {
    if (this.isInCompanionMode) {
      console.log('Do not toggle record when in companion mode');
      return;
    }
    console.log('Toggling recording');
    let moreButtonPressed = this._pressMoreOptionsButton();
    if (moreButtonPressed) {
      setTimeout(this._pressControlRecording, 250);
    }
  }

  /** Leaving functions */
  _pressPossibleConfirmationButton = () => {
    let readyButton = document.querySelector('button[data-mdc-dialog-action="Pd96ce"]');
    if (readyButton) {
      console.log('Clicking confirmation button');
      readyButton.click();
    }
  }

  leaveCall = () => {
    let leaveButton = document.querySelector('[jsname="CQylAd"]');
    if (leaveButton) {
      console.log('Clicking leave call button');
      leaveButton.click();
      setTimeout(this._pressPossibleConfirmationButton, 250);
    }
    else {
      console.log('Unable to find leave call button');
    }
  }

  // use param force to force send the status (after leaving a meeting for example)
  sendGoogleMeetStatus = (force = false) => {
    if (!force && (!this.isInMeeting || this.isInCompanionMode)) {
      return;
    }
    const message = {
      'source': 'google-meet-plugin',
      'action': 'update-status',
      'status': this.isInMeeting ? 'call' : 'closed',
      'mute': this.isMuted ? 'muted' : 'unmuted',
      'video': this.isVideoStarted ? 'started' : 'stopped',
      'share': this.isShareStarted ? 'started' : 'stopped',
      'record': this.isRecordStarted ? 'started' : 'stopped',
      'control': 'google-meet',
    };
    //console.log(message);
    chrome.runtime.sendMessage({ action: "updateMuteDeckStatus", message: message });
  }
}
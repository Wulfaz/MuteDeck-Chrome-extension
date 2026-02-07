
class TeamsObserver {
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
    // detect whether teams.microsoft.com is the hostname of the page, otherwise do not initialize
    if (!window.location.hostname.includes('teams.microsoft.com')) {
      console.log('Not on Teams page, not initializing TeamsObserver');
      return;
    }

    console.log('Initializing TeamsObserver');
    this._observer = new MutationObserver(this._handleElementChange);
    this._observer.observe(document.body, {
      childList: false,
      attributes: true,
      attributeFilter: ["class"],
      attributeOldValue: true,
      subtree: true,
    });

    this._timer = setInterval(this.updateTeamsStatus, 1000);
  };

  _handleElementChange = (mutationsList) => {
    this.updateTeamsStatus();
  };

  updateTeamsStatus = () => {
    let changed = false;

    // use the leave button to see if we're in a meeting
    let callDuration = document.querySelector('div[id="call-duration-custom"]');
    if (callDuration) {
      if (!this.isInMeeting) {
        changed = true;
      }
      this.isInMeeting = true;
    }
    else {
      if (this.isInMeeting) {
        changed = true;
      }
      this.isInMeeting = false;
    }

    if (this.isInMeeting) {

      // find the video button
      let buttonVideo = document.querySelector('button[id="video-button"]');
      if (buttonVideo) {
        let videoStopped = Boolean(buttonVideo.getAttribute("data-state") === 'call-video-off');
        if (videoStopped) {
          if (this.isVideoStarted) {
            changed = true;
          }
          this.isVideoStarted = false;
        }
        else {
          if (!this.isVideoStarted) {
            changed = true;
          }
          this.isVideoStarted = true;
        }
      }

      // find the mute button
      let buttonMic = document.querySelector('button[id="microphone-button"]');
      if (buttonMic) {
        let muted = Boolean(buttonMic.getAttribute("data-state") === 'mic-off');
        if (muted) {
          if (!this.isMuted) {
            changed = true;
          }
          this.isMuted = true;
        }
        else {
          if (!this.isMuted) {
            changed = true;
          }
          this.isMuted = false;
        }
      }

      // find the recording indicator
      let recordingIndicator = document.querySelector('div[id="recording-indicator-custom"]');
      if (recordingIndicator) {
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

      // find the sharing button
      let buttonShare = document.querySelector('button[id="share-button"]');
      if (buttonShare) {
        let presenting = Boolean(buttonShare.getAttribute("data-state") === 'call-control-stop-presenting-new');
        if (presenting) {
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
      }
    } // end if this.isInMeeting

    // send meeting status if it has been updated, or if it's been 1 second (250ms * 4) since the last update
    if (changed || this._updateLoops >= 3) {
      // force sendTeamsStatus when leaving a meeting
      this.sendTeamsStatus(changed && !this.isInMeeting); // 'was in meeting but no more' -> force send
      this._updateLoops = 0;
    } else {
      this._updateLoops++;
    }
  }

  /**
   * Actions
   */

  toggleMute = () => {
    let buttonMic = document.querySelector('button[id="microphone-button"]');
    buttonMic.click();
  }

  toggleVideo = () => {
    let buttonVideo = document.querySelector('button[id="video-button"]');
    buttonVideo.click();
  }

  toggleShare = () => {
    let buttonShare = document.querySelector('button[id="share-button"]');
    buttonShare.click();
  };

  toggleRecord = () => {
    console.log('Recording is not supported via web client');
  };

  leaveCall = () => {
    let buttonLeave = document.querySelector('button[id="hangup-button"]');
    buttonLeave.click();
  }

  // use param force to force send the status (after leaving a meeting for example)
  sendTeamsStatus = (force = false) => {
    if (!force && !this.isInMeeting) {
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
      'control': 'teams-web',
    };
    // console.log(message);
    chrome.runtime.sendMessage({ action: "updateMuteDeckStatus", message: message });
  }
}
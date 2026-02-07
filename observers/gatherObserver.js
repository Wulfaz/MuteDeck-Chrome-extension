
class GatherObserver {
  constructor() {
    this._timer = null;
    this._observer = null;
    this._updateLoops = 0;

    this.isInMeeting = false;
    this.isInExternalMeeting = false;
    this.isMuted = true;
    this.isVideoStarted = false;
    this.isShareStarted = false;
    this.isRecordStarted = false;
  };

  initialize = () => {
    // detect whether gather.town is the hostname of the page, otherwise do not initialize
    if (!window.location.hostname.endsWith('app.v2.gather.town')) {
      console.log('Not on Gather page, not initializing GatherObserver');
      return;
    }

    console.log('Initializing GatherObserver');
    this._observer = new MutationObserver(this._handleElementChange);
    this._observer.observe(document.body, {
      childList: false,
      attributes: true,
      attributeFilter: ["class"],
      attributeOldValue: true,
      subtree: true,
    });

    this._timer = setInterval(this.updateGatherStatus, 1000);
  };

  _handleElementChange = (mutationsList) => {
    this.updateGatherStatus();
  };

  updateGatherStatus = () => {
    let changed = false;

    // check if the share button is on the canvas. if yes, then we're in a meeting.
    let buttonShare = document.querySelector('button[data-testid="toggle-screen-share-button"]');
    if (buttonShare) {
      if (!this.isInMeeting) {
        changed = true;
      }
      this.isInMeeting = true;

      // check if the external meeting pop-up is on the canvas. if yes, then we're in an external meeting.
      let popupExternalMeeting = document.querySelector('span[class="_916lke19 _916lke0 _916lke15 _916lke2p _916lke2d _916lke2 _916lke2m"');
      if (popupExternalMeeting) {
        if (!this.isInExternalMeeting) {
          changed = true;
        }
        this.isInExternalMeeting = true;
      } else {
        if (this.isInExternalMeeting) {
          changed = true;
        }
        this.isInExternalMeeting = false;
      }

      // find the mute button and detect its state
      let buttonMute = document.querySelector('button[data-testid="toggle-microphone-on-button"], button[data-testid="toggle-microphone-off-button"]');
      if (buttonMute.getAttribute('data-testid')?.includes('toggle-microphone-off-button')) {
        if (this.isMuted) {
          changed = true;
        }
        this.isMuted = false;
      } else if (buttonMute.getAttribute('data-testid')?.includes('toggle-microphone-on-button')) {
        if (!this.isMuted) {
          changed = true;
        }
        this.isMuted = true;
      }

      // find the video button and detect its state
      let buttonVideo = document.querySelector('button[data-testid="toggle-camera-on-button"], button[data-testid="toggle-camera-off-button"]');
      if (buttonVideo.getAttribute('data-testid')?.includes('toggle-camera-off-button')) {
        if (!this.isVideoStarted) {
          changed = true;
        }
        this.isVideoStarted = true;
      } else if (buttonVideo.getAttribute('data-testid')?.includes('toggle-camera-on-button')) {
        if (this.isVideoStarted) {
          changed = true;
        }
        this.isVideoStarted = false;
      }

      // find the record button and detect its state
      let buttonRecord = document.querySelector('button[class="u51l8l0 jroftr2 jroftre jroftrg jroftrj"]');
      let buttonStopRecord = document.querySelector('button[class="u51l8l0 jroftr2 jroftre jroftrg jroftri jroftrr"]');
      if (buttonStopRecord) {
        if (!this.isRecordStarted) {
          changed = true;
        }
        this.isRecordStarted = true;
      } else if (buttonRecord) {
        if (this.isRecordStarted) {
          changed = true;
        }
        this.isRecordStarted = false;
      }

      // find the share button and detect its state
      // let buttonShare = document.querySelector('button[data-testid="toggle-screen-share-button"]');
      if (buttonShare) {
        if (buttonShare.getAttribute('class')?.includes('jroftrn')) {
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
      }

    } else {
      if (this.isInMeeting) {
        changed = true;
      }
      this.isInMeeting = false;
    }

    // send meeting status if it has been updated, or if it's been 1 second (250ms * 4) since the last update
    if (changed || this._updateLoops >= 3) {
      // force sendGatherStatus when leaving a meeting
      this.sendGatherStatus(changed && !this.isInMeeting); // 'was in meeting but no more' -> force send
      this._updateLoops = 0;
    } else {
      this._updateLoops++;
    }
  }

  /**
   * Actions
   */

  toggleMute = () => {
    if (this.isInExternalMeeting) {
      console.log('Do not toggle mute when in external meeting');
      return;
    }
    let buttonMic = document.querySelector('button[data-testid="toggle-microphone-on-button"], button[data-testid="toggle-microphone-off-button"]');
    if (!buttonMic) {
      console.log('Mute button not found');
      return;
    }
    buttonMic.click();
  }

  toggleVideo = () => {
    if (this.isInExternalMeeting) {
      console.log('Do not toggle video when in external meeting');
      return;
    }
    let buttonVideo = document.querySelector('button[data-testid="toggle-camera-on-button"], button[data-testid="toggle-camera-off-button"]');
    if (!buttonVideo) {
      console.log('Video button not found');
      return;
    }
    buttonVideo.click();
  }

  toggleShare = () => {
    if (this.isInExternalMeeting) {
      console.log('Do not toggle share when in external meeting');
      return;
    }
    let buttonShare = document.querySelector('button[data-testid="toggle-screen-share-button"]');
    if (!buttonShare) {
      console.log('Share button not found');
      return;
    }
    buttonShare.click();
  };

  /** Recording functions */
  _checkRecordVideoCheckbox = () => {
    let inputRecordVideo = document.querySelector('input[type="checkbox"][data-testid="Record video-checkbox"]');
    if (!inputRecordVideo) {
      console.log('Record video checkbox not found');
      return;
    }
    inputRecordVideo.checked = true;
  }

  _checkRecordTranscriptCheckbox = () => {
    let inputRecordTranscript = document.querySelector('input[type="checkbox"][data-testid="Record AI meeting notes-checkbox"]');
    if (!inputRecordTranscript) {
      console.log('Record transcript checkbox not found');
      return;
    }
    inputRecordTranscript.checked = true;
  }

  _fillInTheFormAndStartRecord = () => {
    this._checkRecordVideoCheckbox();
    this._checkRecordTranscriptCheckbox();
    let buttonRecordFinal = document.querySelector('button[class="_1dnchzy0 _1dnchzy9 _1dnchzy1 _1dnchzyc"]');
    if (!buttonRecordFinal || buttonRecordFinal.disabled) {
      console.log('Popoup Record button not found');
      return;
    }
    buttonRecordFinal.click();
  }

  _endRecord = () => {
    let buttonStopRecord = document.querySelector('button[class="_1dnchzy0 _1dnchzy9 _1dnchzy3 _1dnchzyc"]');
    if (!buttonStopRecord) {
      console.log('Popup Stop Record button not found');
      return;
    }
    buttonStopRecord.click();
  }

  toggleRecord = () => {
    if (this.isInExternalMeeting) {
      console.log('Do not toggle record when in external meeting');
      return;
    }
    if (!this.isRecordStarted) {
      let buttonRecord = document.querySelector('button[class="u51l8l0 jroftr2 jroftre jroftrg jroftrj"]');
      if (!buttonRecord) {
        console.log('Record button not found');
        return;
      }
      buttonRecord.click();
      setTimeout(() => this._fillInTheFormAndStartRecord(), 1000);
    } else {
      let buttonStopRecord = document.querySelector('button[class="u51l8l0 jroftr2 jroftre jroftrg jroftri jroftrr"]');
      if (!buttonStopRecord) {
        console.log('Stop Record button not found');
        return;
      }
      buttonStopRecord.click();
      setTimeout(() => this._endRecord(), 1000);
    }
  }

  leaveCall = () => {
    let buttonLeave = document.querySelector('button[data-testid="leave-meeting-button"]');
    if (!buttonLeave) {
      console.log('Leave button not found');
      return;
    }
    buttonLeave.click();
  }

  // use param force to force send the status (after leaving a meeting for example)
  sendGatherStatus = (force = false) => {
    if (!force && (!this.isInMeeting || this.isInExternalMeeting)) {
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
      'control': 'zoom-web', // 'zoom-web' is used to have a camera icon on the MuteDeck app for the bring-to-front button
    };
    //console.log(message);
    chrome.runtime.sendMessage({ action: "updateMuteDeckStatus", message: message });
  }
}
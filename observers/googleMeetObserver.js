
class GoogleMeetObserver extends BaseObserver {
  static SELECTORS = {
    meetingInfo: 'button[jsname="A5il2e"]',
    muteButton: 'button[jsname="hw0c9"]',
    videoButton: 'button[jsname="psRWwc"]',
    shareIndicator: 'div[jsname="mLjGHe"] button',
    startShareButton: 'button[jsname="hNGZQc"]',
    recordingIndicator: 'div[jscontroller="e2jnoe"]',
    leaveButton: '[jsname="CQylAd"]',
    leaveConfirmButton: 'button[data-mdc-dialog-action="Pd96ce"]',
    moreOptionsButton: 'div[jsname="aGHX8e"] button',
    controlRecordingButton: 'ul[jsname="rymPhb"] li[jsname="wcuPXe"]',
    startRecordingButton: 'button[jsname="A0ONe"]',
    stopRecordingButton: 'button[jsname="ahMSA"]',
    recordConfirmButton: 'button[data-mdc-dialog-action="A9Emjd"]',
    stopPresentingSvgPath: 'li:has(svg path[d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14H4V6h16v12z"])'
  };

  get platformId() {
    return 'google-meet';
  }

  get messageSource() {
    return 'google-meet-plugin';
  }

  get hostnames() {
    return 'meet.google.com';
  }

  get mutationObserverConfig() {
    return {
      childList: false,
      attributes: true,
      attributeFilter: ['data-is-muted'],
      attributeOldValue: true,
      subtree: true
    };
  }

  _initializeState() {
    this.isInCompanionMode = false;
  }

  _captureCustomState() {
    return { isInCompanionMode: this.isInCompanionMode };
  }

  _hasCustomStateChanged(previousState) {
    return previousState.isInCompanionMode !== this.isInCompanionMode;
  }

  _areActionsBlocked() {
    if (this.isInCompanionMode) {
      console.log('Do not toggle when in companion mode');
      return true;
    }
    return false;
  }

  _shouldSendStatus() {
    return this.isInMeeting && !this.isInCompanionMode;
  }

  _detectStatus() {
    const doc = this._getDocument();
    const { SELECTORS } = GoogleMeetObserver;

    // Detect meeting by meeting info button
    const meetingInfo = doc.querySelector(SELECTORS.meetingInfo);

    if (meetingInfo) {
      this.isInMeeting = true;

      // Check for companion mode (no mute button means companion mode)
      const muteButton = doc.querySelector(SELECTORS.muteButton);
      if (muteButton) {
        this.isInCompanionMode = false;
        this.isMuted = muteButton.getAttribute('data-is-muted') === 'true';
      } else {
        console.log('Mic button not found.');
        this.isInCompanionMode = true;
      }

      // Detect video state
      const videoButton = doc.querySelector(SELECTORS.videoButton);
      if (videoButton) {
        this.isVideoStarted = videoButton.getAttribute('data-is-muted') === 'false';
      } else {
        console.log('Video button not found.');
      }

      // Detect share state
      this.isShareStarted = ObserverUtils.elementExists(doc, SELECTORS.shareIndicator);

      // Detect recording state
      this.isRecordStarted = ObserverUtils.elementExists(doc, SELECTORS.recordingIndicator);
    } else {
      this.isInMeeting = false;
    }
  }

  _performToggleMute() {
    ObserverUtils.clickButton(this._getDocument(), GoogleMeetObserver.SELECTORS.muteButton, 'mute');
  }

  _performToggleVideo() {
    ObserverUtils.clickButton(this._getDocument(), GoogleMeetObserver.SELECTORS.videoButton, 'video');
  }

  _performToggleShare() {
    const doc = this._getDocument();
    const { SELECTORS } = GoogleMeetObserver;

    // Check if currently sharing
    const currentlySharing = doc.querySelector(SELECTORS.shareIndicator);
    if (currentlySharing) {
      console.log('Clicking stop sharing button');
      currentlySharing.click();
      setTimeout(() => this._pressStopPresenting(), 250);
      return;
    }

    // Try to start sharing
    ObserverUtils.clickButton(doc, SELECTORS.startShareButton, 'start sharing');
  }

  _pressStopPresenting() {
    ObserverUtils.clickButton(this._getDocument(), GoogleMeetObserver.SELECTORS.stopPresentingSvgPath, 'stop presenting');
  }

  _performToggleRecord() {
    console.log('Toggling recording');
    const moreButtonPressed = this._pressMoreOptionsButton();
    if (moreButtonPressed) {
      setTimeout(() => this._pressControlRecording(), 250);
    }
  }

  _pressMoreOptionsButton() {
    const doc = this._getDocument();
    const moreButton = doc.querySelector(GoogleMeetObserver.SELECTORS.moreOptionsButton);
    if (moreButton) {
      console.log('Clicking more options button');
      moreButton.click();
      return true;
    }
    console.log('Unable to find the More Options button where recording is hidden.');
    return false;
  }

  _pressControlRecording() {
    const doc = this._getDocument();
    const controlRecordingButton = doc.querySelector(GoogleMeetObserver.SELECTORS.controlRecordingButton);
    if (controlRecordingButton) {
      console.log('Clicking control recording button');
      controlRecordingButton.click();
      setTimeout(() => this._pressStartOrStopRecording(), 500);
    } else {
      console.log('Unable to find control recording button');
    }
  }

  _pressStartOrStopRecording() {
    const doc = this._getDocument();
    const { SELECTORS } = GoogleMeetObserver;
    const selector = this.isRecordStarted ? SELECTORS.stopRecordingButton : SELECTORS.startRecordingButton;
    const button = doc.querySelector(selector);

    if (button) {
      console.log('Clicking start/stop recording button');
      button.click();
      setTimeout(() => this._pressRecordConfirmation(), 250);
    } else {
      console.log('Unable to find start/stop recording button');
    }
  }

  _pressRecordConfirmation() {
    const doc = this._getDocument();
    const confirmButton = doc.querySelector(GoogleMeetObserver.SELECTORS.recordConfirmButton);
    if (confirmButton) {
      console.log('Clicking recording confirmation button');
      confirmButton.click();
    } else {
      console.log('Unable to find recording confirmation button');
    }
  }

  _performLeaveCall() {
    const doc = this._getDocument();
    const { SELECTORS } = GoogleMeetObserver;

    const leaveButton = doc.querySelector(SELECTORS.leaveButton);
    if (leaveButton) {
      console.log('Clicking leave call button');
      leaveButton.click();
      setTimeout(() => this._pressLeaveConfirmation(), 250);
    } else {
      console.log('Unable to find leave call button');
    }
  }

  _pressLeaveConfirmation() {
    const doc = this._getDocument();
    const confirmButton = doc.querySelector(GoogleMeetObserver.SELECTORS.leaveConfirmButton);
    if (confirmButton) {
      console.log('Clicking leave confirmation button');
      confirmButton.click();
    }
  }
}


class StreamyardObserver extends BaseObserver {
  static SELECTORS = {
    muteButton: 'button[aria-label="Mute microphone"]',
    unmuteButton: 'button[aria-label="Unmute microphone"]',
    stopCamText: 'Stop cam',
    startCamText: 'Start cam',
    stopShareButton: 'button[aria-label^="Stop sharing"]',
    startShareButton: 'button[aria-label="Present"]',
    endRecordingButton: 'button[aria-label="End recording"]',
    endStreamButton: 'button[aria-label="End stream"]',
    recordText: 'Record',
    leaveButton: 'a[aria-label="Leave studio"]',
    leaveText: 'Leave studio',
    goLiveOverlay: 'div[class^="GoLiveOverlay"]',
    endBroadcastOverlay: 'div[class^="EndBroadcastOverlay"]'
  };

  get platformId() {
    return 'streamyard';
  }

  get hostnames() {
    return 'streamyard.com';
  }

  _detectStatus() {
    const doc = this._getDocument();
    const { SELECTORS } = StreamyardObserver;

    // Detect meeting and mute state from mute/unmute button
    const muteButton = doc.querySelector(SELECTORS.muteButton);
    const unmuteButton = doc.querySelector(SELECTORS.unmuteButton);

    if (muteButton) {
      this.isInMeeting = true;
      this.isMuted = false;
    } else if (unmuteButton) {
      this.isInMeeting = true;
      this.isMuted = true;
    } else {
      this.isInMeeting = false;
    }

    if (this.isInMeeting) {
      // Detect video state by looking for "Stop cam" text
      const stopCamSpan = ObserverUtils.findByText(doc, 'button span', SELECTORS.stopCamText);
      this.isVideoStarted = stopCamSpan !== null;

      // Detect share state
      this.isShareStarted = ObserverUtils.elementExists(doc, SELECTORS.stopShareButton);

      // Detect recording state
      this.isRecordStarted = ObserverUtils.elementExists(doc, SELECTORS.endRecordingButton) ||
        ObserverUtils.elementExists(doc, SELECTORS.endStreamButton);
    }
  }

  _performToggleMute() {
    const doc = this._getDocument();
    const { SELECTORS } = StreamyardObserver;

    if (!ObserverUtils.clickButton(doc, SELECTORS.muteButton, 'mute')) {
      ObserverUtils.clickButton(doc, SELECTORS.unmuteButton, 'unmute');
    }
  }

  _performToggleVideo() {
    const doc = this._getDocument();
    const { SELECTORS } = StreamyardObserver;
    const textToFind = this.isVideoStarted ? SELECTORS.stopCamText : SELECTORS.startCamText;

    const camSpan = ObserverUtils.findByText(doc, 'button span', textToFind);
    if (camSpan) {
      const button = camSpan.closest('button');
      button.click();
      console.log(`Clicking ${textToFind} button`);
    } else {
      console.log(`Unable to find ${textToFind} button`);
    }
  }

  _performToggleShare() {
    const doc = this._getDocument();
    const { SELECTORS } = StreamyardObserver;

    if (this.isShareStarted) {
      ObserverUtils.clickButton(doc, SELECTORS.stopShareButton, 'stop sharing');
    } else {
      ObserverUtils.clickButton(doc, SELECTORS.startShareButton, 'present');
    }
  }

  _performToggleRecord() {
    const doc = this._getDocument();
    const { SELECTORS } = StreamyardObserver;

    if (this.isRecordStarted) {
      // Click end recording or end stream button
      if (!ObserverUtils.clickButton(doc, SELECTORS.endRecordingButton, 'end recording')) {
        ObserverUtils.clickButton(doc, SELECTORS.endStreamButton, 'end stream');
      }
      setTimeout(() => this._pressEndRecordConfirmationButton(), 250);
    } else {
      // Find and click Record button by text
      const recordSpan = ObserverUtils.findByText(doc, 'button span', SELECTORS.recordText);
      if (recordSpan) {
        const button = recordSpan.closest('button');
        button.click();
        console.log('Clicking record button');
        setTimeout(() => this._pressRecordConfirmationButton(), 250);
      } else {
        console.log('Unable to find record button');
      }
    }
  }

  _pressRecordConfirmationButton() {
    const doc = this._getDocument();
    const { SELECTORS } = StreamyardObserver;

    const outerDiv = doc.querySelector(SELECTORS.goLiveOverlay);
    if (outerDiv) {
      const recordSpan = ObserverUtils.findByText(outerDiv, 'button span', SELECTORS.recordText);
      if (recordSpan) {
        const recordButton = recordSpan.closest('button');
        recordButton.click();
        console.log('Clicking record confirmation button');
      } else {
        console.log('Button with text "Record" not found within the overlay');
      }
    } else {
      console.log('GoLiveOverlay not found');
    }
  }

  _pressEndRecordConfirmationButton() {
    const doc = this._getDocument();
    const { SELECTORS } = StreamyardObserver;

    const outerDiv = doc.querySelector(SELECTORS.endBroadcastOverlay);
    if (outerDiv) {
      const endSpan = Array.from(outerDiv.querySelectorAll('button span'))
        .find(span => span.textContent.trim() === 'End recording' || span.textContent.trim() === 'End stream');
      if (endSpan) {
        const button = endSpan.closest('button');
        button.click();
        console.log('Clicking end record/stream confirmation button');
      } else {
        console.log('End recording/stream button not found within the overlay');
      }
    } else {
      console.log('EndBroadcastOverlay not found');
    }
  }

  _performLeaveCall() {
    const doc = this._getDocument();
    const { SELECTORS } = StreamyardObserver;

    ObserverUtils.clickButton(doc, SELECTORS.leaveButton, 'leave studio');
    setTimeout(() => this._pressLeaveConfirmationButton(), 250);
  }

  _pressLeaveConfirmationButton() {
    const doc = this._getDocument();
    const { SELECTORS } = StreamyardObserver;

    const leaveSpan = ObserverUtils.findByText(doc, 'a span', SELECTORS.leaveText);
    if (leaveSpan) {
      const leaveLink = leaveSpan.closest('a');
      leaveLink.click();
      console.log('Clicking leave confirmation link');
    } else {
      console.log('Leave studio confirmation not found');
    }
  }
}

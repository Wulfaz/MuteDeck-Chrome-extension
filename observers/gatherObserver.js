
class GatherObserver extends BaseObserver {
  static SELECTORS = {
    shareButton: 'button[data-testid="toggle-screen-share-button"]',
    micOnButton: 'button[data-testid="toggle-microphone-on-button"]',
    micOffButton: 'button[data-testid="toggle-microphone-off-button"]',
    micButton: 'button[data-testid="toggle-microphone-on-button"], button[data-testid="toggle-microphone-off-button"]',
    camOnButton: 'button[data-testid="toggle-camera-on-button"]',
    camOffButton: 'button[data-testid="toggle-camera-off-button"]',
    camButton: 'button[data-testid="toggle-camera-on-button"], button[data-testid="toggle-camera-off-button"]',
    recordButton: 'button[class="u51l8l0 jroftr2 jroftre jroftrg jroftrj"]',
    stopRecordButton: 'button[class="u51l8l0 jroftr2 jroftre jroftrg jroftri jroftrr"]',
    leaveButton: 'button[data-testid="leave-meeting-button"]',
    externalMeetingPopup: 'span[class="_916lke19 _916lke0 _916lke15 _916lke2p _916lke2d _916lke2 _916lke2m"',
    shareActiveClass: 'jroftrn',
    recordVideoCheckbox: 'input[type="checkbox"][data-testid="Record video-checkbox"]',
    recordTranscriptCheckbox: 'input[type="checkbox"][data-testid="Record AI meeting notes-checkbox"]',
    recordConfirmButton: 'button[class="_1dnchzy0 _1dnchzy9 _1dnchzy1 _1dnchzyc"]',
    stopRecordConfirmButton: 'button[class="_1dnchzy0 _1dnchzy9 _1dnchzy3 _1dnchzyc"]',
    nearbyButton: 'button[data-onboarding-task-id="NearbyChat"]'
  };

  get platformId() {
    // Uses 'zoom-web' to get camera icon on MuteDeck app for bring-to-front button
    return 'zoom-web';
  }

  get hostnames() {
    return 'app.v2.gather.town';
  }

  _initializeState() {
    this.isInExternalMeeting = false;
    this.isMuted = true; // Default to muted for Gather
  }

  _captureCustomState() {
    return { isInExternalMeeting: this.isInExternalMeeting };
  }

  _hasCustomStateChanged(previousState) {
    return previousState.isInExternalMeeting !== this.isInExternalMeeting;
  }

  _areActionsBlocked() {
    if (this.isInExternalMeeting) {
      console.log('Do not toggle when in external meeting');
      return true;
    }
    return false;
  }

  _shouldSendStatus() {
    return this.isInMeeting && !this.isInExternalMeeting;
  }

  _detectStatus() {
    const doc = this._getDocument();
    const { SELECTORS } = GatherObserver;

    // Detect meeting by nearby chat button non presence
    const nearbyButton = doc.querySelector(SELECTORS.nearbyButton);

    if (!nearbyButton) {
      this.isInMeeting = true;

      // Check for external meeting popup
      this.isInExternalMeeting = ObserverUtils.elementExists(doc, SELECTORS.externalMeetingPopup);

      // Detect mute state
      const micButton = doc.querySelector(SELECTORS.micButton);
      if (micButton) {
        const testId = micButton.getAttribute('data-testid') || '';
        if (testId.includes('toggle-microphone-off-button')) {
          this.isMuted = false;
        } else if (testId.includes('toggle-microphone-on-button')) {
          this.isMuted = true;
        }
      }

      // Detect video state
      const camButton = doc.querySelector(SELECTORS.camButton);
      if (camButton) {
        const testId = camButton.getAttribute('data-testid') || '';
        if (testId.includes('toggle-camera-off-button')) {
          this.isVideoStarted = true;
        } else if (testId.includes('toggle-camera-on-button')) {
          this.isVideoStarted = false;
        }
      }

      // Detect recording state
      const stopRecordButton = doc.querySelector(SELECTORS.stopRecordButton);
      const recordButton = doc.querySelector(SELECTORS.recordButton);
      if (stopRecordButton) {
        this.isRecordStarted = true;
      } else if (recordButton) {
        this.isRecordStarted = false;
      }

      // Detect share state by class on share button
      const shareButton = doc.querySelector(SELECTORS.shareButton);
      const shareClass = shareButton ? shareButton.getAttribute('class') || '' : '';
      this.isShareStarted = shareClass.includes(SELECTORS.shareActiveClass);
    } else {
      this.isInMeeting = false;
    }
  }

  _performToggleMute() {
    ObserverUtils.clickButton(this._getDocument(), GatherObserver.SELECTORS.micButton, 'microphone');
  }

  _performToggleVideo() {
    ObserverUtils.clickButton(this._getDocument(), GatherObserver.SELECTORS.camButton, 'camera');
  }

  _performToggleShare() {
    ObserverUtils.clickButton(this._getDocument(), GatherObserver.SELECTORS.shareButton, 'screen share');
  }

  _performToggleRecord() {
    const doc = this._getDocument();
    const { SELECTORS } = GatherObserver;

    if (!this.isRecordStarted) {
      const recordButton = doc.querySelector(SELECTORS.recordButton);
      if (!recordButton) {
        console.log('Record button not found');
        return;
      }
      recordButton.click();
      setTimeout(() => this._fillInTheFormAndStartRecord(), 1000);
    } else {
      const stopRecordButton = doc.querySelector(SELECTORS.stopRecordButton);
      if (!stopRecordButton) {
        console.log('Stop Record button not found');
        return;
      }
      stopRecordButton.click();
      setTimeout(() => this._endRecord(), 1000);
    }
  }

  _fillInTheFormAndStartRecord() {
    const doc = this._getDocument();
    const { SELECTORS } = GatherObserver;

    // Check record video checkbox
    const videoCheckbox = doc.querySelector(SELECTORS.recordVideoCheckbox);
    if (videoCheckbox) {
      videoCheckbox.checked = true;
    } else {
      console.log('Record video checkbox not found');
    }

    // Check record transcript checkbox
    const transcriptCheckbox = doc.querySelector(SELECTORS.recordTranscriptCheckbox);
    if (transcriptCheckbox) {
      transcriptCheckbox.checked = true;
    } else {
      console.log('Record transcript checkbox not found');
    }

    // Click confirm button
    const confirmButton = doc.querySelector(SELECTORS.recordConfirmButton);
    if (!confirmButton || confirmButton.disabled) {
      console.log('Popup Record button not found or disabled');
      return;
    }
    confirmButton.click();
  }

  _endRecord() {
    const doc = this._getDocument();
    const stopButton = doc.querySelector(GatherObserver.SELECTORS.stopRecordConfirmButton);
    if (!stopButton) {
      console.log('Popup Stop Record button not found');
      return;
    }
    stopButton.click();
  }

  _performLeaveCall() {
    ObserverUtils.clickButton(this._getDocument(), GatherObserver.SELECTORS.leaveButton, 'leave meeting');
  }
}

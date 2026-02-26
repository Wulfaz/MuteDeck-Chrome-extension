
class RiversideObserver extends BaseObserver {
  static SELECTORS = {
    micButton: 'button[data-automation-class*="mic-btn"], button[data-testid*="mic-btn"]',
    camButton: 'button[data-automation-class*="cam-btn"], button[data-testid*="cam-btn"]',
    recordButton: 'button[data-automation-class*="record-btn"], button[data-testid*="record-btn"]',
    shareButton: 'button[aria-label="Share"]',
    stopShareButton: 'button[aria-label="Stop"]',
    screenShareOption: 'button[data-automation-class*="screen-button"], button[data-testid*="screen-button"]',
    leaveButton: 'button[data-automation-class*="leave-btn"], button[data-testid*="leave-btn"]',
    leaveStudioButton: 'button[data-automation-class*="leave-studio-button"], button[data-testid*="leave-studio-button"]'
  };

  get platformId() {
    return 'riverside';
  }

  get hostnames() {
    return '.riverside.fm';
  }

  _detectStatus() {
    const doc = this._getDocument();
    const { SELECTORS } = RiversideObserver;

    // Detect meeting by mic button presence
    const micButton = doc.querySelector(SELECTORS.micButton);

    if (micButton) {
      this.isInMeeting = true;

      // Detect mute state from data-automation-class or data-testid
      const micClass = micButton.getAttribute('data-automation-class') || micButton.getAttribute('data-testid') || '';
      if (micClass.includes('disabled')) {
        this.isMuted = true;
      } else if (micClass.includes('enabled')) {
        this.isMuted = false;
      }

      // Detect video state
      const camButton = doc.querySelector(SELECTORS.camButton);
      if (camButton) {
        const camClass = camButton.getAttribute('data-automation-class') || camButton.getAttribute('data-testid') || '';
        if (camClass.includes('disabled')) {
          this.isVideoStarted = false;
        } else if (camClass.includes('enabled')) {
          this.isVideoStarted = true;
        }
      }

      // Detect recording state
      const recordButton = doc.querySelector(SELECTORS.recordButton);
      if (recordButton) {
        const recordClass = recordButton.getAttribute('data-automation-class') || recordButton.getAttribute('data-testid') || '';
        if (recordClass.includes('recording')) {
          this.isRecordStarted = true;
        } else if (recordClass.includes('stopped')) {
          this.isRecordStarted = false;
        }
      }

      // Detect share state
      const shareButton = doc.querySelector(SELECTORS.shareButton);
      if (shareButton) {
        this.isShareStarted = false;
      } else {
        const stopShareButton = doc.querySelector(SELECTORS.stopShareButton);
        if (stopShareButton) {
          this.isShareStarted = true;
        }
      }
    } else {
      this.isInMeeting = false;
    }
  }

  _performToggleMute() {
    ObserverUtils.clickButton(this._getDocument(), RiversideObserver.SELECTORS.micButton, 'mic');
  }

  _performToggleVideo() {
    ObserverUtils.clickButton(this._getDocument(), RiversideObserver.SELECTORS.camButton, 'camera');
  }

  _performToggleShare() {
    const doc = this._getDocument();
    const { SELECTORS } = RiversideObserver;

    if (this.isShareStarted) {
      ObserverUtils.clickButton(doc, SELECTORS.stopShareButton, 'stop share');
    } else {
      const shareButton = doc.querySelector(SELECTORS.shareButton);
      if (!shareButton) {
        console.log('Share button not found');
        return;
      }

      // Simulate hover to show menu
      ObserverUtils.simulateHover(shareButton);

      // Click screen share option after delay
      setTimeout(() => {
        const screenShareButton = doc.querySelector(SELECTORS.screenShareOption);
        if (screenShareButton) {
          screenShareButton.click();
          console.log('Clicking screen share option');
        } else {
          console.log('Screen share option not found after hover');
        }
      }, 1000);
    }
  }

  _performToggleRecord() {
    ObserverUtils.clickButton(this._getDocument(), RiversideObserver.SELECTORS.recordButton, 'record');
  }

  _performLeaveCall() {
    const doc = this._getDocument();
    const { SELECTORS } = RiversideObserver;

    const leaveButton = doc.querySelector(SELECTORS.leaveButton);
    if (!leaveButton) {
      console.log('Leave button not found');
      return;
    }

    // Simulate hover to show menu
    ObserverUtils.simulateHover(leaveButton);

    // Click leave studio option after delay
    setTimeout(() => {
      const leaveStudioButton = doc.querySelector(SELECTORS.leaveStudioButton);
      if (leaveStudioButton) {
        leaveStudioButton.click();
        console.log('Clicking leave studio button');
      } else {
        console.log('Leave studio button not found after hover');
      }
      // Press enter for confirmation dialog
      ObserverUtils.pressEnter(doc);
    }, 1000);
  }
}

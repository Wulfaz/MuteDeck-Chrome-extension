
class TeamsObserver extends BaseObserver {
  static SELECTORS = {
    callDuration: 'div[id="call-duration-custom"]',
    micButton: 'button[id="microphone-button"]',
    videoButton: 'button[id="video-button"]',
    shareButton: 'button[id="share-button"]',
    recordingIndicator: 'div[id="recording-indicator-custom"]',
    leaveButton: 'button[id="hangup-button"]'
  };

  get platformId() {
    return 'teams-web';
  }

  get hostnames() {
    return 'teams.microsoft.com';
  }

  _detectStatus() {
    const doc = this._getDocument();
    const { SELECTORS } = TeamsObserver;

    // Detect meeting by call duration element
    this.isInMeeting = ObserverUtils.elementExists(doc, SELECTORS.callDuration);

    if (this.isInMeeting) {
      // Detect mute state
      const micState = ObserverUtils.getElementAttribute(doc, SELECTORS.micButton, 'data-state');
      if (micState !== null) {
        this.isMuted = micState === 'mic-off';
      }

      // Detect video state
      const videoState = ObserverUtils.getElementAttribute(doc, SELECTORS.videoButton, 'data-state');
      if (videoState !== null) {
        this.isVideoStarted = videoState !== 'call-video-off';
      }

      // Detect recording state
      this.isRecordStarted = ObserverUtils.elementExists(doc, SELECTORS.recordingIndicator);

      // Detect share state
      const shareState = ObserverUtils.getElementAttribute(doc, SELECTORS.shareButton, 'data-state');
      if (shareState !== null) {
        this.isShareStarted = shareState === 'call-control-stop-presenting-new';
      }
    }
  }

  _performToggleMute() {
    ObserverUtils.clickButton(this._getDocument(), TeamsObserver.SELECTORS.micButton, 'mute');
  }

  _performToggleVideo() {
    ObserverUtils.clickButton(this._getDocument(), TeamsObserver.SELECTORS.videoButton, 'video');
  }

  _performToggleShare() {
    ObserverUtils.clickButton(this._getDocument(), TeamsObserver.SELECTORS.shareButton, 'share');
  }

  _performToggleRecord() {
    console.log('Recording is not supported via web client');
  }

  _performLeaveCall() {
    ObserverUtils.clickButton(this._getDocument(), TeamsObserver.SELECTORS.leaveButton, 'leave');
  }
}

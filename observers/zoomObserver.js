
class ZoomObserver extends BaseObserver {
  static SELECTORS = {
    iframe: 'iframe.pwa-webclient__iframe',
    leaveButton: 'svg[class^="SvgLeave"]',
    endButton: 'svg[class^="SvgEnd"]',
    audioMuted: 'svg[class^="SvgAudioUnmute"]',
    audioUnmuted: 'svg[class^="SvgAudioMute"]',
    videoOn: 'svg[class^="SvgVideoOn"]',
    videoOff: 'svg[class^="SvgVideoOff"]',
    shareToolbarHidden: 'div.sharer-controlbar-container--hidden',
    shareButton: 'svg[class^="SvgShare"]',
    stopShareButton: 'button.sharer-button--stop',
    recordingIndicator: 'div.recording-indication__recording-container',
    leaveConfirmButton: 'button.leave-meeting-options__btn'
  };

  get platformId() {
    return 'zoom-web';
  }

  get hostnames() {
    return 'app.zoom.us';
  }

  _getDocument() {
    const iframe = document.querySelector(ZoomObserver.SELECTORS.iframe);
    if (!iframe) {
      return null;
    }
    return iframe.contentDocument || iframe.contentWindow.document;
  }

  _detectStatus() {
    const doc = this._getDocument();
    if (!doc) {
      return;
    }

    const { SELECTORS } = ZoomObserver;

    // Detect meeting by leave/end button
    const hasLeave = ObserverUtils.elementExists(doc, SELECTORS.leaveButton);
    const hasEnd = ObserverUtils.elementExists(doc, SELECTORS.endButton);
    this.isInMeeting = hasLeave || hasEnd;

    if (this.isInMeeting) {
      // Detect mute state (SvgAudioUnmute means currently muted, click to unmute)
      if (ObserverUtils.elementExists(doc, SELECTORS.audioMuted)) {
        this.isMuted = true;
      } else if (ObserverUtils.elementExists(doc, SELECTORS.audioUnmuted)) {
        this.isMuted = false;
      }

      // Detect video state
      if (ObserverUtils.elementExists(doc, SELECTORS.videoOn)) {
        this.isVideoStarted = true;
      } else if (ObserverUtils.elementExists(doc, SELECTORS.videoOff)) {
        this.isVideoStarted = false;
      }

      // Detect share state (hidden toolbar means not sharing)
      this.isShareStarted = !ObserverUtils.elementExists(doc, SELECTORS.shareToolbarHidden);

      // Detect recording state
      this.isRecordStarted = ObserverUtils.elementExists(doc, SELECTORS.recordingIndicator);
    }
  }

  _performToggleMute() {
    const doc = this._getDocument();
    if (!doc) return;

    const { SELECTORS } = ZoomObserver;
    ObserverUtils.clickButton(doc, [SELECTORS.audioMuted, SELECTORS.audioUnmuted], 'mute');
  }

  _performToggleVideo() {
    const doc = this._getDocument();
    if (!doc) return;

    const { SELECTORS } = ZoomObserver;
    ObserverUtils.clickButton(doc, [SELECTORS.videoOn, SELECTORS.videoOff], 'video');
  }

  _performToggleShare() {
    const doc = this._getDocument();
    if (!doc) return;

    const { SELECTORS } = ZoomObserver;

    if (this.isShareStarted) {
      ObserverUtils.clickButton(doc, SELECTORS.stopShareButton, 'stop share');
    } else {
      ObserverUtils.clickButton(doc, SELECTORS.shareButton, 'start share');
    }
  }

  _performToggleRecord() {
    console.log('Recording is not supported via web client');
  }

  _performLeaveCall() {
    const doc = this._getDocument();
    if (!doc) return;

    const { SELECTORS } = ZoomObserver;
    ObserverUtils.clickButton(doc, [SELECTORS.leaveButton, SELECTORS.endButton], 'leave');
    setTimeout(() => this._pressLeaveConfirmation(), 250);
  }

  _pressLeaveConfirmation() {
    const doc = this._getDocument();
    if (!doc) return;

    const confirmButton = doc.querySelector(ZoomObserver.SELECTORS.leaveConfirmButton);
    if (confirmButton) {
      console.log('Clicking leave confirmation button');
      confirmButton.click();
    }
  }
}

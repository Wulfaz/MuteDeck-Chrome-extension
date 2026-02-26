
class JitsiObserver extends BaseObserver {
  static SELECTORS = {
    // Button selectors for actions
    muteButton: '[data-testid*="microphone"], [aria-label*="microphone" i], [aria-label*="mute" i], [title*="mute" i]',
    muteButtonAlt: 'button[aria-pressed][aria-label*="audio" i], button[aria-pressed][title*="audio" i]',
    muteButtonFallback: '.toolbox-button-mute, [class*="mute"], [class*="microphone"]',
    videoButton: '[data-testid*="camera"], [aria-label*="camera" i], [aria-label*="video" i], [title*="video" i]',
    videoButtonAlt: 'button[aria-pressed][aria-label*="camera" i], button[aria-pressed][title*="camera" i]',
    videoButtonFallback: '.toolbox-button-camera, [class*="camera"], [class*="video"]',
    shareButtonStop: '[aria-label*="Stop sharing" i][aria-pressed="true"]',
    shareButtonStopAlt: '.toolbox-button[aria-pressed="true"][aria-label*="screen" i]',
    shareButtonStart: '[aria-label*="Share your screen" i]',
    shareButtonStartAlt: '[aria-label*="screen" i]:not([aria-pressed="true"])',
    shareButtonData: '[data-testid*="desktop"], [data-testid*="screen"]',
    shareButtonTitle: '[title*="screen" i]',
    shareIconPath: 'svg path[d*="14.846"]',
    shareButtonFallback: '.toolbox-button-screenshare, [class*="share"], [class*="desktop"]',
    recordButton: 'button[data-testid*="recording"], button[aria-label*="record" i], button[title*="record" i]',
    recordButtonAlt: 'button[aria-pressed][aria-label*="record" i]',
    recordButtonDiv: 'div[role="button"][data-testid*="recording"], div[role="button"][aria-label*="record" i]',
    recordButtonFallback: '.toolbox-button-record, button[class*="record"]',
    moreActionsButton: '[aria-label*="More actions" i]',
    moreActionsButtonAlt: '.toolbox-button-wth-dialog [role="button"]',
    moreActionsButtonFallback: '.context-menu .toolbox-button',
    submenuRecordButton: 'button[aria-label*="Start recording" i], button[aria-label*="recording" i]',
    submenuRecordButtonDiv: 'div[role="button"][aria-label*="Start recording" i], div[role="button"][aria-label*="recording" i]',
    submenuRecordButtonCss: '.css-m5fnqo-contextMenuItem[aria-label*="record" i]',
    submenuRecordButtonClass: '[class*="contextMenuItem"][aria-label*="record" i]',
    leaveButton: '[data-testid*="hangup"], [aria-label*="leave" i], [aria-label*="hang up" i], [title*="leave" i]',
    leaveButtonAlt: 'button[aria-label*="end" i], button[title*="end" i]',
    leaveButtonFallback: '.toolbox-button-hangup, [class*="hangup"], [class*="leave"]',
    // Detection selectors
    prejoin: '[data-testid*="prejoin"]',
    jitsiClass: '[class*="jitsi"]',
    jitsiConference: '#jitsiConference0',
    pressedShareButton: 'button[aria-pressed="true"]',
    toggledShareIcon: '.toolbox-icon.toggled svg path[d*="14.846"]',
    toggledShareButton: '.toolbox-button .toggled svg path[d*="14.846"]'
  };

  get platformId() {
    return 'jitsi';
  }

  get hostnames() {
    return ['meet.jit.si', 'jitsi'];
  }

  get mutationObserverConfig() {
    return {
      childList: true,
      attributes: true,
      attributeFilter: ['class', 'aria-pressed', 'data-testid', 'aria-label'],
      attributeOldValue: true,
      subtree: true
    };
  }

  _initializeState() {
    this._stateMessageListener = null;
    this._storeCheckListener = null;
  }

  _onInitialize() {
    // Start checking for Jitsi Redux store availability
    this._waitForJitsiStore();
  }

  _onCleanup() {
    if (this._stateMessageListener) {
      window.removeEventListener('message', this._stateMessageListener);
      this._stateMessageListener = null;
    }

    if (this._storeCheckListener) {
      window.removeEventListener('message', this._storeCheckListener);
      this._storeCheckListener = null;
    }
  }

  _matchesHostname() {
    // Jitsi has special detection logic
    return this._detectJitsiMeet();
  }

  _detectJitsiMeet() {
    const { SELECTORS } = JitsiObserver;
    return window.location.href.includes('meet.jit.si') ||
      window.location.href.includes('/jitsi/') ||
      window.location.pathname.includes('jitsi') ||
      document.title.toLowerCase().includes('jitsi') ||
      document.querySelector(SELECTORS.prejoin) ||
      document.querySelector(SELECTORS.jitsiClass) ||
      document.querySelector(SELECTORS.jitsiConference) ||
      window.APP || window.JitsiMeetJS;
  }

  _waitForJitsiStore() {
    chrome.runtime.sendMessage({
      action: 'executeInPageContext',
      functionName: 'checkStore'
    });

    const messageListener = (event) => {
      if (event.source !== window || !event.data) return;
      if (event.data.type !== 'JITSI_STORE_AVAILABLE') return;

      if (event.data.available) {
        console.log('Jitsi Redux store found in page context');
        window.removeEventListener('message', messageListener);
      } else {
        setTimeout(() => this._waitForJitsiStore(), 2000);
      }
    };

    if (!this._storeCheckListener) {
      this._storeCheckListener = messageListener;
      window.addEventListener('message', messageListener);
    }
  }

  _detectStatus() {
    // Request state from page context via background script
    this._getJitsiStateFromPage();
  }

  _getJitsiStateFromPage() {
    chrome.runtime.sendMessage({
      action: 'executeInPageContext',
      functionName: 'getState'
    });

    if (!this._stateMessageListener) {
      this._stateMessageListener = (event) => {
        if (event.source !== window || !event.data) return;
        if (event.data.type !== 'JITSI_STATE_UPDATE') return;

        this._handleStateUpdate(event.data.status);
      };
      window.addEventListener('message', this._stateMessageListener);
    }
  }

  _handleStateUpdate(statusFromState) {
    let changed = false;

    if (statusFromState.hasData) {
      if (statusFromState.inCall !== undefined && this.isInMeeting !== statusFromState.inCall) {
        this.isInMeeting = statusFromState.inCall;
        changed = true;
      }

      if (statusFromState.muted !== undefined && this.isMuted !== statusFromState.muted) {
        this.isMuted = statusFromState.muted;
        changed = true;
      }

      if (statusFromState.videoMuted !== undefined && this.isVideoStarted !== !statusFromState.videoMuted) {
        this.isVideoStarted = !statusFromState.videoMuted;
        changed = true;
      }

      if (statusFromState.recording !== undefined && this.isRecordStarted !== statusFromState.recording) {
        this.isRecordStarted = statusFromState.recording;
        changed = true;
      }
    }

    // Detect screen sharing via DOM (Redux doesn't have this info)
    const currentShareStatus = this._detectScreenSharing();
    if (this.isShareStarted !== currentShareStatus) {
      this.isShareStarted = currentShareStatus;
      changed = true;
    }

    if (changed) {
      this._updateLoops = 4; // Force send on next cycle
    }
  }

  _detectScreenSharing() {
    const doc = this._getDocument();
    const { SELECTORS } = JitsiObserver;

    try {
      const pressedShareButton = doc.querySelector(SELECTORS.pressedShareButton);
      if (pressedShareButton) {
        const shareIcon = pressedShareButton.querySelector(SELECTORS.shareIconPath);
        if (shareIcon) {
          return true;
        }
      }

      const toggledShareButton = doc.querySelector(SELECTORS.toggledShareIcon) ||
        doc.querySelector(SELECTORS.toggledShareButton);

      return !!toggledShareButton;
    } catch (e) {
      console.log('Could not detect screen sharing status:', e);
      return false;
    }
  }

  _performToggleMute() {
    chrome.runtime.sendMessage({
      action: 'executeInPageContext',
      functionName: 'toggleMute'
    });

    const resultListener = (event) => {
      if (event.source !== window || event.data.type !== 'JITSI_ACTION_RESULT' || event.data.action !== 'mute') return;

      if (!event.data.success) {
        const doc = this._getDocument();
        const { SELECTORS } = JitsiObserver;
        const muteButton = doc.querySelector(SELECTORS.muteButton) ||
          doc.querySelector(SELECTORS.muteButtonAlt) ||
          doc.querySelector(SELECTORS.muteButtonFallback);

        if (muteButton) {
          console.log('Clicking Jitsi mute button');
          muteButton.click();
        } else {
          console.log('Unable to find Jitsi mute button');
        }
      }

      window.removeEventListener('message', resultListener);
    };

    window.addEventListener('message', resultListener);
  }

  _performToggleVideo() {
    chrome.runtime.sendMessage({
      action: 'executeInPageContext',
      functionName: 'toggleVideo'
    });

    const resultListener = (event) => {
      if (event.source !== window || event.data.type !== 'JITSI_ACTION_RESULT' || event.data.action !== 'video') return;

      if (!event.data.success) {
        const doc = this._getDocument();
        const { SELECTORS } = JitsiObserver;
        const videoButton = doc.querySelector(SELECTORS.videoButton) ||
          doc.querySelector(SELECTORS.videoButtonAlt) ||
          doc.querySelector(SELECTORS.videoButtonFallback);

        if (videoButton) {
          console.log('Clicking Jitsi video button');
          videoButton.click();
        } else {
          console.log('Unable to find Jitsi video button');
        }
      }

      window.removeEventListener('message', resultListener);
    };

    window.addEventListener('message', resultListener);
  }

  _performToggleShare() {
    const doc = this._getDocument();
    const { SELECTORS } = JitsiObserver;

    try {
      const shareButton =
        doc.querySelector(SELECTORS.shareButtonStop) ||
        doc.querySelector(SELECTORS.shareButtonStopAlt) ||
        doc.querySelector(SELECTORS.shareButtonStart) ||
        doc.querySelector(SELECTORS.shareButtonStartAlt) ||
        doc.querySelector(SELECTORS.shareButtonData) ||
        doc.querySelector(SELECTORS.shareButtonTitle) ||
        doc.querySelector(SELECTORS.shareIconPath)?.closest('button') ||
        doc.querySelector(SELECTORS.shareIconPath)?.closest('.toolbox-button') ||
        doc.querySelector(SELECTORS.shareButtonFallback);

      if (shareButton) {
        console.log('Clicking screen share button:', shareButton.getAttribute('aria-label'));
        shareButton.click();
      } else {
        console.log('Unable to find screen share button');
      }
    } catch (e) {
      console.log('Failed to toggle screen share:', e);
    }
  }

  _performToggleRecord() {
    const doc = this._getDocument();
    const { SELECTORS } = JitsiObserver;

    // Try direct record button first
    let recordButton = doc.querySelector(SELECTORS.recordButton) ||
      doc.querySelector(SELECTORS.recordButtonAlt) ||
      doc.querySelector(SELECTORS.recordButtonDiv) ||
      doc.querySelector(SELECTORS.recordButtonFallback);

    if (recordButton) {
      console.log('Clicking direct Jitsi record button');
      recordButton.click();
      return;
    }

    // Try submenu approach
    console.log('Direct record button not found, trying submenu approach');

    const moreActionsButton = doc.querySelector(SELECTORS.moreActionsButton) ||
      doc.querySelector(SELECTORS.moreActionsButtonAlt) ||
      doc.querySelector(SELECTORS.moreActionsButtonFallback);

    if (moreActionsButton) {
      console.log('Clicking More actions button');
      moreActionsButton.click();

      setTimeout(() => {
        const submenuRecordButton = doc.querySelector(SELECTORS.submenuRecordButton) ||
          doc.querySelector(SELECTORS.submenuRecordButtonDiv) ||
          doc.querySelector(SELECTORS.submenuRecordButtonCss) ||
          doc.querySelector(SELECTORS.submenuRecordButtonClass);

        if (submenuRecordButton) {
          console.log('Clicking submenu record button');
          submenuRecordButton.click();
        } else {
          console.log('Unable to find record button in submenu');
        }
      }, 100);
    } else {
      console.log('Unable to find More actions button or record button');
    }
  }

  _performLeaveCall() {
    chrome.runtime.sendMessage({
      action: 'executeInPageContext',
      functionName: 'leaveCall'
    });

    const resultListener = (event) => {
      if (event.source !== window || event.data.type !== 'JITSI_ACTION_RESULT' || event.data.action !== 'leave') return;

      if (!event.data.success) {
        const doc = this._getDocument();
        const { SELECTORS } = JitsiObserver;
        const leaveButton = doc.querySelector(SELECTORS.leaveButton) ||
          doc.querySelector(SELECTORS.leaveButtonAlt) ||
          doc.querySelector(SELECTORS.leaveButtonFallback);

        if (leaveButton) {
          console.log('Clicking Jitsi leave button');
          leaveButton.click();
        } else {
          console.log('Unable to find Jitsi leave button');
        }
      }

      window.removeEventListener('message', resultListener);
    };

    window.addEventListener('message', resultListener);
  }

  // Override to skip throttling - Jitsi uses async state updates
  _updateStatusWrapper = () => {
    this._detectStatus();

    if (this._updateLoops >= this.throttleCount) {
      this.sendStatus();
      this._updateLoops = 0;
    } else {
      this._updateLoops++;
    }
  };
}

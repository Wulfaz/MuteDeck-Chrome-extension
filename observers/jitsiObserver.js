class JitsiObserver {
  constructor() {
    this._timer = null;
    this._observer = null;
    this._updateLoops = 0;

    this.isInMeeting = false;
    this.isMuted = false;
    this.isVideoStarted = false;
    this.isShareStarted = false;
    this.isRecordStarted = false;
  }

  initialize = () => {
    // Detect if this is a Jitsi Meet page using multiple methods
    if (!this._detectJitsiMeet()) {
      console.log('Not on Jitsi Meet page, not initializing JitsiObserver');
      return;
    }

    console.log('Initializing JitsiObserver');

    this._observer = new MutationObserver(this._handleElementChange);
    this._observer.observe(document.body, {
      childList: true,
      attributes: true,
      attributeFilter: ["class", "aria-pressed", "data-testid", "aria-label"],
      attributeOldValue: true,
      subtree: true,
    });

    // Start checking for Jitsi Redux store availability
    this._waitForJitsiStore();

    this._timer = setInterval(this.updateJitsiStatus, 1000);
  };

  _waitForJitsiStore = () => {
    // Use chrome.scripting to execute code in page context (bypasses CSP)
    chrome.runtime.sendMessage({
      action: "executeInPageContext",
      functionName: "checkStore"
    });

    // Listen for the response
    const messageListener = (event) => {
      // console.log('Jitsi store check event:', event);
      if (event.source !== window || !event.data) return
      if (event.data.type !== 'JITSI_STORE_AVAILABLE') return;

      if (event.data.available) {
        console.log('Jitsi Redux store found in page context');
        window.removeEventListener('message', messageListener);
      } else {
        // console.log('Still waiting for Jitsi Redux store...');
        // Try again in 2 seconds
        setTimeout(() => this._waitForJitsiStore(), 2000);
      }
    };

    if (!this._storeCheckListener) {
      this._storeCheckListener = messageListener;
      window.addEventListener('message', messageListener);
    }
  };

  _detectJitsiMeet = () => {
    // Check if this is a Jitsi Meet page
    return window.location.href.includes('meet.jit.si') ||
      window.location.href.includes('/jitsi/') ||
      window.location.pathname.includes('jitsi') ||
      document.title.toLowerCase().includes('jitsi') ||
      document.querySelector('[data-testid*="prejoin"]') ||
      document.querySelector('[class*="jitsi"]') ||
      document.querySelector('#jitsiConference0') ||
      window.APP || window.JitsiMeetJS;
  };

  _handleElementChange = (mutationsList) => {
    this.updateJitsiStatus();
  };

  updateJitsiStatus = () => {
    // Use script injection to access Jitsi's Redux state in page context
    this._getJitsiStateFromPage();

    // Send meeting status if it has been updated, or if it's been 3 seconds since the last update
    if (this._updateLoops >= 3) {
      this.sendJitsiStatus();
      this._updateLoops = 0;
    } else {
      this._updateLoops++;
    }
  };

  _getJitsiStateFromPage = () => {
    // Use chrome.scripting to execute code in page context (bypasses CSP)
    chrome.runtime.sendMessage({
      action: "executeInPageContext",
      functionName: "getState"
    });

    // Set up listener for the response (if not already set)
    if (!this._stateMessageListener) {
      this._stateMessageListener = (event) => {
        // console.log('Jitsi state update event:', event);
        if (event.source !== window || !event.data) return
        if (event.data.type !== 'JITSI_STATE_UPDATE') return;

        this._handleStateUpdate(event.data.status);
      };
      window.addEventListener('message', this._stateMessageListener);
    }
  }; _handleStateUpdate = (statusFromState) => {
    let changed = false;

    if (statusFromState.hasData) {
      // Update meeting status
      if (statusFromState.inCall !== undefined && this.isInMeeting !== statusFromState.inCall) {
        this.isInMeeting = statusFromState.inCall;
        changed = true;
      }

      // Update mute status
      if (statusFromState.muted !== undefined && this.isMuted !== statusFromState.muted) {
        this.isMuted = statusFromState.muted;
        changed = true;
      }

      // Update video status (note: videoMuted from state, but we track isVideoStarted)
      if (statusFromState.videoMuted !== undefined && this.isVideoStarted !== !statusFromState.videoMuted) {
        this.isVideoStarted = !statusFromState.videoMuted;
        changed = true;
      }

      // Update recording status
      if (statusFromState.recording !== undefined && this.isRecordStarted !== statusFromState.recording) {
        this.isRecordStarted = statusFromState.recording;
        changed = true;
      }
    }

    // Update screen sharing status via DOM detection (since Redux doesn't have this info)
    const currentShareStatus = this._detectScreenSharing();
    if (this.isShareStarted !== currentShareStatus) {
      this.isShareStarted = currentShareStatus;
      changed = true;
    }

    // Trigger update if something changed
    if (changed) {
      this._updateLoops = 4; // Force send on next cycle
    }
  };

  _detectScreenSharing = () => {
    try {
      // Look for share button with aria-pressed="true" (language independent)
      // The share icon has a unique SVG path that starts with "14.846"
      const pressedShareButton = document.querySelector('button[aria-pressed="true"]');
      if (pressedShareButton) {
        const shareIcon = pressedShareButton.querySelector('svg path[d*="14.846"]');
        if (shareIcon) {
          return true;
        }
      }

      // Alternative: look for toolbox button with "toggled" class and share icon
      const toggledShareButton = document.querySelector('.toolbox-icon.toggled svg path[d*="14.846"]') ||
        document.querySelector('.toolbox-button .toggled svg path[d*="14.846"]');

      return !!toggledShareButton;
    } catch (e) {
      console.log('Could not detect screen sharing status:', e);
      return false;
    }
  };

  toggleMute = () => {
    // Use chrome.scripting to execute code in page context (bypasses CSP)
    chrome.runtime.sendMessage({
      action: "executeInPageContext",
      functionName: "toggleMute"
    });

    // Listen for result and fallback to button click if needed
    const resultListener = (event) => {
      if (event.source !== window || event.data.type !== 'JITSI_ACTION_RESULT' || event.data.action !== 'mute') return;

      if (!event.data.success) {
        // API failed, try button click
        const muteButton = document.querySelector('[data-testid*="microphone"], [aria-label*="microphone" i], [aria-label*="mute" i], [title*="mute" i]') ||
          document.querySelector('button[aria-pressed][aria-label*="audio" i], button[aria-pressed][title*="audio" i]') ||
          document.querySelector('.toolbox-button-mute, [class*="mute"], [class*="microphone"]');

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
  };

  toggleVideo = () => {
    // Use chrome.scripting to execute code in page context (bypasses CSP)
    chrome.runtime.sendMessage({
      action: "executeInPageContext",
      functionName: "toggleVideo"
    });

    // Listen for result and fallback to button click if needed
    const resultListener = (event) => {
      if (event.source !== window || event.data.type !== 'JITSI_ACTION_RESULT' || event.data.action !== 'video') return;

      if (!event.data.success) {
        // API failed, try button click
        const videoButton = document.querySelector('[data-testid*="camera"], [aria-label*="camera" i], [aria-label*="video" i], [title*="video" i]') ||
          document.querySelector('button[aria-pressed][aria-label*="camera" i], button[aria-pressed][title*="camera" i]') ||
          document.querySelector('.toolbox-button-camera, [class*="camera"], [class*="video"]');

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
  };

  toggleShare = () => {
    try {
      // Look for screen share button - both start and stop sharing buttons
      // The share icon has unique SVG path that starts with "14.846"
      const shareButton =
        // Stop sharing button (aria-pressed="true", "Stop sharing your screen")
        document.querySelector('[aria-label*="Stop sharing" i][aria-pressed="true"]') ||
        document.querySelector('.toolbox-button[aria-pressed="true"][aria-label*="screen" i]') ||
        // Start sharing button (various patterns)
        document.querySelector('[aria-label*="Share your screen" i]') ||
        document.querySelector('[aria-label*="screen" i]:not([aria-pressed="true"])') ||
        document.querySelector('[data-testid*="desktop"], [data-testid*="screen"]') ||
        document.querySelector('[title*="screen" i]') ||
        // Generic selectors with unique SVG path
        document.querySelector('button svg path[d*="14.846"]')?.closest('button') ||
        document.querySelector('.toolbox-button svg path[d*="14.846"]')?.closest('.toolbox-button') ||
        // Class-based fallbacks
        document.querySelector('.toolbox-button-screenshare, [class*="share"], [class*="desktop"]');

      if (shareButton) {
        console.log('Clicking screen share button:', shareButton.getAttribute('aria-label'));
        shareButton.click();
        return;
      } else {
        console.log('Unable to find screen share button');
      }
    } catch (e) {
      console.log('Failed to toggle screen share:', e);
    }
  };

  toggleRecord = () => {
    // For recording, we need to handle the submenu approach
    // First try to find a direct record button - be specific about interactive elements
    let recordButton = document.querySelector('button[data-testid*="recording"], button[aria-label*="record" i], button[title*="record" i]') ||
      document.querySelector('button[aria-pressed][aria-label*="record" i]') ||
      document.querySelector('div[role="button"][data-testid*="recording"], div[role="button"][aria-label*="record" i]') ||
      document.querySelector('.toolbox-button-record, button[class*="record"]');

    if (recordButton) {
      console.log('Clicking direct Jitsi record button');
      recordButton.click();
      return;
    }

    // If no direct button found, try the submenu approach
    console.log('Direct record button not found, trying submenu approach');

    // First, find and click the "More actions" button
    const moreActionsButton = document.querySelector('[aria-label*="More actions" i]') ||
      document.querySelector('.toolbox-button-wth-dialog [role="button"]') ||
      document.querySelector('.context-menu .toolbox-button');

    if (moreActionsButton) {
      console.log('Clicking More actions button');
      moreActionsButton.click();

      // Wait a moment for the menu to appear, then look for the record button
      setTimeout(() => {
        const submenuRecordButton = document.querySelector('button[aria-label*="Start recording" i], button[aria-label*="recording" i]') ||
          document.querySelector('div[role="button"][aria-label*="Start recording" i], div[role="button"][aria-label*="recording" i]') ||
          document.querySelector('.css-m5fnqo-contextMenuItem[aria-label*="record" i]') ||
          document.querySelector('[class*="contextMenuItem"][aria-label*="record" i]');

        if (submenuRecordButton) {
          console.log('Clicking submenu record button');
          submenuRecordButton.click();
        } else {
          console.log('Unable to find record button in submenu');
        }
      }, 100); // Small delay to allow menu to appear
    } else {
      console.log('Unable to find More actions button or record button');
    }
  };

  leaveCall = () => {
    // Use chrome.scripting to execute code in page context (bypasses CSP)
    chrome.runtime.sendMessage({
      action: "executeInPageContext",
      functionName: "leaveCall"
    });

    // Listen for result and fallback to button click if needed
    const resultListener = (event) => {
      if (event.source !== window || event.data.type !== 'JITSI_ACTION_RESULT' || event.data.action !== 'leave') return;

      if (!event.data.success) {
        // API failed, try button click
        const leaveButton = document.querySelector('[data-testid*="hangup"], [aria-label*="leave" i], [aria-label*="hang up" i], [title*="leave" i]') ||
          document.querySelector('button[aria-label*="end" i], button[title*="end" i]') ||
          document.querySelector('.toolbox-button-hangup, [class*="hangup"], [class*="leave"]');

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
  };

  sendJitsiStatus = () => {
    if (!this.isInMeeting) {
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
      'control': 'jitsi',
    };

    //console.log('Jitsi status:', message);
    chrome.runtime.sendMessage({ action: "updateMuteDeckStatus", message: message });
  };

  // Cleanup method
  cleanup = () => {
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }

    if (this._observer) {
      this._observer.disconnect();
      this._observer = null;
    }

    if (this._stateMessageListener) {
      window.removeEventListener('message', this._stateMessageListener);
      this._stateMessageListener = null;
    }

    if (this._storeCheckListener) {
      window.removeEventListener('message', this._storeCheckListener);
      this._storeCheckListener = null;
    }
  };
}

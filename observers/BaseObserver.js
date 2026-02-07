/**
 * Base class for all meeting platform observers
 * Provides shared state management, initialization, and status reporting
 */
class BaseObserver {
  constructor() {
    this._timer = null;
    this._observer = null;
    this._updateLoops = 0;

    // Core meeting state
    this.isInMeeting = false;
    this.isMuted = false;
    this.isVideoStarted = false;
    this.isShareStarted = false;
    this.isRecordStarted = false;

    // Allow subclasses to add custom state
    this._initializeState();
  }

  // ============================================
  // Configuration getters - subclasses override
  // ============================================

  /** Platform identifier (e.g., 'google-meet', 'zoom-web') */
  get platformId() {
    throw new Error('Subclass must implement platformId getter');
  }

  /** Message source identifier for status messages */
  get messageSource() {
    return 'browser-extension-plugin';
  }

  /** Hostname(s) to match for this platform */
  get hostnames() {
    throw new Error('Subclass must implement hostnames getter');
  }

  /** MutationObserver configuration */
  get mutationObserverConfig() {
    return {
      childList: false,
      attributes: true,
      attributeFilter: ['class'],
      attributeOldValue: true,
      subtree: true
    };
  }

  /** Timer interval in milliseconds */
  get updateInterval() {
    return 1000;
  }

  /** Number of update loops before forced send */
  get throttleCount() {
    return 3;
  }

  // ============================================
  // Shared methods
  // ============================================

  /**
   * Initialize the observer - sets up MutationObserver and timer
   */
  initialize = () => {
    if (!this._matchesHostname()) {
      console.log(`Not on ${this.platformId} page, not initializing`);
      return;
    }

    console.log(`Initializing ${this.constructor.name}`);

    this._observer = new MutationObserver(this._handleElementChange);
    this._observer.observe(document.body, this.mutationObserverConfig);

    this._timer = setInterval(this._updateStatusWrapper, this.updateInterval);

    // Allow subclasses to perform additional initialization
    this._onInitialize();
  };

  /**
   * Handle DOM mutations - triggers status update
   */
  _handleElementChange = (mutationsList) => {
    this._updateStatusWrapper();
  };

  /**
   * Internal wrapper for updateStatus with throttling
   */
  _updateStatusWrapper = () => {
    const previousState = this._captureState();

    // Detect current status (subclass implements)
    this._detectStatus();

    const changed = this._hasStateChanged(previousState);

    // Send status if changed or throttle count reached
    if (changed || this._updateLoops >= this.throttleCount) {
      // Force send when leaving a meeting
      const force = changed && !this.isInMeeting;
      this.sendStatus(force);
      this._updateLoops = 0;
    } else {
      this._updateLoops++;
    }
  };

  /**
   * Capture current state for change detection
   */
  _captureState() {
    const state = {
      isInMeeting: this.isInMeeting,
      isMuted: this.isMuted,
      isVideoStarted: this.isVideoStarted,
      isShareStarted: this.isShareStarted,
      isRecordStarted: this.isRecordStarted
    };

    // Allow subclasses to add custom state
    return { ...state, ...this._captureCustomState() };
  }

  /**
   * Check if state has changed
   */
  _hasStateChanged(previousState) {
    const coreChanged =
      previousState.isInMeeting !== this.isInMeeting ||
      previousState.isMuted !== this.isMuted ||
      previousState.isVideoStarted !== this.isVideoStarted ||
      previousState.isShareStarted !== this.isShareStarted ||
      previousState.isRecordStarted !== this.isRecordStarted;

    return coreChanged || this._hasCustomStateChanged(previousState);
  }

  /**
   * Send status message to background script
   * @param {boolean} force - Force send even when not in meeting
   */
  sendStatus = (force = false) => {
    if (!force && !this._shouldSendStatus()) {
      return;
    }

    const message = {
      source: this.messageSource,
      action: 'update-status',
      status: this.isInMeeting ? 'call' : 'closed',
      mute: this.isMuted ? 'muted' : 'unmuted',
      video: this.isVideoStarted ? 'started' : 'stopped',
      share: this.isShareStarted ? 'started' : 'stopped',
      record: this.isRecordStarted ? 'started' : 'stopped',
      control: this.platformId
    };

    chrome.runtime.sendMessage({ action: 'updateMuteDeckStatus', message });
  };

  /**
   * Toggle mute with action blocking check
   */
  toggleMute = () => {
    if (this._areActionsBlocked()) {
      console.log(`Actions blocked for ${this.platformId}`);
      return;
    }
    this._performToggleMute();
  };

  /**
   * Toggle video with action blocking check
   */
  toggleVideo = () => {
    if (this._areActionsBlocked()) {
      console.log(`Actions blocked for ${this.platformId}`);
      return;
    }
    this._performToggleVideo();
  };

  /**
   * Toggle screen share with action blocking check
   */
  toggleShare = () => {
    if (this._areActionsBlocked()) {
      console.log(`Actions blocked for ${this.platformId}`);
      return;
    }
    this._performToggleShare();
  };

  /**
   * Toggle recording with action blocking check
   */
  toggleRecord = () => {
    if (this._areActionsBlocked()) {
      console.log(`Actions blocked for ${this.platformId}`);
      return;
    }
    this._performToggleRecord();
  };

  /**
   * Leave the call (not subject to action blocking)
   */
  leaveCall = () => {
    this._performLeaveCall();
  };

  /**
   * Cleanup resources
   */
  cleanup = () => {
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }

    if (this._observer) {
      this._observer.disconnect();
      this._observer = null;
    }

    // Allow subclasses to perform additional cleanup
    this._onCleanup();
  };

  // ============================================
  // Extension hooks - subclasses can override
  // ============================================

  /** Initialize custom state properties */
  _initializeState() {
    // Override in subclass if needed
  }

  /** Called after base initialization completes */
  _onInitialize() {
    // Override in subclass if needed
  }

  /** Called during cleanup */
  _onCleanup() {
    // Override in subclass if needed
  }

  /** Capture custom state for change detection */
  _captureCustomState() {
    return {};
  }

  /** Check if custom state has changed */
  _hasCustomStateChanged(previousState) {
    return false;
  }

  /** Check if actions should be blocked (e.g., companion mode) */
  _areActionsBlocked() {
    return false;
  }

  /** Check if status should be sent (e.g., not in special modes) */
  _shouldSendStatus() {
    return this.isInMeeting;
  }

  /** Get the document to search for elements (override for iframes) */
  _getDocument() {
    return document;
  }

  // ============================================
  // Abstract methods - subclasses must implement
  // ============================================

  /** Detect current meeting status from DOM */
  _detectStatus() {
    throw new Error('Subclass must implement _detectStatus()');
  }

  /** Perform mute toggle action */
  _performToggleMute() {
    throw new Error('Subclass must implement _performToggleMute()');
  }

  /** Perform video toggle action */
  _performToggleVideo() {
    throw new Error('Subclass must implement _performToggleVideo()');
  }

  /** Perform share toggle action */
  _performToggleShare() {
    throw new Error('Subclass must implement _performToggleShare()');
  }

  /** Perform record toggle action */
  _performToggleRecord() {
    console.log('Recording is not supported for this platform');
  }

  /** Perform leave call action */
  _performLeaveCall() {
    throw new Error('Subclass must implement _performLeaveCall()');
  }

  // ============================================
  // Helper methods
  // ============================================

  /**
   * Check if current hostname matches this platform
   */
  _matchesHostname() {
    const hostname = window.location.hostname;
    const hostnames = Array.isArray(this.hostnames) ? this.hostnames : [this.hostnames];

    return hostnames.some(h => {
      if (h.startsWith('.')) {
        // Suffix match (e.g., '.riverside.fm')
        return hostname.endsWith(h) || hostname === h.slice(1);
      } else if (h.includes('*')) {
        // Wildcard match
        const pattern = new RegExp('^' + h.replace(/\*/g, '.*') + '$');
        return pattern.test(hostname);
      } else {
        // Exact or includes match
        return hostname === h || hostname.includes(h);
      }
    });
  }

  /**
   * Update state with change tracking
   * @param {string} property - Property name to update
   * @param {any} newValue - New value
   * @returns {boolean} - True if value changed
   */
  _updateState(property, newValue) {
    if (this[property] !== newValue) {
      this[property] = newValue;
      return true;
    }
    return false;
  }
}

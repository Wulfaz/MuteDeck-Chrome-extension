
class ZoomObserver {
  constructor(mutedeckConnection) {
    this._mutedeckConnection = mutedeckConnection;
    this._timer = null;
    this._observer = null;
    this._updateLoops = 0;

    this.isInMeeting = false;
    this.isMuted = false;
    this.isVideoStarted = false;
    this.isShareStarted = false;
    this.isRecordStarted = false;
  };

  initialize = () => {
    // detect whether app.zoom.us is the hostname of the page, otherwise do not initialize
    if (window.location.hostname !== 'app.zoom.us') {
      console.log('Not on Zoom page, not initializing ZoomObserver');
      return;
    }

    console.log('Initializing ZoomObserver');
    this._observer = new MutationObserver(this._handleElementChange);
    this._observer.observe(document.body, {
      childList: false,
      attributes: true,
      attributeFilter: ["class"],
      attributeOldValue: true,
      subtree: true,
    });

    this._timer = setInterval(this.updateZoomStatus, 1000);
  };

  _handleElementChange = (mutationsList) => {
    this.updateZoomStatus();
  };

  _getZoomCallFrame = () => {
    // Get the iframe element
    let iframeElement = document.querySelector('iframe.pwa-webclient__iframe');

    if (!iframeElement) {
      return null;
    }

    let iframeDocument = iframeElement.contentDocument || iframeElement.contentWindow.document;
    return iframeDocument;
  };

  updateZoomStatus = () => {
    let changed = false;

    // Get the iframe element
    let iframeDocument = this._getZoomCallFrame();
    if (!iframeDocument) {
      return;
    }

    // use the leave button to see if we're in a meeting
    let svgLeave = iframeDocument.querySelector('svg[class^="SvgLeave"]');
    if (svgLeave) {
      if (!this.isInMeeting) {
        changed = true;
      }
      this.isInMeeting = true;
    }
    else {
      // try the end button
      let svgEnd = iframeDocument.querySelector('svg[class^="SvgEnd"]');
      if (svgEnd) {
        if (!this.isInMeeting) {
          changed = true;
        }
        this.isInMeeting = true;
      }
    }

    if (this.isInMeeting) {

      // find the button that contains the svg with a class called SvgAudioUnmute or SvgAudioUnmuteHovered
      let svgMuted = iframeDocument.querySelector('svg[class^="SvgAudioUnmute"]');
      if (svgMuted) {
        if (!this.isMuted) {
          changed = true;
        }
        this.isMuted = true;
      }

      // find the button that contains the svg with a class called SvgAudioMute or SvgAudioMuteHovered
      let svgUnmute = iframeDocument.querySelector('svg[class^="SvgAudioMute"]');
      if (svgUnmute) {
        if (this.isMuted) {
          changed = true;
        }
        this.isMuted = false;
      }

      // find the button that contains the svg with a class called SvgVideoOn or SvgVideoOnHovered
      let svgVideoOn = iframeDocument.querySelector('svg[class^="SvgVideoOn"]');
      if (svgVideoOn) {
        if (!this.isVideoStarted) {
          changed = true;
        }
        this.isVideoStarted = true;
      }

      // find the button that contains the svg with a class called SvgVideoOff or SvgVideoOffHovered
      let svgVideoOff = iframeDocument.querySelector('svg[class^="SvgVideoOff"]');
      if (svgVideoOff) {
        if (this.isVideoStarted) {
          changed = true;
        }
        this.isVideoStarted = false;
      }

      // first try to find the stop share button, if that doesn't exist, we're not sharing
      //let stopShare = iframeDocument.querySelector('button.sharer-button--stop');
      let shareToolbarHidden = iframeDocument.querySelector('div.sharer-controlbar-container--hidden');
      if (shareToolbarHidden) {
        if (this.isShareStarted) {
          changed = true;
        }
        this.isShareStarted = false;
      }
      else {
        if (!this.isShareStarted) {
          changed = true;
        }
        this.isShareStarted = true;
      }

      // first try to find the recording info button, if that doesn't exist, we're not recording
      let areRecording = iframeDocument.querySelector('div.recording-indication__recording-container');
      if (areRecording) {
        if (!this.isRecordStarted) {
          changed = true;
        }
        this.isRecordStarted = true;
      }
      else {
        if (this.isRecordStarted) {
          changed = true;
        }
        this.isRecordStarted = false;
      }
    } // end if this.isInMeeting

    // send meeting status if it has been updated, or if it's been 1 second (250ms * 4) since the last update
    if (changed || this._updateLoops >= 3) {
      // force sendZoomStatus when leaving a meeting
      this.sendZoomStatus(changed && !this.isInMeeting); // 'was in meeting but no more' -> force send
      this._updateLoops = 0;
    } else {
      this._updateLoops++;
    }
  }

  /**
   * Actions
   */

  toggleMute = () => {
    this._clickButton('svg[class^="SvgAudioUnmute"]', 'svg[class^="SvgAudioMute"]', 'mute');
  }

  toggleVideo = () => {
    this._clickButton('svg[class^="SvgVideoOn"]', 'svg[class^="SvgVideoOff"]', 'video');
  }

  toggleShare = () => {
    if (this.isShareStarted) {
      this._clickButton('button.sharer-button--stop', 'button.sharer-button--stop', 'stop share');
    }
    else {
      this._clickButton('svg[class^="SvgShare"]', 'svg[class^="SvgShare"]', 'start share');
    }
  };

  toggleRecord = () => {
    console.log('Recording is not supported via web client');
  };

  leaveCall = () => {
    this._clickButton('svg[class^="SvgLeave"]', 'svg[class^="SvgEnd"]', 'leave');
    setTimeout(this._pressPossibleConfirmationButton, 250);
  }

  _pressPossibleConfirmationButton = () => {
    // Get the iframe element
    let iframeDocument = this._getZoomCallFrame();
    if (!iframeDocument) {
      return;
    }

    let confirmationButton = iframeDocument.querySelector('button.leave-meeting-options__btn');
    if (confirmationButton) {
      console.log('Clicking confirmation button');
      confirmationButton.click();
    }
  }

  _clickButton = (primary, secondary, label) => {
    // Get the iframe element
    let iframeDocument = this._getZoomCallFrame();
    if (!iframeDocument) {
      return;
    }

    let primaryElement = iframeDocument.querySelector(primary);
    if (primaryElement) {
      let button = primaryElement.closest('button');
      console.log(`Clicking ${label} button`);
      button.click();
    }
    else {
      let secondaryElement = iframeDocument.querySelector(secondary);
      if (secondaryElement) {
        let button = secondaryElement.closest('button');
        console.log(`Clicking ${label} button`);
        button.click();
      }
      else {
        console.log(`Unable to find ${label} button`);
      }
    }
  }

  // use param force to force send the status (after leaving a meeting for example)
  sendZoomStatus = (force = false) => {
    if (!force && !this.isInMeeting) {
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
      'control': 'zoom-web',
    };
    //console.log(message);
    // Send a message to the background script to send data over the WebSocket
    chrome.runtime.sendMessage({ action: "updateMuteDeckStatus", message: message });
  }
}
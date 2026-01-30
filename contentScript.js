"use strict";

var mutedeckConnectionStatus = {
  connectionError: "",
  isMuteDeckConnected: false,
  connectionParameters: {},
};
const googleMeetObserver = new GoogleMeetObserver();
const zoomObserver = new ZoomObserver();
const teamsObserver = new TeamsObserver();
const streamyardObserver = new StreamyardObserver();
const riversideObserver = new RiversideObserver();
const jitsiObserver = new JitsiObserver();
const OBSERVERS = [googleMeetObserver, zoomObserver, teamsObserver, streamyardObserver, riversideObserver, jitsiObserver];

const getKeyCode = (key) => {
  const k = key.toLowerCase();
  // Handle special keys
  const specialKeys = {
    'enter': 'Enter',
    'tab': 'Tab',
    'space': 'Space',
    'backspace': 'Backspace',
    'delete': 'Delete',
    'escape': 'Escape',
    'arrowup': 'ArrowUp',
    'arrowdown': 'ArrowDown',
    'arrowleft': 'ArrowLeft',
    'arrowright': 'ArrowRight'
  };

  if (specialKeys[k]) {
    return specialKeys[k];
  }

  // Handle regular keys
  return k.length === 1 ? `Key${k.toUpperCase()}` : k;
};

function sendCustomAction(keyCombinationString) {
  console.log("Contentscript: Request for custom action: ", keyCombinationString);
  const keys = keyCombinationString.split("+");
  const key = keys.pop();

  const code = getKeyCode(key);

  const modifiers = keys.map(key => {
    switch (key.toLowerCase()) {
      case "ctrl":
        return "ctrlKey";
      case "alt":
        return "altKey";
      case "shift":
        return "shiftKey";
      case "meta":
      case "cmd":
      case "win":
        return navigator.platform.includes('Mac') ? "metaKey" : "ctrlKey";
      default:
        return null;
    }
  }).filter(modifier => modifier !== null);

  const options = {
    ctrlKey: false,
    altKey: false,
    shiftKey: false,
    metaKey: false,
    key: key.toLowerCase(),
    code: code,
    bubbles: true,
    cancelable: true,
    isTrusted: true
  };

  modifiers.forEach(modifier => {
    options[modifier] = true;
  });

  const keyEvent = new KeyboardEvent("keydown", options);
  document.dispatchEvent(keyEvent);
  const keyUpEvent = new KeyboardEvent("keyup", options);
  document.dispatchEvent(keyUpEvent);
}

function toggleMute() {
  OBSERVERS.forEach(observer => {
    if (observer.isInMeeting) {
      observer.toggleMute();
    }
  });
}

function toggleVideo() {
  OBSERVERS.forEach(observer => {
    if (observer.isInMeeting) {
      observer.toggleVideo();
    }
  });
}

function toggleShare() {
  OBSERVERS.forEach(observer => {
    if (observer.isInMeeting) {
      observer.toggleShare();
    }
  });
}

function toggleRecord() {
  OBSERVERS.forEach(observer => {
    if (observer.isInMeeting) {
      observer.toggleRecord();
    }
  });
}

function leaveCall() {
  OBSERVERS.forEach(observer => {
    if (observer.isInMeeting) {
      observer.leaveCall();
    }
  });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Received message from background script: ');
  console.log(message);
  if (message.action === 'ping') {
    // Respond to ping to indicate content scripts are loaded
    sendResponse(true);
    return true;
  }
  else if (message.action === 'getMuteDeckStatus') {
    let isInMeeting = OBSERVERS.some(observer => observer.isInMeeting);
    let isMuted = OBSERVERS.some(observer => observer.isMuted);
    let isVideoStarted = OBSERVERS.some(observer => observer.isVideoStarted);
    let isShareStarted = OBSERVERS.some(observer => observer.isShareStarted);
    let isRecordStarted = OBSERVERS.some(observer => observer.isRecordStarted);
    let isGoogleMeetCall = googleMeetObserver.isInMeeting;
    let isZoomCall = zoomObserver.isInMeeting;
    let isTeamsCall = teamsObserver.isInMeeting;
    let isStreamyardCall = streamyardObserver.isInMeeting;
    let isRiversideCall = riversideObserver.isInMeeting;
    let isJitsiCall = jitsiObserver.isInMeeting;

    let response = {
      connection: '',
      connected: mutedeckConnectionStatus.isMuteDeckConnected,
      connectionParameters: mutedeckConnectionStatus.connectionParameters,
      isInMeeting: isInMeeting,
      isMuted: isMuted,
      isVideoStarted: isVideoStarted,
      isShareStarted: isShareStarted,
      isRecordStarted: isRecordStarted,
      isGoogleMeetCall: isGoogleMeetCall,
      isZoomCall: isZoomCall,
      isTeamsCall: isTeamsCall,
      isStreamyardCall: isStreamyardCall,
      isRiversideCall: isRiversideCall,
      isJitsiCall: isJitsiCall,
    };
    if (mutedeckConnectionStatus.isMuteDeckConnected) {
      response.connection = '✅ Connected to MuteDeck';
    } else {
      response.connection = '⚠️ Not connected to MuteDeck. Last error: ' + mutedeckConnectionStatus.connectionError;
    }

    sendResponse(response);
  } // end getMuteDeckStatus
  else if (message.action === 'toggleMute') {
    toggleMute();
  }
  else if (message.action === 'toggleVideo') {
    toggleVideo();
  }
  else if (message.action === 'toggleShare') {
    toggleShare();
  }
  else if (message.action === 'toggleRecord') {
    toggleRecord();
  }
  else if (message.action === 'leaveCall') {
    leaveCall();
  }
  else if (message.action === 'sendCustomAction') {
    sendCustomAction(message.data.shortcut);
  }
  else if (message.action === 'updatedMuteDeckConnectionStatus') {
    console.log('Received updated connection status from background script: ');
    console.log(message.data);
    mutedeckConnectionStatus = message.data;
  }
});

window.addEventListener("load", function load(event) {
  chrome.runtime.sendMessage({ action: "contentAskedForMuteDeckConnectionStatus" });
  OBSERVERS.forEach(observer => observer.initialize());
}, false);

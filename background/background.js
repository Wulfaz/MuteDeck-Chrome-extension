let currentMeetingStatus = {};
let defaultSSL = false;
const userAgent = navigator.userAgent;
console.log(`User agent: ${userAgent}`);
if (userAgent.includes("Firefox")) {
  defaultSSL = true;
} else if (userAgent.includes("Safari") && !userAgent.includes("Chrome")) {
  // Turn off SSL by default for Safari
  defaultSSL = false;
}

const mutedeckConnection = new MuteDeckConnection(defaultSSL);
mutedeckConnection.initialize();

// Keep track of registered content scripts for custom sites
const registeredScripts = new Map();

// Initialize content scripts for custom sites on startup
chrome.runtime.onStartup.addListener(() => {
  updateContentScriptRegistrations();
});

// Also run on extension install/enable
chrome.runtime.onInstalled.addListener(() => {
  updateContentScriptRegistrations();
});

// Function to update content script registrations based on custom sites
async function updateContentScriptRegistrations() {
  try {
    const { customSites = [] } = await chrome.storage.sync.get('customSites');
    const permittedSites = customSites.filter(site => site.hasPermission);

    console.log('Updating content script registrations for custom sites:', permittedSites.map(s => s.host));

    // Unregister all previous custom registrations
    for (const [scriptId] of registeredScripts) {
      try {
        await chrome.scripting.unregisterContentScripts({ ids: [scriptId] });
        console.log(`Unregistered content script: ${scriptId}`);
      } catch (e) {
        console.log(`Could not unregister ${scriptId}:`, e.message);
      }
    }
    registeredScripts.clear();

    // Register new content scripts for each custom site
    for (const site of permittedSites) {
      const scriptId = `custom-site-${site.host.replace(/[^a-zA-Z0-9]/g, '-')}`;

      try {
        await chrome.scripting.registerContentScripts([{
          id: scriptId,
          matches: [`https://${site.host}/*`, `http://${site.host}/*`],
          js: [
            'observers/googleMeetObserver.js',
            'observers/zoomObserver.js',
            'observers/teamsObserver.js',
            'observers/streamyardObserver.js',
            'observers/riversideObserver.js',
            'observers/jitsiObserver.js',
            'contentScript.js'
          ],
          runAt: 'document_start',
          allFrames: false
        }]);

        registeredScripts.set(scriptId, site);
        console.log(`Registered content script for ${site.host}`);
      } catch (error) {
        console.error(`Failed to register content script for ${site.host}:`, error);
      }
    }

    console.log(`Content script registrations complete. Total registered: ${registeredScripts.size}`);
  } catch (error) {
    console.error('Error updating content script registrations:', error);
  }
}

function onError(error) {
  console.log(`Error: ${error}`);
}

function sendMessageToContentScript(action, message = {}) {
  chrome.tabs.query({}).then(async (tabs) => {
    // Get custom sites from storage
    const { customSites = [] } = await chrome.storage.sync.get('customSites');
    const customUrls = customSites.filter(site => site.hasPermission).map(site => site.host);

    tabs.forEach((tab) => {
      if (tab.url && (
        tab.url.includes('meet.google.com') ||
        tab.url.includes('app.zoom.us') ||
        tab.url.includes('teams.microsoft.com') ||
        tab.url.includes('streamyard.com') ||
        tab.url.includes('riverside.fm') ||
        tab.url.includes('meet.jit.si') ||
        customUrls.some(host => tab.url.includes(host))
      )) {
        chrome.tabs.sendMessage(tab.id, { action: action, data: message }).catch(onError);
      }
    });
  });
}

sendConnectionStatusUpdate = () => {
  let status = {
    isMuteDeckConnected: mutedeckConnection._isMuteDeckConnected,
    connectionParameters: mutedeckConnection.getConnectionParameters(),
    connectionError: mutedeckConnection._MuteDeckConnectionError
  };

  sendMessageToContentScript('updatedMuteDeckConnectionStatus', status);
};

function toggleMute() {
  sendMessageToContentScript('toggleMute');
}

function toggleVideo() {
  sendMessageToContentScript('toggleVideo');
}

function toggleShare() {
  sendMessageToContentScript('toggleShare');
}

function toggleRecord() {
  sendMessageToContentScript('toggleRecord');
}

function leaveCall() {
  sendMessageToContentScript('leaveCall');
}

function sendCustomAction(shortcut) {
  sendMessageToContentScript('sendCustomAction', { shortcut: shortcut });
}

function bringToFront() {
  const urlMappings = [
    { url: 'meet.google.com', control: 'google-meet' },
    { url: 'app.zoom.us', control: 'zoom-web' },
    { url: 'teams.microsoft.com', control: 'teams-web' },
    { url: 'streamyard.com', control: 'streamyard' },
    { url: 'riverside.fm', control: 'riverside' },
    { url: 'meet.jit.si', control: 'jitsi' }
  ];

  chrome.tabs.query({}).then(async function (tabs) {
    // Get custom sites from storage
    const { customSites = [] } = await chrome.storage.sync.get('customSites');
    const customJitsiSites = customSites.filter(site => site.hasPermission);

    const meetTab = tabs.find(tab => {
      // Check default mappings
      const defaultMatch = urlMappings.some(mapping =>
        tab.url.includes(mapping.url) && currentMeetingStatus?.control === mapping.control
      );

      // Check custom Jitsi sites (assume they use jitsi control)
      const customJitsiMatch = currentMeetingStatus?.control === 'jitsi' &&
        customJitsiSites.some(site => tab.url.includes(site.host));

      return defaultMatch || customJitsiMatch;
    });

    if (meetTab) {
      chrome.tabs.update(meetTab.id, { active: true });
      chrome.windows.update(meetTab.windowId, {
        focused: true,
        // Only Google Meet needs drawAttention
        drawAttention: currentMeetingStatus?.control === 'google-meet'
      });
    } else {
      console.log('No call tab found');
    }
  }).catch(error => {
    console.error('Error bringing tab to front:', error);
  });
}

// Predefined functions for Jitsi script execution (CSP-safe)
const jitsiPageFunctions = {
  checkStore: () => {
    if (window.APP && window.APP.store) {
      window.postMessage({ type: 'JITSI_STORE_AVAILABLE', available: true }, '*');
    } else {
      window.postMessage({ type: 'JITSI_STORE_AVAILABLE', available: false }, '*');
    }
  },

  getState: () => {
    try {
      if (window.APP && window.APP.store) {
        const state = window.APP.store.getState();
        const mediaState = state['features/base/media'] || {};
        const recordingState = state['features/recording'] || {};
        const participantsState = state['features/base/participants'] || {};
        const conferenceState = state['features/base/conference'] || {};

        const hasConference = !!(conferenceState.conference);
        const inCall = hasConference;
        const isRecording = (recordingState.selectedRecordingService || "") !== "";

        const status = {
          hasData: true,
          inCall: inCall,
          muted: mediaState.audio?.muted ?? false,
          videoMuted: mediaState.video?.muted ?? false,
          recording: isRecording || false,
          // Note: screen sharing status will be detected in content script since background can't access DOM
          participants: Object.keys(participantsState || {}).length
        };

        window.postMessage({ type: 'JITSI_STATE_UPDATE', status: status }, '*');
      } else {
        // No Redux store available, try DOM fallback
        const meetingContainer = document.querySelector('[id*="videospace"], [class*="videoContainer"], [class*="large-video"], .large-video-container') ||
          document.querySelector('[data-testid*="meeting"], [data-testid*="video"]') ||
          document.querySelector('.toolbox, .toolbar, [class*="toolbox"]');

        window.postMessage({
          type: 'JITSI_STATE_UPDATE',
          status: { hasData: true, inCall: !!meetingContainer }
        }, '*');
      }
    } catch (e) {
      console.log('Error getting Jitsi state:', e);
      window.postMessage({ type: 'JITSI_STATE_UPDATE', status: { hasData: false } }, '*');
    }
  },

  toggleMute: () => {
    try {
      if (window.APP && window.APP.conference) {
        console.log('Using Jitsi internal API to toggle mute');
        window.APP.conference.toggleAudioMuted();
        window.postMessage({ type: 'JITSI_ACTION_RESULT', action: 'mute', success: true }, '*');
        return;
      }
    } catch (e) {
      console.log('Failed to use internal API for mute:', e);
    }
    window.postMessage({ type: 'JITSI_ACTION_RESULT', action: 'mute', success: false }, '*');
  },

  toggleVideo: () => {
    try {
      if (window.APP && window.APP.conference) {
        console.log('Using Jitsi internal API to toggle video');
        window.APP.conference.toggleVideoMuted();
        window.postMessage({ type: 'JITSI_ACTION_RESULT', action: 'video', success: true }, '*');
        return;
      }
    } catch (e) {
      console.log('Failed to use internal API for video:', e);
    }
    window.postMessage({ type: 'JITSI_ACTION_RESULT', action: 'video', success: false }, '*');
  },

  leaveCall: () => {
    try {
      if (window.APP && window.APP.conference) {
        console.log('Using Jitsi internal API to leave call');
        window.APP.conference.hangup();
        window.postMessage({ type: 'JITSI_ACTION_RESULT', action: 'leave', success: true }, '*');
        return;
      }
    } catch (e) {
      console.log('Failed to use internal API for leave:', e);
    }
    window.postMessage({ type: 'JITSI_ACTION_RESULT', action: 'leave', success: false }, '*');
  },
};

chrome.runtime.onMessage.addListener(async function (message, sender, sendResponse) {
  if (message.action == "updateMuteDeckStatus") {
    // console.log('Received message from content script');
    // console.log(message.message);
    currentMeetingStatus = message.message;
    mutedeckConnection.sendMessage(message.message);
  }
  else if (message.action === "refreshConnectionSettings") {
    console.log('Received refresh connection settings message');
    mutedeckConnection.refreshConnectionSettings();
  }
  else if (message.action == "contentAskedForMuteDeckConnectionStatus") {
    sendConnectionStatusUpdate();
  }
  else if (message.action === "executeInPageContext") {
    // Handle CSP-safe script execution for Jitsi observer
    if (sender.tab && sender.tab.id && message.functionName && jitsiPageFunctions[message.functionName]) {
      chrome.scripting.executeScript({
        target: { tabId: sender.tab.id },
        world: 'MAIN', // Execute in main world to access window.APP
        func: jitsiPageFunctions[message.functionName]
      }).catch(error => {
        console.log('Failed to execute script in page context:', error);
      });
    }
  }
  else if (message.action === "updateContentScripts") {
    // Handle custom sites update - re-register content scripts
    updateContentScriptRegistrations();
  }
  else if (message.action === "forceInjectScripts") {
    // Handle force re-registration from options page
    console.log(`🔧 Force re-registering content scripts`);
    await updateContentScriptRegistrations();
  }

  // For Safari compatibility, ensure sendResponse is called
  if (sendResponse) {
    sendResponse({});
  }
  return true;
});



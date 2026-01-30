chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
  const tab = tabs[0];

  const defaultSites = [
    'meet.google.com',
    'app.zoom.us',
    'teams.microsoft.com',
    'streamyard.com',
    'riverside.fm',
    'meet.jit.si',
    'app.v2.gather.town'
  ];

  // Get custom sites from storage
  let customSites = [];
  try {
    const result = await chrome.storage.sync.get('customSites');
    customSites = (result.customSites || []).filter(site => site.hasPermission).map(site => site.host);
  } catch (error) {
    console.log('Could not load custom sites:', error);
  }

  const allSupportedSites = [...defaultSites, ...customSites];
  const hasAccess = tab?.url && allSupportedSites.some(site => tab.url.includes(site));

  if (!hasAccess) {
    document.getElementById('access-warning').style.display = 'block';
    document.getElementById('connection').style.display = 'none';
    document.getElementById('ssl_accept_warning').style.display = 'none';
    document.getElementById('status-container').style.display = 'none';

    // Update the warning text to mention custom sites
    const warningElement = document.getElementById('access-warning');
    warningElement.innerHTML = `
      <p>MuteDeck only has access to meeting websites.</p>
      <small>Default sites: meet.google.com, app.zoom.us, teams.microsoft.com, streamyard.com, riverside.fm, meet.jit.si, app.v2.gather.town</small>
      <br /><br />
      <small>To add custom meeting sites (like branded Jitsi instances), go to <a href="#" id="open-options">the extension options.</a></small>
    `;
    const optionsLink = document.getElementById('open-options');
    if (optionsLink) {
      optionsLink.addEventListener('click', (e) => {
        e.preventDefault();
        chrome.runtime.openOptionsPage();
      });
    }
    return;
  }

  chrome.tabs.sendMessage(tab.id, { action: 'getMuteDeckStatus' }, (response) => {
    if (!response) {
      return;
    }
    document.getElementById('connection').innerText = response.connection;

    var callTypeAndStatus = 'Not in call';
    if (response.isInMeeting) {
      if (response.isGoogleMeetCall) {
        callTypeAndStatus = 'In Google Meet call';
      } else if (response.isZoomCall) {
        callTypeAndStatus = 'In Zoom call';
      } else if (response.isStreamyardCall) {
        callTypeAndStatus = 'In Streamyard session';
      } else if (response.isTeamsCall) {
        callTypeAndStatus = 'In Teams call';
      } else if (response.isRiversideCall) {
        callTypeAndStatus = 'In Riverside session';
      } else if (response.isJitsiCall) {
        callTypeAndStatus = 'In Jitsi Meet call';
      } else if (response.isGatherCall) {
        callTypeAndStatus = 'In Gather meeting';
      } else {
        callTypeAndStatus = 'In call';
      }
    }
    document.getElementById('call-status').innerText = callTypeAndStatus;
    document.getElementById('mute-status').innerText = (response.isMuted ? 'Muted' : 'Unmuted');
    document.getElementById('camera-status').innerText = (response.isVideoStarted ? 'Camera on' : 'Camera off');
    document.getElementById('share-status').innerText = (response.isShareStarted ? 'Sharing' : 'Not sharing');
    document.getElementById('recording-status').innerText = (response.isRecordStarted ? 'Recording' : 'Not recording');

    if (response.connectionParameters.enable_ssl && !response.connected) {
      document.getElementById('ssl_accept_warning').innerHTML = '<br />With SSL enabled, you may need to accept the certificate in your browser.<br /><br />Click <a href="https://' + response.connectionParameters.host + ':' + response.connectionParameters.port_ssl + '" target="_blank">here</a> and accept the certificate. Then refresh this page.';
    }
  });
});
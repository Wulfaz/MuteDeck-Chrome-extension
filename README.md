# MuteDeck Chrome Extension

A Chrome extension that enables hardware and software control of video meeting platforms via WebSocket connection to the [MuteDeck](https://mutedeck.com/) device/app.

## Requirements

This extension requires the [MuteDeck](https://mutedeck.com/) desktop application, which acts as a bridge between your browser-based calling applications and hardware devices like StreamDeck, LoupeDeck, or TouchPortal.

## Supported Platforms

- Google Meet
- Zoom (Web)
- Microsoft Teams
- Jitsi
- StreamYard
- Riverside

## Supported Platforms added by this repository
- Google Meet (manage the Companion mode)
- Gather.town (aka Gather)

## Supported Actions

| Action | Description |
|--------|-------------|
| Toggle Mute | Mute/unmute microphone |
| Toggle Video | Enable/disable camera |
| Toggle Screen Share | Start/stop screen sharing |
| Toggle Recording | Start/stop recording (where supported) |
| Leave Call | Exit the current meeting |

## Getting Started

### 1. Install MuteDeck

Download and install the MuteDeck app from [mutedeck.com](https://mutedeck.com/).

### 2. Install the Extension

**From Chrome Web Store (no Gather.town support):**

Install directly from the [Chrome Web Store](https://chrome.google.com/webstore).

**For Development and/or Gather.town support:**

1. Clone this repository:
   ```bash
   git clone https://github.com/Wulfaz/MuteDeck-Chrome-extension.git
   ```
2. Open `chrome://extensions/` in Chrome
3. Enable "Developer mode" (toggle in top right)
4. Click "Load unpacked" and select the cloned directory

### 3. Configure Connection

Click the extension icon to access the popup and configure:
- **Host**: MuteDeck server address (default: `localhost`)
- **Port**: WebSocket port (default: `3492`, or `3493` for SSL)
- **SSL**: Enable for secure connections (default: disabled)

## Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│  MuteDeck Device/App ◄──► WebSocket (port 3492/3493)                   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│  background/                                                           │
│  ├── service-worker.js (entry point)                                   │
│  ├── background.js (message routing, custom sites)                     │
│  ├── mutedeckConnection.js (WebSocket management)                      │
│  └── reconnectingWebsocket.js (auto-reconnect wrapper)                 │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ chrome.runtime messages
┌───────────────────────────────────▼────────────────────────────────────┐
│  contentScript.js (injected in meeting tabs)                           │
│  └── Initializes platform-specific observer                            │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│  observers/                                                            │
│  ├── googleMeetObserver.js                                             │
│  ├── zoomObserver.js                                                   │
│  ├── teamsObserver.js                                                  │
│  ├── jitsiObserver.js                                                  │
│  ├── streamyardObserver.js                                             │
│  ├── riversideObserver.js                                              │
│  └── gatherObserver.js                                                 │
└────────────────────────────────────────────────────────────────────────┘
```

## WebSocket Protocol

The extension communicates with MuteDeck via WebSocket:

- **Default**: `ws://localhost:3492`
- **SSL**: `wss://localhost:3493`

### Message Format

**Status reports (extension → MuteDeck):**
```json
{ "meeting": true, "mute": false, "video": true, "share": false, "recording": false }
```

**Commands (MuteDeck → extension):**
```json
{ "action": "toggleMute" }
```

## Development

### Reload After Changes

- Click the refresh icon on the extension card in `chrome://extensions/`
- For content script changes, also refresh the meeting tab

### Debug

- **Background**: Click "Service worker" link in `chrome://extensions/`
- **Content scripts**: DevTools on meeting page → Console (filter by extension name)
- **Popup**: Right-click extension icon → Inspect popup

### Adding a New Platform

1. Create a new observer class in `observers/` following the existing pattern
2. Implement the observer interface:
   - `initialize()` - Set up DOM monitoring
   - `updateStatus()` - Poll/monitor DOM and report state changes
   - `toggleMute()`, `toggleVideo()`, `toggleShare()`, `toggleRecord()`, `leaveCall()`
3. Add to `OBSERVERS` array in `contentScript.js`
4. Add URL pattern to `manifest.json` content_scripts

## About MuteDeck

[MuteDeck](https://mutedeck.com/) provides hardware control integration for video conferencing applications. It supports various input devices including Elgato StreamDeck, LoupeDeck, and TouchPortal, allowing you to control your meetings with physical buttons and controls.

## License

This extension is provided as-is for use with MuteDeck.

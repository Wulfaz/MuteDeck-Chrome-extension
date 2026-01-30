# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MuteDeck Chrome Extension (v5.0.1) - Manifest V3 extension that enables hardware/software control of video meeting platforms via WebSocket connection to MuteDeck device/app. Supports 7 platforms: Google Meet, Zoom, Microsoft Teams, Jitsi, Streamyard, Riverside, and Gather.

## Development Commands

This is a Chrome Extension with no build system - plain JavaScript loaded directly by the browser.

**Load for development:**
1. Open `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked" and select the project directory

**Reload after changes:**
- Click the refresh icon on the extension card in `chrome://extensions/`
- For content script changes, also refresh the meeting tab

**Debug:**
- Background: Click "Service worker" link in `chrome://extensions/`
- Content scripts: DevTools on meeting page → Console (filter by extension name)
- Popup: Right-click extension icon → Inspect popup

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
│  ├── googleMeetObserver.js (jsname attrs: A5il2e, etc.)                │
│  ├── zoomObserver.js (iframe: .pwa-webclient__iframe)                  │
│  ├── teamsObserver.js (button IDs: microphone-button)                  │
│  ├── jitsiObserver.js (Redux store + DOM fallback)                     │
│  ├── streamyardObserver.js (aria-label attrs)                          │
│  ├── riversideObserver.js (data-automation-class or data-testid attrs) │
│  └── gatherObserver.js (data-testid attrs)                             │
└────────────────────────────────────────────────────────────────────────┘
```

## Key Implementation Patterns

### Observer Interface
Each platform observer in `observers/` implements:
- `initialize()` - Set up DOM monitoring via MutationObserver
- `updateStatus()` - Poll/monitor DOM and report state changes
- `toggleMute()`, `toggleVideo()`, `toggleShare()`, `toggleRecord()`, `leaveCall()`

To add a new platform: create observer class following this pattern, add to `OBSERVERS` array in `contentScript.js`, add URL pattern to `manifest.json` content_scripts.

### Message Flow
1. WebSocket receives command from MuteDeck device
2. `background.js` broadcasts via `sendMessageToContentScript()` to all meeting tabs
3. `contentScript.js` dispatches to active observer's toggle method
4. Observer simulates button click or keyboard event on DOM

### Jitsi Complexity
Jitsi requires special handling due to CSP restrictions:
- Uses `chrome.scripting.executeScript()` with `world: 'MAIN'` to access page context
- Accesses Redux store via `window.APP.store.getState()` when available
- Falls back to DOM inspection if Redux unavailable
- Predefined `jitsiPageFunctions` in `background.js` bypass CSP

### Storage Keys (chrome.storage.sync)
```javascript
mutedeck_host, mutedeck_port, mutedeck_port_ssl, mutedeck_enable_ssl  // Connection
customSites  // Array of {url, host, hasPermission, addedAt}
```

## Platform Detection Selectors

| Platform | Key Selectors |
|----------|---------------|
| Google Meet | `[jsname="hw0c9"]` (mute), `[jsname="psRWwc"]` (share) |
| Zoom | `.pwa-webclient__iframe`, `[aria-label*="mute"]` |
| Teams | `#microphone-button`, `#video-button` |
| Jitsi | `window.APP.store` (Redux), `[aria-label*="mute"]` |

## WebSocket Protocol

Connection: `ws://localhost:3492` (default) or `wss://localhost:3493` (SSL)

Messages are JSON with format:
```javascript
{ meeting, mute, video, share, recording }  // Status reports
{ action: "toggleMute" | "toggleVideo" | ... }  // Commands
```

Keep-alive sent every 20 seconds.

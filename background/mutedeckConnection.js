class MuteDeckConnection {

  constructor(defaultSSL) {
    this._defaultSSL = defaultSSL;
    this._socket = null;
    this._isMuteDeckConnected = false;
    this._MuteDeckConnectionError = "";
    this._keepaliveTimer = null;

    this._websocket_url = 'ws://localhost:3492';
    this._port = 3492;
    this._host = 'localhost';
    this._enable_ssl = defaultSSL;
    this._port_ssl = 3493;
  }

  initialize = () => {
    this.refreshConnectionSettings();
    this._keepaliveTimer = setInterval(() => {
      const keepalive = {
        'source': 'browser-extension-plugin',
        'action': 'keep-alive'
      };
      this.sendMessage(keepalive);
    }, 20 * 1000);
  }

  refreshConnectionSettings = () => {
    chrome.storage.sync.get({
      mutedeck_host: 'localhost',
      mutedeck_port: 3492,
      mutedeck_port_ssl: 3493,
      mutedeck_enable_ssl: this._defaultSSL
    }, (items) => {
      if (items.mutedeck_enable_ssl) {
        this._websocket_url = 'wss://' + items.mutedeck_host + ':' + items.mutedeck_port_ssl;
      }
      else {
        this._websocket_url = 'ws://' + items.mutedeck_host + ':' + items.mutedeck_port;
      }
      this._port = items.mutedeck_port;
      this._host = items.mutedeck_host;
      this._enable_ssl = items.mutedeck_enable_ssl;
      this._port_ssl = items.mutedeck_port_ssl;

      console.log('MuteDeck connection settings updated: ' + this._websocket_url);
      this.openMuteDeckWebsocket();
    });

  };

  getConnectionParameters = () => {
    return {
      port: this._port,
      host: this._host,
      enable_ssl: this._enable_ssl,
      port_ssl: this._port_ssl
    }
  }

  sendMessage = (message) => {
    if (this._socket && this._socket.readyState === WebSocket.OPEN) {
      this._socket.send(JSON.stringify(message));
    }
  }

  openMuteDeckWebsocket = () => {
    if (this._socket) {
      this._socket.close();
    }
    console.log('Connecting to MuteDeck at ' + this._websocket_url);
    this._socket = new ReconnectingWebSocket(this._websocket_url);
    sendConnectionStatusUpdate();

    this._socket.addEventListener('open', () => {
      console.log(`[open] Connected to MuteDeck`);

      this._isMuteDeckConnected = true;
      this._MuteDeckConnectionError = "";

      // identify as a google meet plugin, so MuteDeck can send messages back
      const identify = {
        'source': 'browser-extension-plugin',
        'action': 'identify'
      };
      this.sendMessage(identify);
      sendConnectionStatusUpdate();
    });

    this._socket.onclose = function (event) {
      this._isMuteDeckConnected = false;
      this._MuteDeckConnectionError = event.reason;
      if (event.wasClean) {
        console.log(`[close] Connection to MuteDeck closed cleanly, code=${event.code} reason=${event.reason}`);
      } else {
        console.log(`[close] Connection to MuteDeck closed unexpected, code=${event.code} reason=${event.reason}`);
      }
      sendConnectionStatusUpdate();
    };

    this._socket.onerror = function (error) {
      console.log(`[error] ${error.message}`);
      sendConnectionStatusUpdate();
    };

    this._socket.addEventListener('message', function (event) {
      console.log(`[extension] received event: ${event.data}`);
      var message = JSON.parse(event.data);
      if (message.action === 'toggle_mute') {
        toggleMute();
      } else if (message.action === 'toggle_video') {
        toggleVideo();
      } else if (message.action === 'toggle_share') {
        toggleShare();
      } else if (message.action === 'toggle_record') {
        toggleRecord();
      } else if (message.action === 'leave_meeting') {
        leaveCall();
      } else if (message.action === 'custom_action') {
        sendCustomAction(message.shortcut);
      } else if (message.action === 'bring_to_front') {
        bringToFront();
      } else {
        console.log('Dont know this action: ' + message.action);
      }
    });
  }
}
(function (global, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    global.ReconnectingWebSocket = factory();
  }
})(this, function () {

  function ReconnectingWebSocket(url, protocols, options) {
    var settings = {
      debug: false,
      automaticOpen: true,
      reconnectInterval: 1000,
      maxReconnectInterval: 30000,
      reconnectDecay: 1.5,
      timeoutInterval: 2000,
      maxReconnectAttempts: null,
      binaryType: 'blob'
    };

    if (!options) { options = {}; }

    for (var key in settings) {
      if (typeof options[key] !== 'undefined') {
        this[key] = options[key];
      } else {
        this[key] = settings[key];
      }
    }

    this.url = url;
    this.reconnectAttempts = 0;
    this.readyState = WebSocket.CONNECTING;
    this.protocol = null;
    this.protocols = protocols;

    this.listeners = {};

    this.ws = null;
    this.forcedClose = false;
    this.timedOut = false;

    if (this.automaticOpen === true) {
      this.open(false);
    }
  }

  ReconnectingWebSocket.prototype.open = function (reconnectAttempt) {
    var self = this;
    try {
      this.ws = new WebSocket(this.url, this.protocols || []);
    } catch (error) {
      this.ws = null;
      this.readyState = WebSocket.CLOSED;
      this.dispatchEvent('error');
      return;
    };
    this.ws.binaryType = this.binaryType;

    var timeout = setTimeout(function () {
      self.timedOut = true;
      self.ws.close();
      self.timedOut = false;
    }, self.timeoutInterval);

    this.ws.onopen = function (event) {
      clearTimeout(timeout);
      self.readyState = WebSocket.OPEN;
      self.reconnectAttempts = 0;
      self.dispatchEvent('open', { isReconnect: reconnectAttempt });
      reconnectAttempt = false;
    };

    this.ws.onclose = function (event) {
      clearTimeout(timeout);
      self.ws = null;
      if (self.forcedClose) {
        self.readyState = WebSocket.CLOSED;
        self.dispatchEvent('close');
      } else {
        self.readyState = WebSocket.CONNECTING;
        self.dispatchEvent('connecting', { code: event.code, reason: event.reason, wasClean: event.wasClean });
        var delay = self.reconnectInterval * Math.pow(self.reconnectDecay, self.reconnectAttempts);
        setTimeout(function () {
          self.reconnectAttempts++;
          self.open(true);
        }, delay > self.maxReconnectInterval ? self.maxReconnectInterval : delay);
      }
    };

    this.ws.onmessage = function (event) {
      self.dispatchEvent('message', { data: event.data });
    };

    this.ws.onerror = function (event) {
      self.dispatchEvent('error');
    };
  };

  ReconnectingWebSocket.prototype.send = function (data) {
    if (this.ws) {
      return this.ws.send(data);
    } else {
      throw new Error('INVALID_STATE_ERR : Pausing to reconnect websocket');
    }
  };

  ReconnectingWebSocket.prototype.close = function (code, reason) {
    this.forcedClose = true;
    if (this.ws) {
      this.ws.close(code, reason);
    }
  };

  ReconnectingWebSocket.prototype.refresh = function () {
    if (this.ws) {
      this.ws.close();
    }
  };

  ReconnectingWebSocket.prototype.addEventListener = function (type, callback) {
    if (!this.listeners[type]) {
      this.listeners[type] = [];
    }
    this.listeners[type].push(callback);
  };

  ReconnectingWebSocket.prototype.removeEventListener = function (type, callback) {
    if (!this.listeners[type]) {
      return;
    }
    this.listeners[type] = this.listeners[type].filter(listener => listener !== callback);
  };

  ReconnectingWebSocket.prototype.dispatchEvent = function (type, args) {
    var listeners = this.listeners[type];
    if (listeners) {
      listeners.forEach(function (callback) {
        callback(args);
      });
    }
  };

  return ReconnectingWebSocket;
});

// Custom sites management
class CustomSitesManager {
  constructor() {
    this.defaultSites = [
      'https://meet.google.com/*',
      'https://app.zoom.us/*',
      'https://teams.microsoft.com*',
      'https://streamyard.com/*',
      'https://riverside.fm/*',
      'https://meet.jit.si/*',
      'https://app.v2.gather.town/*'
    ];
    this.init();
  }

  init() {
    this.loadCustomSites();
    document.getElementById('add-site').addEventListener('click', () => this.addSite());
    document.getElementById('remove-all').addEventListener('click', () => this.removeAllSites());
    document.getElementById('new-site-url').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.addSite();
    });
    document.getElementById('force-inject').addEventListener('click', () => this.forceInject());
  }

  async loadCustomSites() {
    const { customSites = [] } = await chrome.storage.sync.get('customSites');
    this.renderCustomSites(customSites);
  }

  renderCustomSites(sites) {
    const container = document.getElementById('custom-sites-list');
    container.innerHTML = '';

    if (sites.length === 0) {
      container.innerHTML = '<p style="color: #666; margin: 20px 0;">No custom sites added yet.</p>';
      return;
    }

    sites.forEach((site, index) => {
      const siteDiv = document.createElement('div');
      siteDiv.className = 'custom-site';
      siteDiv.innerHTML = `
        <input type="text" value="${site.url}" readonly style="width: 300px;" />
        <span style="margin: 0 10px; color: ${site.hasPermission ? '#28a745' : '#dc3545'};">
          ${site.hasPermission ? 'Enabled' : 'Permission needed'}
        </span>
        <button class="remove" onclick="customSitesManager.removeSite(${index})">Remove</button>
        ${!site.hasPermission ? `<button onclick="customSitesManager.requestPermission('${site.url}', ${index})">Grant Permission</button>` : ''}
      `;
      container.appendChild(siteDiv);
    });
  }

  async addSite() {
    const input = document.getElementById('new-site-url');
    let url = input.value.trim();

    if (!url) {
      this.showStatus('Please enter a URL', 'error');
      return;
    }

    // Validate and normalize URL
    try {
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
      }

      const urlObj = new URL(url);
      const normalizedUrl = `${urlObj.protocol}//${urlObj.host}/*`;

      // Check if it's already a default site
      if (this.defaultSites.some(site => site.includes(urlObj.host))) {
        this.showStatus('This site is already supported by default', 'warning');
        return;
      }

      // Get current custom sites
      const { customSites = [] } = await chrome.storage.sync.get('customSites');

      // Check if already added
      if (customSites.some(site => site.url === normalizedUrl)) {
        this.showStatus('This site is already in your custom list', 'warning');
        return;
      }

      // Request permission for the new site
      const granted = await chrome.permissions.request({
        origins: [normalizedUrl]
      });

      // Add to custom sites
      const newSite = {
        url: normalizedUrl,
        host: urlObj.host,
        hasPermission: granted,
        addedAt: Date.now()
      };

      customSites.push(newSite);
      await chrome.storage.sync.set({ customSites });

      input.value = '';
      this.loadCustomSites();

      if (granted) {
        this.showStatus(`Successfully added ${urlObj.host}`, 'success');
        // Notify background script to update content scripts
        chrome.runtime.sendMessage({ action: 'updateContentScripts' });
      } else {
        this.showStatus(`Added ${urlObj.host} but permission was denied. You can grant it later.`, 'warning');
      }

    } catch (error) {
      this.showStatus('Invalid URL format', 'error');
    }
  }

  async removeSite(index) {
    const { customSites = [] } = await chrome.storage.sync.get('customSites');
    const site = customSites[index];

    if (site) {
      // Remove permission
      if (site.hasPermission) {
        await chrome.permissions.remove({ origins: [site.url] });
      }

      // Remove from storage
      customSites.splice(index, 1);
      await chrome.storage.sync.set({ customSites });

      this.loadCustomSites();
      this.showStatus(`Removed ${site.host}`, 'success');

      // Notify background script
      chrome.runtime.sendMessage({ action: 'updateContentScripts' });
    }
  }

  async removeAllSites() {
    const { customSites = [] } = await chrome.storage.sync.get('customSites');
    if (customSites.length === 0) {
      this.showStatus('No custom sites to remove', 'warning');
      return;
    }

    // Remove permissions
    for (const site of customSites) {
      if (site.hasPermission) {
        await chrome.permissions.remove({ origins: [site.url] });
      }
    }

    // Remove from storage
    await chrome.storage.sync.set({ customSites: [] });
    this.loadCustomSites();
    this.showStatus('All custom sites removed', 'success');

    // Notify background script
    chrome.runtime.sendMessage({ action: 'updateContentScripts' });
  }

  async requestPermission(url, index) {
    const granted = await chrome.permissions.request({ origins: [url] });

    if (granted) {
      // Update permission status
      const { customSites = [] } = await chrome.storage.sync.get('customSites');
      if (customSites[index]) {
        customSites[index].hasPermission = true;
        await chrome.storage.sync.set({ customSites });
        this.loadCustomSites();
        this.showStatus('Permission granted!', 'success');
        chrome.runtime.sendMessage({ action: 'updateContentScripts' });
      }
    } else {
      this.showStatus('Permission denied', 'error');
    }
  }

  showStatus(message, type = 'success') {
    const status = document.getElementById('status');
    status.textContent = message;
    status.className = type;
    setTimeout(() => {
      status.textContent = '';
      status.className = '';
    }, 5000);
  }

  async forceInject() {
    try {
      // Force re-register all content scripts
      chrome.runtime.sendMessage({
        action: 'forceInjectScripts'
      });

      this.showStatus(`Re-registering content scripts for all custom sites...`, 'success');

    } catch (error) {
      this.showStatus('Failed to re-register: ' + error.message, 'error');
    }
  }
}

// Initialize custom sites manager
let customSitesManager;

// Original options functions
function save_options() {
  var mutedeck_host = document.getElementById('mutedeck_host').value;
  var mutedeck_port = document.getElementById('mutedeck_port').value;
  var mutedeck_port_ssl = document.getElementById('mutedeck_port_ssl').value;
  var mutedeck_enable_ssl = document.getElementById('mutedeck_enable_ssl').checked;
  chrome.storage.sync.set({
    mutedeck_host: mutedeck_host,
    mutedeck_port: mutedeck_port,
    mutedeck_port_ssl: mutedeck_port_ssl,
    mutedeck_enable_ssl: mutedeck_enable_ssl
  }, function () {
    var status = document.getElementById('status');
    status.textContent = 'Connection settings saved.';
    status.className = 'success';
    setTimeout(function () {
      status.textContent = '';
      status.className = '';
    }, 2000);
  });

  // refresh connection settings in background script
  chrome.runtime.sendMessage({ action: 'refreshConnectionSettings' });
}

function load_options() {
  chrome.storage.sync.get({
    mutedeck_host: 'localhost',
    mutedeck_port: 3492,
    mutedeck_port_ssl: 3493,
    mutedeck_enable_ssl: false
  }, function (items) {
    document.getElementById('mutedeck_host').value = items.mutedeck_host;
    document.getElementById('mutedeck_port').value = items.mutedeck_port;
    document.getElementById('mutedeck_port_ssl').value = items.mutedeck_port_ssl;
    document.getElementById('mutedeck_port_ssl').disabled = !items.mutedeck_enable_ssl;
    document.getElementById('mutedeck_enable_ssl').checked = items.mutedeck_enable_ssl;
  });
}

document.addEventListener('DOMContentLoaded', () => {
  load_options();
  customSitesManager = new CustomSitesManager();
});

document.getElementById('save').addEventListener('click', save_options);

// enable mutedeck_port_ssl if mutedeck_enable_ssl is checked
document.getElementById('mutedeck_enable_ssl').addEventListener('change', function () {
  document.getElementById('mutedeck_port_ssl').disabled = !this.checked;
});
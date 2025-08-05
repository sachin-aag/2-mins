// Popup script for 2 mins only Chrome extension

document.addEventListener('DOMContentLoaded', async () => {
  await initializePopup();
  setupEventListeners();
});

// Initialize popup with current data
async function initializePopup() {
  try {
    const status = await sendMessageToBackground('getStatus');
    const cooldownSettings = await sendMessageToBackground('getCooldownSettings');
    
    updateActiveTimers(status.activeTimers);
    updateSiteList(status.siteConfigs);
    updateCooldownSettings(cooldownSettings);
  } catch (error) {
    console.error('Error initializing popup:', error);
  }
}

// Setup event listeners
function setupEventListeners() {
  // Add site button
  document.getElementById('add-site-btn').addEventListener('click', handleAddSite);
  
  // Enter key in inputs
  document.getElementById('site-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleAddSite();
  });
  
  document.getElementById('minutes-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleAddSite();
  });
  
  // Options button
  document.getElementById('options-btn').addEventListener('click', () => {
    chrome.tabs.create({ url: 'options.html' });
    window.close();
  });
  
  // Cooldown settings
  document.getElementById('cooldown-enabled').addEventListener('change', handleCooldownToggle);
  document.getElementById('cooldown-minutes').addEventListener('change', handleCooldownDurationChange);
}

// Handle adding a new site
async function handleAddSite() {
  const siteInput = document.getElementById('site-input');
  const minutesInput = document.getElementById('minutes-input');
  
  const site = siteInput.value.trim().toLowerCase();
  const minutes = parseInt(minutesInput.value);
  
  if (!site) {
    showError('Please enter a website URL');
    return;
  }
  
  if (!minutes || minutes < 1 || minutes > 120) {
    showError('Please enter a valid time (1-120 minutes)');
    return;
  }
  
  // Clean up the site URL (remove protocol, www, etc.)
  const cleanSite = cleanSiteUrl(site);
  
  try {
    await sendMessageToBackground('updateSiteConfig', { site: cleanSite, minutes });
    
    // Clear inputs
    siteInput.value = '';
    minutesInput.value = '';
    
    // Refresh the display
    await initializePopup();
    
    showSuccess(`Added ${cleanSite} with ${minutes} minute timer`);
  } catch (error) {
    showError('Failed to add site');
  }
}

// Update active timers display
function updateActiveTimers(activeTimers) {
  const container = document.getElementById('active-timers');
  const noTimersMsg = document.getElementById('no-timers');
  
  const timerEntries = Object.entries(activeTimers);
  
  if (timerEntries.length === 0) {
    noTimersMsg.style.display = 'block';
    // Hide any existing timer items
    container.querySelectorAll('.timer-item').forEach(item => item.remove());
    return;
  }
  
  noTimersMsg.style.display = 'none';
  
  // Clear existing timer items
  container.querySelectorAll('.timer-item').forEach(item => item.remove());
  
  // Add current timers
  timerEntries.forEach(([tabId, timer]) => {
    const timerElement = createTimerElement(timer);
    container.appendChild(timerElement);
  });
}

// Create timer element
function createTimerElement(timer) {
  const div = document.createElement('div');
  div.className = 'timer-item';
  
  const remainingMinutes = Math.ceil(timer.timeRemaining / 60000);
  const remainingText = remainingMinutes > 0 ? 
    `${remainingMinutes} min remaining` : 
    'Closing soon...';
  
  div.innerHTML = `
    <div class="timer-info">
      <div class="timer-site">${timer.site}</div>
      <div class="timer-remaining">${remainingText}</div>
    </div>
  `;
  
  return div;
}

// Update site list display
function updateSiteList(siteConfigs) {
  const container = document.getElementById('site-list');
  container.innerHTML = '';
  
  const sites = Object.entries(siteConfigs);
  
  if (sites.length === 0) {
    const emptyMsg = document.createElement('div');
    emptyMsg.className = 'no-timers';
    emptyMsg.textContent = 'No sites configured';
    container.appendChild(emptyMsg);
    return;
  }
  
  sites.sort(([a], [b]) => a.localeCompare(b)).forEach(([site, minutes]) => {
    const siteElement = createSiteElement(site, minutes);
    container.appendChild(siteElement);
  });
}

// Create site configuration element
function createSiteElement(site, minutes) {
  const div = document.createElement('div');
  div.className = 'site-item';
  
  div.innerHTML = `
    <div class="site-info">
      <div class="site-name">${site}</div>
      <div class="site-timer">${minutes} minute${minutes !== 1 ? 's' : ''}</div>
    </div>
    <div class="site-actions">
      <input type="number" class="edit-input" value="${minutes}" min="1" max="120" data-site="${site}">
      <button class="btn btn-danger" data-site="${site}" data-action="remove">Remove</button>
    </div>
  `;
  
  // Add event listeners
  const editInput = div.querySelector('.edit-input');
  const removeBtn = div.querySelector('[data-action="remove"]');
  
  editInput.addEventListener('change', async (e) => {
    const newMinutes = parseInt(e.target.value);
    if (newMinutes && newMinutes >= 1 && newMinutes <= 120) {
      await handleEditSite(site, newMinutes);
    } else {
      e.target.value = minutes; // Reset to original value
      showError('Please enter a valid time (1-120 minutes)');
    }
  });
  
  removeBtn.addEventListener('click', () => handleRemoveSite(site));
  
  return div;
}

// Handle editing a site
async function handleEditSite(site, newMinutes) {
  try {
    await sendMessageToBackground('updateSiteConfig', { site, minutes: newMinutes });
    await initializePopup();
    showSuccess(`Updated ${site} to ${newMinutes} minute${newMinutes !== 1 ? 's' : ''}`);
  } catch (error) {
    showError('Failed to update site');
  }
}

// Handle removing a site
async function handleRemoveSite(site) {
  if (!confirm(`Remove ${site} from monitoring?`)) {
    return;
  }
  
  try {
    await sendMessageToBackground('removeSite', { site });
    await initializePopup();
    showSuccess(`Removed ${site} from monitoring`);
  } catch (error) {
    showError('Failed to remove site');
  }
}

// Clean up site URL
function cleanSiteUrl(url) {
  // Remove protocol
  url = url.replace(/^https?:\/\//, '');
  
  // Remove www
  url = url.replace(/^www\./, '');
  
  // Remove trailing slash and path
  url = url.split('/')[0];
  
  // Remove port if present
  url = url.split(':')[0];
  
  return url;
}

// Send message to background script
function sendMessageToBackground(action, data = {}) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ action, ...data }, (response) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(response);
      }
    });
  });
}

// Show success message
function showSuccess(message) {
  showMessage(message, 'success');
}

// Show error message
function showError(message) {
  showMessage(message, 'error');
}

// Show temporary message
function showMessage(message, type = 'info') {
  // Remove any existing messages
  const existingMsg = document.querySelector('.message');
  if (existingMsg) {
    existingMsg.remove();
  }
  
  const msgDiv = document.createElement('div');
  msgDiv.className = `message message-${type}`;
  msgDiv.textContent = message;
  msgDiv.style.cssText = `
    position: fixed;
    top: 10px;
    left: 50%;
    transform: translateX(-50%);
    background: ${type === 'success' ? '#d4edda' : type === 'error' ? '#f8d7da' : '#d1ecf1'};
    color: ${type === 'success' ? '#155724' : type === 'error' ? '#721c24' : '#0c5460'};
    border: 1px solid ${type === 'success' ? '#c3e6cb' : type === 'error' ? '#f5c6cb' : '#bee5eb'};
    border-radius: 4px;
    padding: 8px 12px;
    font-size: 12px;
    z-index: 1000;
    max-width: 300px;
    text-align: center;
  `;
  
  document.body.appendChild(msgDiv);
  
  // Auto remove after 3 seconds
  setTimeout(() => {
    if (msgDiv.parentNode) {
      msgDiv.remove();
    }
  }, 3000);
}

// Update cooldown settings display
function updateCooldownSettings(settings) {
  document.getElementById('cooldown-enabled').checked = settings.enabled;
  document.getElementById('cooldown-minutes').value = settings.durationMinutes;
  
  // Enable/disable duration input based on checkbox
  document.getElementById('cooldown-minutes').disabled = !settings.enabled;
}

// Handle cooldown toggle
async function handleCooldownToggle() {
  const enabled = document.getElementById('cooldown-enabled').checked;
  const minutes = parseInt(document.getElementById('cooldown-minutes').value) || 60;
  
  try {
    await sendMessageToBackground('updateCooldownSettings', {
      settings: { enabled, durationMinutes: minutes }
    });
    
    // Update UI
    document.getElementById('cooldown-minutes').disabled = !enabled;
    
    showSuccess(enabled ? 'Cooldown enabled' : 'Cooldown disabled');
  } catch (error) {
    showError('Failed to update cooldown settings');
  }
}

// Handle cooldown duration change
async function handleCooldownDurationChange() {
  const enabled = document.getElementById('cooldown-enabled').checked;
  const minutes = parseInt(document.getElementById('cooldown-minutes').value);
  
  if (!minutes || minutes < 5 || minutes > 480) {
    showError('Duration must be between 5 and 480 minutes');
    document.getElementById('cooldown-minutes').value = 60;
    return;
  }
  
  try {
    await sendMessageToBackground('updateCooldownSettings', {
      settings: { enabled, durationMinutes: minutes }
    });
    
    showSuccess(`Cooldown duration set to ${minutes} minutes`);
  } catch (error) {
    showError('Failed to update cooldown duration');
  }
}
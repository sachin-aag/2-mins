// Popup script for 2 mins only Chrome extension

document.addEventListener('DOMContentLoaded', async () => {
  console.log('Popup DOM loaded');
  try {
    await initializePopup();
    setupEventListeners();
    console.log('Popup initialized successfully');
  } catch (error) {
    console.error('Error initializing popup:', error);
  }
});

// Initialize popup with current data
async function initializePopup() {
  try {
    const [status, cooldownSettings, whitelistChannels, whitelistVideos, learningMode] = await Promise.all([
      sendMessageToBackground('getStatus'),
      sendMessageToBackground('getCooldownSettings'),
      sendMessageToBackground('getWhitelistChannels'),
      sendMessageToBackground('getWhitelistVideos'),
      sendMessageToBackground('getLearningMode')
    ]);
    
    updateActiveTimers(status.activeTimers);
    updateSiteList(status.siteConfigs);
    updateCooldownSettings(cooldownSettings);
    updateWhitelistChannels(whitelistChannels);
    updateWhitelistVideos(whitelistVideos);
    updateLearningMode(learningMode);
  } catch (error) {
    console.error('Error initializing popup:', error);
  }
}

// Setup event listeners
function setupEventListeners() {
  console.log('Setting up event listeners');
  
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
    console.log('Options button clicked');
    try {
      if (chrome.runtime.openOptionsPage) {
        console.log('Using chrome.runtime.openOptionsPage');
        chrome.runtime.openOptionsPage();
      } else {
        console.log('Using chrome.tabs.create');
        chrome.tabs.create({ url: chrome.runtime.getURL('options.html') });
      }
      window.close();
    } catch (error) {
      console.error('Error opening options page:', error);
      showError('Failed to open options page');
    }
  });
  
  // Cooldown settings
  document.getElementById('cooldown-enabled').addEventListener('change', handleCooldownToggle);
  document.getElementById('cooldown-minutes').addEventListener('change', handleCooldownDurationChange);
  
  // Learning mode
  document.getElementById('learning-mode-btn').addEventListener('click', handleLearningModeToggle);
  document.getElementById('add-current-video-btn').addEventListener('click', handleAddCurrentVideo);
  
  // Whitelist tabs
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => switchTab(e.target.dataset.tab));
  });
  
  // Whitelist management
  document.getElementById('add-channel-btn').addEventListener('click', handleAddChannel);
  document.getElementById('add-video-btn').addEventListener('click', handleAddVideo);
  
  // Enter key support for whitelist inputs
  document.getElementById('channel-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleAddChannel();
  });
  document.getElementById('video-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleAddVideo();
  });
}

// Handle adding a new site
async function handleAddSite() {
  console.log('handleAddSite called');
  
  const siteInput = document.getElementById('site-input');
  const minutesInput = document.getElementById('minutes-input');
  
  if (!siteInput || !minutesInput) {
    console.error('Input elements not found');
    showError('Input elements not found');
    return;
  }
  
  const site = siteInput.value.trim().toLowerCase();
  const minutes = parseInt(minutesInput.value);
  
  console.log('Site:', site, 'Minutes:', minutes);
  
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
  console.log('Clean site:', cleanSite);
  
  try {
    console.log('Sending message to background');
    await sendMessageToBackground('updateSiteConfig', { site: cleanSite, minutes });
    
    // Clear inputs
    siteInput.value = '';
    minutesInput.value = '';
    
    // Refresh the display
    console.log('Refreshing display');
    await initializePopup();
    
    showSuccess(`Added ${cleanSite} with ${minutes} minute timer`);
  } catch (error) {
    console.error('Error adding site:', error);
    showError('Failed to add site: ' + error.message);
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
  console.log('Sending message:', action, data);
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ action, ...data }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Runtime error:', chrome.runtime.lastError);
        reject(chrome.runtime.lastError);
      } else {
        console.log('Background response:', response);
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

// Learning Mode Functions

// Update learning mode display
function updateLearningMode(learningMode) {
  const btn = document.getElementById('learning-mode-btn');
  const status = document.getElementById('learning-status');
  const remaining = document.getElementById('learning-remaining');
  
  if (learningMode.enabled && Date.now() < learningMode.enabledUntil) {
    // Learning mode is active
    btn.textContent = 'Disable Learning Mode';
    btn.classList.add('active');
    status.classList.remove('hidden');
    
    // Update countdown
    const timeLeft = learningMode.enabledUntil - Date.now();
    const minutes = Math.ceil(timeLeft / (1000 * 60));
    remaining.textContent = `${minutes} minutes`;
    
    // Start countdown timer
    if (window.learningModeTimer) clearInterval(window.learningModeTimer);
    window.learningModeTimer = setInterval(async () => {
      const newTimeLeft = learningMode.enabledUntil - Date.now();
      if (newTimeLeft <= 0) {
        clearInterval(window.learningModeTimer);
        await initializePopup(); // Refresh display
      } else {
        const newMinutes = Math.ceil(newTimeLeft / (1000 * 60));
        remaining.textContent = `${newMinutes} minutes`;
      }
    }, 30000); // Update every 30 seconds
  } else {
    // Learning mode is inactive
    btn.textContent = `Enable Learning Mode (${learningMode.durationMinutes / 60}h)`;
    btn.classList.remove('active');
    status.classList.add('hidden');
    
    if (window.learningModeTimer) {
      clearInterval(window.learningModeTimer);
      window.learningModeTimer = null;
    }
  }
}

// Handle learning mode toggle
async function handleLearningModeToggle() {
  try {
    const learningMode = await sendMessageToBackground('getLearningMode');
    
    if (learningMode.enabled && Date.now() < learningMode.enabledUntil) {
      // Disable learning mode
      await sendMessageToBackground('updateLearningMode', {
        settings: { ...learningMode, enabled: false, enabledUntil: 0 }
      });
      showSuccess('Learning mode disabled');
    } else {
      // Enable learning mode
      const enabledUntil = Date.now() + (learningMode.durationMinutes * 60 * 1000);
      await sendMessageToBackground('updateLearningMode', {
        settings: { ...learningMode, enabled: true, enabledUntil }
      });
      showSuccess(`Learning mode enabled for ${learningMode.durationMinutes / 60} hours`);
    }
    
    await initializePopup(); // Refresh display
  } catch (error) {
    showError('Failed to toggle learning mode');
  }
}

// Handle adding current video to whitelist
async function handleAddCurrentVideo() {
  try {
    // Get current active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab.url || !tab.url.includes('youtube.com/watch')) {
      showError('Please navigate to a YouTube video first');
      return;
    }
    
    await sendMessageToBackground('addCurrentVideoToWhitelist', { url: tab.url });
    await initializePopup(); // Refresh display
    showSuccess('Current video added to whitelist');
  } catch (error) {
    showError('Failed to add current video to whitelist');
  }
}

// Whitelist Functions

// Switch between whitelist tabs
function switchTab(tabName) {
  // Update tab buttons
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabName);
  });
  
  // Update tab content
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.toggle('hidden', content.id !== `${tabName}-tab`);
  });
}

// Update whitelist channels display
function updateWhitelistChannels(channels) {
  const container = document.getElementById('channels-list');
  container.innerHTML = '';
  
  if (channels.length === 0) {
    const emptyMsg = document.createElement('div');
    emptyMsg.className = 'no-whitelist';
    emptyMsg.textContent = 'No whitelisted channels';
    container.appendChild(emptyMsg);
    return;
  }
  
  channels.forEach(channel => {
    const item = createWhitelistItem(channel, 'channel');
    container.appendChild(item);
  });
}

// Update whitelist videos display
function updateWhitelistVideos(videos) {
  const container = document.getElementById('videos-list');
  container.innerHTML = '';
  
  if (videos.length === 0) {
    const emptyMsg = document.createElement('div');
    emptyMsg.className = 'no-whitelist';
    emptyMsg.textContent = 'No whitelisted videos';
    container.appendChild(emptyMsg);
    return;
  }
  
  videos.forEach(video => {
    const item = createWhitelistItem(video, 'video');
    container.appendChild(item);
  });
}

// Create whitelist item element
function createWhitelistItem(url, type) {
  const div = document.createElement('div');
  div.className = 'whitelist-item';
  
  const displayUrl = url.length > 50 ? url.substring(0, 47) + '...' : url;
  
  div.innerHTML = `
    <span class="whitelist-url" title="${url}">${displayUrl}</span>
    <button class="whitelist-remove" data-url="${url}" data-type="${type}">Remove</button>
  `;
  
  // Add remove event listener
  const removeBtn = div.querySelector('.whitelist-remove');
  removeBtn.addEventListener('click', () => handleRemoveWhitelistItem(url, type));
  
  return div;
}

// Handle adding channel to whitelist
async function handleAddChannel() {
  const input = document.getElementById('channel-input');
  const channel = input.value.trim();
  
  if (!channel) {
    showError('Please enter a channel URL');
    return;
  }
  
  // Clean up channel URL
  const cleanChannel = cleanChannelUrl(channel);
  
  try {
    const channels = await sendMessageToBackground('getWhitelistChannels');
    if (!channels.includes(cleanChannel)) {
      channels.push(cleanChannel);
      await sendMessageToBackground('updateWhitelistChannels', { channels });
      input.value = '';
      await initializePopup();
      showSuccess('Channel added to whitelist');
    } else {
      showError('Channel already in whitelist');
    }
  } catch (error) {
    showError('Failed to add channel');
  }
}

// Handle adding video to whitelist
async function handleAddVideo() {
  const input = document.getElementById('video-input');
  const video = input.value.trim();
  
  if (!video) {
    showError('Please enter a video URL');
    return;
  }
  
  if (!video.includes('youtube.com/watch') && !video.includes('youtu.be/')) {
    showError('Please enter a valid YouTube video URL');
    return;
  }
  
  try {
    const videos = await sendMessageToBackground('getWhitelistVideos');
    if (!videos.includes(video)) {
      videos.push(video);
      await sendMessageToBackground('updateWhitelistVideos', { videos });
      input.value = '';
      await initializePopup();
      showSuccess('Video added to whitelist');
    } else {
      showError('Video already in whitelist');
    }
  } catch (error) {
    showError('Failed to add video');
  }
}

// Handle removing whitelist item
async function handleRemoveWhitelistItem(url, type) {
  try {
    if (type === 'channel') {
      const channels = await sendMessageToBackground('getWhitelistChannels');
      const updatedChannels = channels.filter(channel => channel !== url);
      await sendMessageToBackground('updateWhitelistChannels', { channels: updatedChannels });
    } else if (type === 'video') {
      const videos = await sendMessageToBackground('getWhitelistVideos');
      const updatedVideos = videos.filter(video => video !== url);
      await sendMessageToBackground('updateWhitelistVideos', { videos: updatedVideos });
    }
    
    await initializePopup();
    showSuccess(`${type} removed from whitelist`);
  } catch (error) {
    showError(`Failed to remove ${type}`);
  }
}

// Clean up channel URL
function cleanChannelUrl(url) {
  // Remove protocol
  url = url.replace(/^https?:\/\//, '');
  
  // Ensure it starts with youtube.com
  if (!url.startsWith('youtube.com')) {
    url = 'youtube.com/' + url.replace(/^\/+/, '');
  }
  
  // Remove trailing slash
  url = url.replace(/\/+$/, '');
  
  return url;
}
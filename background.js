// Background service worker for 2 mins only Chrome extension

// Storage keys
const STORAGE_KEY = 'site_timers';
const ACTIVE_TIMERS_KEY = 'active_timers';
const BLOCKED_SITES_KEY = 'blocked_sites';
const COOLDOWN_SETTINGS_KEY = 'cooldown_settings';
const WHITELIST_CHANNELS_KEY = 'whitelist_channels';
const WHITELIST_VIDEOS_KEY = 'whitelist_videos';
const LEARNING_MODE_KEY = 'learning_mode';

// Default sites with timer configurations (in minutes)
const DEFAULT_SITES = {
  'youtube.com/shorts': 1,  // YouTube Shorts - more restrictive
  'youtube.com': 5,         // Regular YouTube - less restrictive
  'facebook.com': 2,
  'twitter.com': 3,
  'instagram.com': 2,
  'tiktok.com': 2,
  'reddit.com': 10
};

// Default cooldown settings
const DEFAULT_COOLDOWN_SETTINGS = {
  enabled: true,
  durationMinutes: 60  // 1 hour default
};

// Default educational channels (popular learning channels)
const DEFAULT_WHITELIST_CHANNELS = [
  'youtube.com/c/khanacademy',
  'youtube.com/c/crashcourse',
  'youtube.com/c/3blue1brown',
  'youtube.com/c/TED',
  'youtube.com/c/TEDEd',
  'youtube.com/c/Coursera',
  'youtube.com/c/edx',
  'youtube.com/c/MITOpenCourseWare',
  'youtube.com/c/StanfordOnline',
  'youtube.com/c/HarvardOnline'
];

// Default educational videos (including user's marketing video)
const DEFAULT_WHITELIST_VIDEOS = [
  'https://www.youtube.com/watch?v=gWNFna6fgS8' // User's marketing learning video
];

// Educational keywords for smart detection
const EDUCATIONAL_KEYWORDS = [
  'tutorial', 'course', 'learn', 'education', 'how to', 'explained', 
  'masterclass', 'lesson', 'training', 'workshop', 'lecture', 'study',
  'guide', 'tips', 'strategy', 'business', 'marketing', 'programming',
  'coding', 'development', 'design', 'productivity', 'skill', 'career'
];

// Default learning mode settings
const DEFAULT_LEARNING_MODE = {
  enabled: false,
  enabledUntil: 0,
  durationMinutes: 120  // 2 hours default
};

// Initialize extension
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('2 mins only extension installed');
  
  // Get existing configurations
  const result = await chrome.storage.sync.get([
    STORAGE_KEY, 
    COOLDOWN_SETTINGS_KEY,
    WHITELIST_CHANNELS_KEY,
    WHITELIST_VIDEOS_KEY,
    LEARNING_MODE_KEY
  ]);
  
  const existingSites = result[STORAGE_KEY] || {};
  const existingCooldown = result[COOLDOWN_SETTINGS_KEY] || {};
  const existingChannels = result[WHITELIST_CHANNELS_KEY] || [];
  const existingVideos = result[WHITELIST_VIDEOS_KEY] || [];
  const existingLearningMode = result[LEARNING_MODE_KEY] || {};
  
  // Merge defaults with existing configurations
  const mergedSites = { ...DEFAULT_SITES, ...existingSites };
  const mergedCooldown = { ...DEFAULT_COOLDOWN_SETTINGS, ...existingCooldown };
  const mergedChannels = [...new Set([...DEFAULT_WHITELIST_CHANNELS, ...existingChannels])];
  const mergedVideos = [...new Set([...DEFAULT_WHITELIST_VIDEOS, ...existingVideos])];
  const mergedLearningMode = { ...DEFAULT_LEARNING_MODE, ...existingLearningMode };
  
  // Update storage with merged configurations
  await chrome.storage.sync.set({
    [STORAGE_KEY]: mergedSites,
    [COOLDOWN_SETTINGS_KEY]: mergedCooldown,
    [WHITELIST_CHANNELS_KEY]: mergedChannels,
    [WHITELIST_VIDEOS_KEY]: mergedVideos,
    [LEARNING_MODE_KEY]: mergedLearningMode
  });
  
  // Always clear active timers on startup (they don't persist across browser restarts)
  await chrome.storage.local.set({
    [ACTIVE_TIMERS_KEY]: {}
  });
  
  // Only clear blocked sites on first installation, preserve them on updates/reloads
  if (details.reason === 'install') {
    // First time installation - clear blocked sites
    await chrome.storage.local.set({
      [BLOCKED_SITES_KEY]: {}
    });
  }
  // On 'update' or 'startup', blocked sites are preserved to maintain cooldown periods
});

// Handle extension startup (when browser starts)
chrome.runtime.onStartup.addListener(async () => {
  console.log('Extension startup - clearing active timers but preserving cooldowns');
  
  // Clear active timers on startup (they don't persist across browser restarts)
  await chrome.storage.local.set({
    [ACTIVE_TIMERS_KEY]: {}
  });
  
  // Blocked sites are preserved to maintain cooldown periods across browser restarts
});

// Monitor tab updates (navigation to new URLs)
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  // Only process when the page has finished loading
  if (changeInfo.status === 'complete' && tab.url) {
    // Check if site should be blocked first
    const shouldBlock = await checkIfSiteBlocked(tab.url);
    if (shouldBlock) {
      await redirectToBlockedPage(tabId, tab.url);
      return;
    }
    
    await handleTabNavigation(tabId, tab.url);
  }
});

// Monitor tab activation (switching between tabs)
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  const tab = await chrome.tabs.get(activeInfo.tabId);
  if (tab.url) {
    await handleTabNavigation(activeInfo.tabId, tab.url);
  }
});

// Monitor tab removal (cleanup active timers)
chrome.tabs.onRemoved.addListener(async (tabId) => {
  await clearTimerForTab(tabId);
});

// Handle alarm events (timer expiry)
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name.startsWith('close_tab_')) {
    const tabId = parseInt(alarm.name.replace('close_tab_', ''));
    await closeTabIfStillOnSite(tabId);
  }
});

// Main function to handle tab navigation
async function handleTabNavigation(tabId, url) {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;
    const pathname = urlObj.pathname;
    const siteConfigs = await getSiteConfigs();
    
    // Check if this site is in our monitoring list
    const matchingSite = findMatchingSite(hostname, pathname, siteConfigs);
    
    if (matchingSite) {
      // Check if content should bypass timer (whitelist or learning mode)
      const shouldBypass = await shouldBypassTimer(url, urlObj);
      
      if (shouldBypass.bypass) {
        console.log(`Bypassing timer for ${matchingSite}: ${shouldBypass.reason}`);
        await clearTimerForTab(tabId);
        return;
      }
      
      // Apply smart timer adjustment based on content type
      let timerMinutes = siteConfigs[matchingSite];
      const smartAdjustment = await getSmartTimerAdjustment(url, urlObj);
      if (smartAdjustment.extended) {
        timerMinutes = Math.max(timerMinutes, smartAdjustment.minutes);
        console.log(`Extended timer to ${timerMinutes} minutes: ${smartAdjustment.reason}`);
      }
      
      await startTimerForTab(tabId, matchingSite, timerMinutes);
      console.log(`Started ${timerMinutes} minute timer for ${matchingSite} (tab ${tabId})`);
    } else {
      // Clear any existing timer for this tab since it's not a monitored site
      await clearTimerForTab(tabId);
    }
  } catch (error) {
    console.error('Error handling tab navigation:', error);
  }
}

// Find matching site configuration
function findMatchingSite(hostname, pathname, siteConfigs) {
  const matches = [];
  
  // Check all configured sites for matches
  for (const site in siteConfigs) {
    const [siteDomain, sitePath] = site.split('/', 2);
    
    // Check if hostname matches (exact or subdomain)
    const hostnameMatches = hostname === siteDomain || hostname.endsWith('.' + siteDomain);
    
    if (hostnameMatches) {
      if (sitePath) {
        // Site has a specific path requirement (e.g., youtube.com/shorts)
        if (pathname.startsWith('/' + sitePath)) {
          matches.push({ site, specificity: 2 }); // High specificity for path matches
        }
      } else {
        // Site is domain-only (e.g., youtube.com)
        matches.push({ site, specificity: 1 }); // Lower specificity for domain-only matches
      }
    }
  }
  
  // Return the most specific match (path matches take priority over domain-only matches)
  if (matches.length > 0) {
    matches.sort((a, b) => b.specificity - a.specificity);
    return matches[0].site;
  }
  
  return null;
}

// Start timer for a specific tab
async function startTimerForTab(tabId, site, minutes) {
  // Clear any existing timer for this tab
  await clearTimerForTab(tabId);
  
  // Create alarm for tab closure
  const alarmName = `close_tab_${tabId}`;
  await chrome.alarms.create(alarmName, {
    delayInMinutes: minutes
  });
  
  // Store active timer information
  const activeTimers = await getActiveTimers();
  activeTimers[tabId] = {
    site: site,
    minutes: minutes,
    startTime: Date.now(),
    alarmName: alarmName
  };
  
  await chrome.storage.local.set({
    [ACTIVE_TIMERS_KEY]: activeTimers
  });
  
  // Update badge to show timer is active
  await updateBadge();
}

// Clear timer for a specific tab
async function clearTimerForTab(tabId) {
  const activeTimers = await getActiveTimers();
  
  if (activeTimers[tabId]) {
    // Clear the alarm
    await chrome.alarms.clear(activeTimers[tabId].alarmName);
    
    // Remove from active timers
    delete activeTimers[tabId];
    await chrome.storage.local.set({
      [ACTIVE_TIMERS_KEY]: activeTimers
    });
    
    // Update badge
    await updateBadge();
  }
}

// Close tab if still on the monitored site
async function closeTabIfStillOnSite(tabId) {
  try {
    const tab = await chrome.tabs.get(tabId);
    const activeTimers = await getActiveTimers();
    
    if (activeTimers[tabId] && tab.url) {
      const urlObj = new URL(tab.url);
      const hostname = urlObj.hostname;
      const pathname = urlObj.pathname;
      const timerSite = activeTimers[tabId].site;
      const siteConfigs = await getSiteConfigs();
      
      // Check if current URL still matches the original timer site
      const currentMatch = findMatchingSite(hostname, pathname, siteConfigs);
      
      if (currentMatch === timerSite) {
        // Still on the same specific site/path that triggered the timer
        // Add site to cooldown block list first so the blocked page can show the countdown
        await addSiteToCooldown(timerSite);

        // Redirect the user to the focus plan page instead of closing the tab
        await redirectToBlockedPage(tabId, tab.url);
        console.log(`Redirected tab ${tabId} to plan page after timer expired for ${timerSite}`);

        // Show notification/log
        await showNotification(timerSite, activeTimers[tabId].minutes);
      }
    }
    
    // Clean up timer data
    await clearTimerForTab(tabId);
  } catch (error) {
    // Tab might already be closed
    console.log(`Tab ${tabId} no longer exists`);
    await clearTimerForTab(tabId);
  }
}

// Show notification when tab is closed
async function showNotification(site, minutes) {
  // We can't use notifications without permission, so we'll just log for now
  // Could be extended to show notifications if notification permission is added
  console.log(`Tab closed: You spent ${minutes} minutes on ${site}`);
}

// Update extension badge to show active timer count
async function updateBadge() {
  const activeTimers = await getActiveTimers();
  const count = Object.keys(activeTimers).length;
  
  if (count > 0) {
    await chrome.action.setBadgeText({
      text: count.toString()
    });
    await chrome.action.setBadgeBackgroundColor({
      color: '#FF6B6B'
    });
  } else {
    await chrome.action.setBadgeText({
      text: ''
    });
  }
}

// Utility functions for storage
async function getSiteConfigs() {
  const result = await chrome.storage.sync.get(STORAGE_KEY);
  return result[STORAGE_KEY] || {};
}

async function getActiveTimers() {
  const result = await chrome.storage.local.get(ACTIVE_TIMERS_KEY);
  return result[ACTIVE_TIMERS_KEY] || {};
}

// API for popup to get current status
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getStatus') {
    getExtensionStatus().then(sendResponse);
    return true; // Keep message channel open for async response
  } else if (request.action === 'updateSiteConfig') {
    updateSiteConfig(request.site, request.minutes).then(() => {
      sendResponse({ success: true });
    });
    return true;
  } else if (request.action === 'removeSite') {
    removeSiteConfig(request.site).then(() => {
      sendResponse({ success: true });
    });
    return true;
  } else if (request.action === 'getCooldownSettings') {
    getCooldownSettings().then(sendResponse);
    return true;
  } else if (request.action === 'updateCooldownSettings') {
    updateCooldownSettings(request.settings).then(() => {
      sendResponse({ success: true });
    });
    return true;
  } else if (request.action === 'getBlockedSites') {
    getBlockedSites().then(sendResponse);
    return true;
  } else if (request.action === 'getWhitelistChannels') {
    getWhitelistChannels().then(sendResponse);
    return true;
  } else if (request.action === 'updateWhitelistChannels') {
    updateWhitelistChannels(request.channels).then(() => {
      sendResponse({ success: true });
    });
    return true;
  } else if (request.action === 'getWhitelistVideos') {
    getWhitelistVideos().then(sendResponse);
    return true;
  } else if (request.action === 'updateWhitelistVideos') {
    updateWhitelistVideos(request.videos).then(() => {
      sendResponse({ success: true });
    });
    return true;
  } else if (request.action === 'getLearningMode') {
    getLearningMode().then(sendResponse);
    return true;
  } else if (request.action === 'updateLearningMode') {
    updateLearningMode(request.settings).then(() => {
      sendResponse({ success: true });
    });
    return true;
  } else if (request.action === 'addCurrentVideoToWhitelist') {
    // Special action to whitelist the current video
    (async () => {
      const videos = await getWhitelistVideos();
      if (!videos.includes(request.url)) {
        videos.push(request.url);
        await updateWhitelistVideos(videos);
      }
      sendResponse({ success: true });
    })();
    return true;
  }
});

// Get current extension status
async function getExtensionStatus() {
  const siteConfigs = await getSiteConfigs();
  const activeTimers = await getActiveTimers();
  
  // Get details about active timers
  const activeDetails = {};
  for (const [tabId, timer] of Object.entries(activeTimers)) {
    try {
      const tab = await chrome.tabs.get(parseInt(tabId));
      activeDetails[tabId] = {
        ...timer,
        url: tab.url,
        title: tab.title,
        timeRemaining: Math.max(0, (timer.startTime + timer.minutes * 60000) - Date.now())
      };
    } catch (error) {
      // Tab no longer exists, will be cleaned up
    }
  }
  
  return {
    siteConfigs,
    activeTimers: activeDetails
  };
}

// Update site configuration
async function updateSiteConfig(site, minutes) {
  const siteConfigs = await getSiteConfigs();
  siteConfigs[site] = minutes;
  await chrome.storage.sync.set({
    [STORAGE_KEY]: siteConfigs
  });
}

// Remove site configuration
async function removeSiteConfig(site) {
  const siteConfigs = await getSiteConfigs();
  delete siteConfigs[site];
  await chrome.storage.sync.set({
    [STORAGE_KEY]: siteConfigs
  });
}

// Cooldown management functions

// Check if a site should be blocked
async function checkIfSiteBlocked(url) {
  try {
    const cooldownSettings = await getCooldownSettings();
    if (!cooldownSettings.enabled) {
      return false;
    }

    const urlObj = new URL(url);
    const hostname = urlObj.hostname;
    const pathname = urlObj.pathname;
    const siteConfigs = await getSiteConfigs();
    
    // Check if this URL matches any monitored site
    const matchingSite = findMatchingSite(hostname, pathname, siteConfigs);
    if (!matchingSite) {
      return false;
    }

    // Check if this site is currently in cooldown
    const blockedSites = await getBlockedSites();
    const blockEntry = blockedSites[matchingSite];
    
    if (blockEntry) {
      const now = Date.now();
      const blockExpiry = blockEntry.blockedUntil;
      
      if (now < blockExpiry) {
        return true; // Still blocked
      } else {
        // Block period expired, remove from blocked list
        await removeSiteFromCooldown(matchingSite);
        return false;
      }
    }
    
    return false;
  } catch (error) {
    console.error('Error checking if site blocked:', error);
    return false;
  }
}

// Add site to cooldown block list
async function addSiteToCooldown(site) {
  try {
    const cooldownSettings = await getCooldownSettings();
    if (!cooldownSettings.enabled) {
      return;
    }

    const blockedSites = await getBlockedSites();
    const now = Date.now();
    const blockDuration = cooldownSettings.durationMinutes * 60 * 1000; // Convert to milliseconds
    
    blockedSites[site] = {
      blockedAt: now,
      blockedUntil: now + blockDuration,
      durationMinutes: cooldownSettings.durationMinutes
    };
    
    await chrome.storage.local.set({
      [BLOCKED_SITES_KEY]: blockedSites
    });
    
    console.log(`Added ${site} to cooldown for ${cooldownSettings.durationMinutes} minutes`);
  } catch (error) {
    console.error('Error adding site to cooldown:', error);
  }
}

// Remove site from cooldown block list
async function removeSiteFromCooldown(site) {
  try {
    const blockedSites = await getBlockedSites();
    delete blockedSites[site];
    await chrome.storage.local.set({
      [BLOCKED_SITES_KEY]: blockedSites
    });
    console.log(`Removed ${site} from cooldown`);
  } catch (error) {
    console.error('Error removing site from cooldown:', error);
  }
}

// Redirect to blocked page
async function redirectToBlockedPage(tabId, originalUrl) {
  try {
    const blockPageUrl = chrome.runtime.getURL('blocked.html') + 
      '?site=' + encodeURIComponent(originalUrl) + 
      '&timestamp=' + Date.now();
    
    await chrome.tabs.update(tabId, { url: blockPageUrl });
    console.log(`Redirected tab ${tabId} to blocked page`);
  } catch (error) {
    console.error('Error redirecting to blocked page:', error);
  }
}

// Utility functions for cooldown storage
async function getCooldownSettings() {
  const result = await chrome.storage.sync.get(COOLDOWN_SETTINGS_KEY);
  return result[COOLDOWN_SETTINGS_KEY] || DEFAULT_COOLDOWN_SETTINGS;
}

async function getBlockedSites() {
  const result = await chrome.storage.local.get(BLOCKED_SITES_KEY);
  return result[BLOCKED_SITES_KEY] || {};
}

async function updateCooldownSettings(settings) {
  await chrome.storage.sync.set({
    [COOLDOWN_SETTINGS_KEY]: settings
  });
}

// Smart whitelist and learning mode functions

// Check if content should bypass timer
async function shouldBypassTimer(url, urlObj) {
  try {
    // Check learning mode first
    const learningMode = await getLearningMode();
    if (learningMode.enabled && Date.now() < learningMode.enabledUntil) {
      return { bypass: true, reason: 'Learning mode active' };
    }
    
    // Check video whitelist
    const whitelistVideos = await getWhitelistVideos();
    const normalizedUrl = normalizeVideoUrl(url);
    if (whitelistVideos.some(video => normalizeVideoUrl(video) === normalizedUrl)) {
      return { bypass: true, reason: 'Whitelisted video' };
    }
    
    // Check channel whitelist
    const whitelistChannels = await getWhitelistChannels();
    const channelPath = extractChannelPath(urlObj);
    if (channelPath && whitelistChannels.some(channel => channel.includes(channelPath))) {
      return { bypass: true, reason: 'Whitelisted channel' };
    }
    
    return { bypass: false };
  } catch (error) {
    console.error('Error checking bypass conditions:', error);
    return { bypass: false };
  }
}

// Get smart timer adjustment based on content analysis
async function getSmartTimerAdjustment(url, urlObj) {
  try {
    // For now, we'll use URL analysis. In the future, we could analyze page title/content
    const isEducational = await isEducationalContent(url, urlObj);
    
    if (isEducational) {
      return { 
        extended: true, 
        minutes: 30, // Extended time for educational content
        reason: 'Educational content detected' 
      };
    }
    
    return { extended: false };
  } catch (error) {
    console.error('Error getting smart timer adjustment:', error);
    return { extended: false };
  }
}

// Detect if content is educational based on keywords and patterns
async function isEducationalContent(url, urlObj) {
  try {
    // Check URL parameters and path for educational indicators
    const urlString = url.toLowerCase();
    const searchParams = urlObj.searchParams;
    
    // Check for educational keywords in URL
    const hasEducationalKeywords = EDUCATIONAL_KEYWORDS.some(keyword => 
      urlString.includes(keyword.toLowerCase())
    );
    
    if (hasEducationalKeywords) {
      return true;
    }
    
    // Check for educational playlists
    const playlistId = searchParams.get('list');
    if (playlistId && await isEducationalPlaylist(playlistId)) {
      return true;
    }
    
    // Future enhancement: Could analyze page title and description
    // For now, return false for non-obvious cases
    return false;
  } catch (error) {
    console.error('Error detecting educational content:', error);
    return false;
  }
}

// Check if playlist is educational (basic heuristics)
async function isEducationalPlaylist(playlistId) {
  // Educational playlists often have certain patterns
  const educationalPatterns = [
    'course', 'tutorial', 'lesson', 'learn', 'education', 
    'training', 'masterclass', 'workshop', 'study'
  ];
  
  // This is a simplified check - in a full implementation, 
  // we might cache playlist info or use YouTube API
  return educationalPatterns.some(pattern => 
    playlistId.toLowerCase().includes(pattern)
  );
}

// Normalize video URL for comparison
function normalizeVideoUrl(url) {
  try {
    const urlObj = new URL(url);
    const videoId = urlObj.searchParams.get('v');
    if (videoId) {
      return `https://www.youtube.com/watch?v=${videoId}`;
    }
    return url;
  } catch (error) {
    return url;
  }
}

// Extract channel path from URL
function extractChannelPath(urlObj) {
  const pathname = urlObj.pathname;
  
  // Handle different YouTube channel URL formats
  if (pathname.startsWith('/c/')) {
    return pathname.substring(3);
  } else if (pathname.startsWith('/channel/')) {
    return pathname.substring(9);
  } else if (pathname.startsWith('/@')) {
    return pathname.substring(2);
  }
  
  return null;
}

// Storage utility functions for whitelist and learning mode
async function getWhitelistChannels() {
  const result = await chrome.storage.sync.get(WHITELIST_CHANNELS_KEY);
  return result[WHITELIST_CHANNELS_KEY] || [];
}

async function getWhitelistVideos() {
  const result = await chrome.storage.sync.get(WHITELIST_VIDEOS_KEY);
  return result[WHITELIST_VIDEOS_KEY] || [];
}

async function getLearningMode() {
  const result = await chrome.storage.sync.get(LEARNING_MODE_KEY);
  return result[LEARNING_MODE_KEY] || DEFAULT_LEARNING_MODE;
}

async function updateWhitelistChannels(channels) {
  await chrome.storage.sync.set({
    [WHITELIST_CHANNELS_KEY]: channels
  });
}

async function updateWhitelistVideos(videos) {
  await chrome.storage.sync.set({
    [WHITELIST_VIDEOS_KEY]: videos
  });
}

async function updateLearningMode(settings) {
  await chrome.storage.sync.set({
    [LEARNING_MODE_KEY]: settings
  });
}
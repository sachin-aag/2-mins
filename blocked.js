// Script for the blocked page

document.addEventListener('DOMContentLoaded', async () => {
  await initializeBlockedPage();
  setupEventListeners();
  startCountdown();
});

// Initialize the blocked page with site info and countdown
async function initializeBlockedPage() {
  try {
    // Get URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const blockedSite = urlParams.get('site');
    
    if (blockedSite) {
      // Parse the blocked site URL
      const url = new URL(blockedSite);
      const siteName = url.hostname + (url.pathname !== '/' ? url.pathname : '');
      
      // Display the blocked site
      document.getElementById('blocked-site').textContent = `🚫 ${siteName}`;
      
      // Get cooldown info from background script
      const blockedSites = await sendMessageToBackground('getBlockedSites');
      const siteConfigs = await sendMessageToBackground('getStatus');
      
      // Find matching site configuration
      const matchingSite = findMatchingSiteConfig(url.hostname, url.pathname, siteConfigs.siteConfigs);
      
      if (matchingSite && blockedSites[matchingSite]) {
        window.blockInfo = {
          site: matchingSite,
          blockedUntil: blockedSites[matchingSite].blockedUntil,
          originalUrl: blockedSite
        };
      }
    }
    
    // Load saved productivity plan if exists
    const savedPlan = localStorage.getItem('productivity-plan-' + window.location.search);
    if (savedPlan) {
      document.getElementById('productivity-plan').value = savedPlan;
    }
  } catch (error) {
    console.error('Error initializing blocked page:', error);
    document.getElementById('blocked-site').textContent = '🚫 Blocked Site';
    document.getElementById('countdown').textContent = 'Site is currently blocked';
  }
}

// Setup event listeners
function setupEventListeners() {
  // Save plan button
  document.getElementById('save-plan').addEventListener('click', savePlan);
  
  // Auto-save plan as user types (debounced)
  let saveTimeout;
  document.getElementById('productivity-plan').addEventListener('input', () => {
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(savePlan, 2000); // Auto-save after 2 seconds of no typing
  });
}

// Save the productivity plan
function savePlan() {
  const plan = document.getElementById('productivity-plan').value.trim();
  const saveBtn = document.getElementById('save-plan');
  const successMsg = document.getElementById('success-message');
  
  if (plan) {
    // Save to localStorage with unique key based on current session
    localStorage.setItem('productivity-plan-' + window.location.search, plan);
    
    // Show success message
    successMsg.style.display = 'block';
    saveBtn.textContent = 'Plan Saved!';
    saveBtn.disabled = true;
    
    // Reset button after 3 seconds
    setTimeout(() => {
      successMsg.style.display = 'none';
      saveBtn.textContent = 'Save My Plan';
      saveBtn.disabled = false;
    }, 3000);
    
    // Optional: Send plan to background script for analytics/logging
    sendMessageToBackground('savePlan', { plan, timestamp: Date.now() });
  }
}

// Start countdown timer
function startCountdown() {
  if (!window.blockInfo) {
    document.getElementById('countdown').textContent = 'Site is temporarily blocked';
    return;
  }
  
  const updateCountdown = () => {
    const now = Date.now();
    const timeRemaining = window.blockInfo.blockedUntil - now;
    
    if (timeRemaining <= 0) {
      // Block period expired, redirect back to original site
      document.getElementById('countdown').textContent = '✅ Cooldown period ended! Redirecting...';
      setTimeout(() => {
        window.location.href = window.blockInfo.originalUrl;
      }, 2000);
      return;
    }
    
    // Format time remaining
    const minutes = Math.floor(timeRemaining / (1000 * 60));
    const seconds = Math.floor((timeRemaining % (1000 * 60)) / 1000);
    
    document.getElementById('countdown').textContent = 
      `⏰ Site will be available in ${minutes}m ${seconds}s`;
  };
  
  // Update immediately and then every second
  updateCountdown();
  setInterval(updateCountdown, 1000);
}

// Find matching site configuration (same logic as background script)
function findMatchingSiteConfig(hostname, pathname, siteConfigs) {
  const matches = [];
  
  for (const site in siteConfigs) {
    const [siteDomain, sitePath] = site.split('/', 2);
    
    const hostnameMatches = hostname === siteDomain || hostname.endsWith('.' + siteDomain);
    
    if (hostnameMatches) {
      if (sitePath) {
        if (pathname.startsWith('/' + sitePath)) {
          matches.push({ site, specificity: 2 });
        }
      } else {
        matches.push({ site, specificity: 1 });
      }
    }
  }
  
  if (matches.length > 0) {
    matches.sort((a, b) => b.specificity - a.specificity);
    return matches[0].site;
  }
  
  return null;
}

// Send message to background script
function sendMessageToBackground(action, data = {}) {
  return new Promise((resolve, reject) => {
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
      chrome.runtime.sendMessage({ action, ...data }, (response) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(response);
        }
      });
    } else {
      // Fallback for testing outside extension context
      resolve({});
    }
  });
}

// Prevent user from navigating away easily
window.addEventListener('beforeunload', (e) => {
  if (window.blockInfo && Date.now() < window.blockInfo.blockedUntil) {
    e.preventDefault();
    e.returnValue = 'The cooldown period is still active. Are you sure you want to leave?';
    return e.returnValue;
  }
});

// Handle back button - redirect to a productive site instead
window.addEventListener('popstate', (e) => {
  if (window.blockInfo && Date.now() < window.blockInfo.blockedUntil) {
    // Redirect to a productive site instead of allowing back navigation
    const productiveSites = [
      'https://www.google.com',
      'https://en.wikipedia.org',
      'https://www.khanacademy.org',
      'https://www.coursera.org',
      'https://github.com'
    ];
    
    const randomSite = productiveSites[Math.floor(Math.random() * productiveSites.length)];
    window.location.href = randomSite;
  }
});
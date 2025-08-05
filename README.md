# 2 mins only - Chrome Extension

A Chrome extension that helps you manage your time on distracting websites by automatically closing tabs after a configurable time limit.

## 🚀 Features

- ⏰ **Automatic Tab Closure**: Set custom time limits (1-120 minutes) for specific websites
- 🎯 **Site-Specific Timers**: Different time limits for different websites
- 🚫 **Cooldown Period**: Block sites for configurable time (5-480 minutes) after timer expires
- 📝 **Productivity Prompts**: Get motivated with goal-setting when sites are blocked
- 📊 **Real-time Monitoring**: See active timers and remaining time in the popup
- 🔄 **Easy Configuration**: Add, edit, or remove sites through a simple interface
- 📱 **Badge Counter**: Shows number of active timers on the extension icon
- 💾 **Sync Storage**: Your configurations sync across devices

## 📋 Default Sites

The extension comes pre-configured with these common distracting websites:

- **YouTube Shorts**: 1 minutes *(specifically for /shorts URLs)*
- **YouTube**: 5 minutes *(regular YouTube content)*
- **Facebook**: 2 minutes  
- **Twitter**: 3 minutes
- **Instagram**: 2 minutes
- **TikTok**: 2 minutes
- **Reddit**: 10 minutes

## 🛠️ Installation

### Option 1: Load as Unpacked Extension (For Development/Testing)

1. **Prepare Icons** (Important):
   - Create PNG icons: 16x16, 32x32, 48x48, and 128x128 pixels
   - Save them in the `icons/` folder as `icon16.png`, `icon32.png`, `icon48.png`, `icon128.png`
   - See `icons/README.md` for detailed instructions

2. **Load Extension**:
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)
   - Click "Load unpacked"
   - Select the folder containing this extension
   - The extension should now appear in your extensions list

3. **Verify Installation**:
   - Look for the extension icon in your Chrome toolbar
   - Click it to open the configuration popup
   - You should see the default sites listed

### Option 2: Chrome Web Store (When Published)
*This extension is not yet published to the Chrome Web Store*

## 🎮 How to Use

### Adding a Website
1. Click the extension icon in your toolbar
2. Enter a website URL (e.g., "youtube.com" or "youtube.com/shorts") 
3. Set the time limit in minutes (1-120)
4. Click "Add Site"

**Pro Tip**: You can specify URL paths for more granular control:
- `youtube.com/shorts` - Only YouTube Shorts (2 min default)
- `youtube.com` - All other YouTube content (5 min default)
- `facebook.com/watch` - Facebook Watch videos
- `twitter.com/explore` - Twitter Explore page

### Managing Sites
- **Edit Timer**: Change the minutes value for any site in the list
- **Remove Site**: Click the "Remove" button next to any site
- **View Active Timers**: See current timers and remaining time at the top of the popup

### How Timers Work
1. When you visit a configured website, a timer starts automatically
2. The extension badge shows the number of active timers
3. If you're still on the site when the timer expires, the tab closes automatically
4. **NEW**: After closure, the site enters a cooldown period (default: 1 hour)
5. During cooldown, attempts to visit the site redirect to a productivity page
6. You can set goals and plans during the cooldown period
7. Switching tabs or navigating away pauses the timer for that site

## 🔧 Technical Details

### Files Structure
```
chrome-extension/
├── manifest.json          # Extension configuration
├── background.js           # Service worker (timer management & blocking)
├── popup.html             # Configuration interface
├── popup.js               # Popup functionality  
├── popup.css              # Popup styling
├── blocked.html           # Cooldown/blocked page
├── blocked.js             # Blocked page functionality
├── options.html           # Extended options page
├── icons/                 # Extension icons
│   ├── icon16.png
│   ├── icon32.png  
│   ├── icon48.png
│   └── icon128.png
├── svg/                   # SVG source icon
│   └── icon.svg
└── README.md              # This file
```

### Permissions Used
- `tabs`: Monitor and close tabs
- `storage`: Save site configurations
- `activeTab`: Access current tab information
- `alarms`: Set timers for automatic tab closure
- `<all_urls>`: Monitor navigation to any website

### Storage
- **Sync Storage**: Site configurations (syncs across devices)
- **Local Storage**: Active timer data (session-specific)

## 🐛 Troubleshooting

### Extension Not Working
1. Check that the extension is enabled in `chrome://extensions/`
2. Verify all icon files are present in the `icons/` folder
3. Look for errors in the extension's background page console

### Timers Not Starting
1. Make sure the website URL matches your configuration
2. The extension matches domains and subdomains (youtube.com matches www.youtube.com)
3. Try refreshing the page after adding a new site

### Tabs Not Closing
1. Pinned tabs cannot be closed by extensions for security reasons
2. Check if you have multiple tabs open for the same site
3. The timer only closes tabs if you're still on the monitored site

## 🔒 Privacy

- All data is stored locally in Chrome's storage
- No data is sent to external servers
- The extension only monitors websites you explicitly configure
- Source code is open for inspection

## 🎯 Tips for Best Results

1. **Start Small**: Begin with 2-5 minute limits and adjust based on your needs
2. **Be Specific**: Add the exact domains you want to monitor
3. **Monitor Progress**: Check the badge counter to see active timers
4. **Regular Review**: Periodically review and adjust your site list

## 🚧 Development

### Making Changes
1. Edit the source files
2. Go to `chrome://extensions/`
3. Click the refresh button on your extension
4. Test your changes

### Debugging
- Background script: Right-click extension → "Inspect views: background page"
- Popup: Right-click extension popup → "Inspect"
- Check browser console for errors

## 📝 Version History

### v1.0.0
- Initial release
- Basic timer functionality
- Popup configuration interface
- Default site presets
- Badge counter
- Chrome sync storage

## 🤝 Contributing

Feel free to submit issues, feature requests, or pull requests to improve this extension.

## 📄 License

This project is open source. Feel free to use, modify, and distribute as needed.

---

**Happy browsing! 🎉**

*Remember: The goal isn't to never visit these sites, but to be more mindful of the time you spend on them.*
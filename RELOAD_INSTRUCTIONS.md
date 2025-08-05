# How to Reload the Extension to See YouTube Shorts

## Steps to Update Your Extension:

1. **Open Chrome Extensions Page**:
   - Go to `chrome://extensions/`
   - Or click the puzzle piece icon → "Manage extensions"

2. **Find Your Extension**:
   - Look for "2 mins only" in the list

3. **Reload the Extension**:
   - Click the **circular reload/refresh button** on your extension card
   - This will trigger the `onInstalled` event and merge the new YouTube Shorts configuration

4. **Verify the Update**:
   - Click the extension icon to open the popup
   - You should now see both:
     - `youtube.com/shorts` (1 minute)
     - `youtube.com` (5 minutes)

## Alternative Method (Complete Reinstall):

If the reload doesn't work:

1. **Remove Extension**:
   - Click "Remove" on the extension card
   
2. **Reload Extension**:
   - Click "Load unpacked" again
   - Select your extension folder
   
3. **Check Popup**:
   - The popup should now show YouTube Shorts in the site list

## What This Fixes:

- The extension now properly merges new default sites with existing configurations
- YouTube Shorts (`youtube.com/shorts`) will appear in your site list
- Future updates will automatically add new default sites without overriding your custom settings

## Test It:

After reloading, try visiting:
- `youtube.com/shorts/[any-video]` → Should start 1-minute timer
- `youtube.com/watch?v=[any-video]` → Should start 5-minute timer
# Debug Instructions for Extension Issues

## 🔧 **Step-by-Step Debugging**

### **1. Reload the Extension**
1. Go to `chrome://extensions/`
2. Find "2 mins only" extension
3. Click the **reload** button ↻

### **2. Check Background Script Console**
1. On the extension card, click **"service worker"** (or "background page")
2. This opens the background script console
3. Look for any error messages in red

### **3. Check Popup Console**
1. **Right-click** the extension icon in toolbar
2. Select **"Inspect popup"**
3. This opens the popup developer tools
4. Go to the **Console** tab

### **4. Test Add Site Functionality**
1. With popup console open, try adding a site:
   - Enter: `facebook.com`
   - Minutes: `3`
   - Click "Add Site"

2. You should see these console logs:
   ```
   Popup DOM loaded
   Setting up event listeners
   Popup initialized successfully
   handleAddSite called
   Site: facebook.com Minutes: 3
   Clean site: facebook.com
   Sending message to background
   Sending message: updateSiteConfig {site: "facebook.com", minutes: 3}
   Background response: {success: true}
   Refreshing display
   ```

### **5. Test Options Button**
1. With popup console open, click "More Options"
2. You should see:
   ```
   Options button clicked
   Using chrome.runtime.openOptionsPage (or Using chrome.tabs.create)
   ```

## 🚨 **Common Issues & Solutions**

### **Issue: No console logs appear**
**Solution:** The popup script isn't loading
- Check if popup.js is included in popup.html
- Check for JavaScript syntax errors

### **Issue: "handleAddSite called" but stops there**
**Solution:** Input elements not found
- The HTML structure might be corrupted
- Try reloading the extension

### **Issue: "Runtime error" in console**
**Solution:** Background script not responding
- Check background script console for errors
- Background script might have crashed

### **Issue: Options button logs but nothing happens**
**Solution:** Options page permissions
- Try right-clicking extension → "Options" instead
- Check if options.html exists

## 🛠️ **Quick Fixes**

### **Fix 1: Reset Extension**
1. Remove extension completely
2. Reload as unpacked extension
3. Test again

### **Fix 2: Check File Permissions**
Make sure all files are readable:
```bash
ls -la *.html *.js *.json
```

### **Fix 3: Minimal Test**
Try adding just one simple site like "test.com" with 5 minutes to see if basic functionality works.

## 📝 **What to Report Back**

Please share:
1. **Background console errors** (if any)
2. **Popup console logs** when trying to add a site
3. **Popup console logs** when clicking options button
4. **Any specific error messages** you see

This will help me identify the exact issue and provide a targeted fix!
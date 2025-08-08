# Publishing to Chrome Web Store — 2 mins only

Follow this checklist to publish or update.

## 1) Prepare assets
- Icons (already present): 16, 32, 48, 128 px PNG in `icons/`
- Screenshots (1280×800 or 640×400) — capture:
  - Popup (active timers + site list)
  - Blocked page (focus plan + countdown)
  - Options page
- Optional promo video (YouTube URL)

## 2) Review metadata
- `manifest.json` — name, description, icons, permissions
- `README.md` — updated features and behavior
- `PRIVACY_POLICY.md` — host somewhere public or link to repo
- `STORE_LISTING.md` — copy/paste into store listing

## 3) Package the extension
1. Ensure no dev-only files are included (current repo is fine)
2. Create a ZIP of the folder contents (files at root, not nested):
   - On macOS:
     - Right-click the `chrome extension` folder → Compress “chrome extension”
     - This produces `chrome extension.zip` — rename to `2-mins-only.zip`
   - Or via terminal from the parent directory:
     - `zip -r 2-mins-only.zip "chrome extension"`

Note: The ZIP should contain `manifest.json` at the top level of the ZIP (inside the folder you zipped). Do not zip the files individually at root without the folder.

## 4) Create developer account (if new)
- Go to `https://chrome.google.com/webstore/devconsole`
- Pay the one-time developer registration fee

## 5) Create a new item
- Click “Add new item” → “Choose file” → upload `2-mins-only.zip`
- Fill out listing using `STORE_LISTING.md` content
- Add screenshots and set category: Productivity
- Add privacy policy URL
- Set regions/languages (start with English worldwide)

## 6) Declare permissions and data usage
- Justify permissions clearly (use the “Permissions rationale” section from `STORE_LISTING.md`)
- Data usage: select “does not collect or use user data” (since all storage is local)

## 7) Content rating & compliance
- Complete content rating questionnaire
- Confirm compliance with User Data and Limited Use policies

## 8) Submit for review
- Save draft → Submit for review
- Typical review time: a few days (varies)

## 9) Post-approval
- Share the Web Store URL in README (Option 2 install)
- Tag a release in your repo

## Updates
- Increment `version` in `manifest.json`
- Rebuild ZIP and upload as a new version
- Provide release notes in the store dashboard

## Support & feedback
- Add a support email in the store dashboard
- Consider adding a link to issue tracker or feedback form
# Privacy Policy — 2 mins only

Effective date: 2025-08-08

We take your privacy seriously. This extension operates entirely in your browser and does not collect, transmit, or sell personal data.

What the extension does
- Stores your site time limits, whitelist, and settings using Chrome Storage (Sync/Local). This data may sync across devices via your Google account if you enable Chrome Sync.
- Monitors the active tab URL locally to start/stop timers and to perform redirects when time is up or during cooldown.
- Optionally saves the productivity plan you enter on the blocked page in local storage on your device.

What the extension does NOT do
- Does not collect or transmit any browsing data to external servers.
- Does not use analytics, tracking pixels, or third-party SDKs.
- Does not read or modify page content beyond what is necessary to determine the current URL for timer logic.

Permissions rationale
- tabs: Needed to detect the current tab URL and update the tab to the plan page when time expires.
- storage: Needed to save your configuration and cooldown state.
- activeTab: Allows limited access to the current tab for timer logic.
- alarms: Used to schedule timer expirations.
- <all_urls>: Required to detect navigation across sites you configure and to ensure redirects work reliably.

Data retention
- Timers are stored in session (local) storage and cleared when the browser restarts.
- Site configurations are stored in Chrome Sync storage until you remove the extension or clear data.
- Productivity plans are saved locally in your browser storage and can be cleared by removing site data.

Contact
If you have privacy questions, contact the developer via the Chrome Web Store listing support contact.

Changes to this policy
We may update this policy. Material changes will be reflected in this document with an updated effective date.


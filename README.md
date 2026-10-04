# GST Returns Downloader Chrome Extension

This project is a starter Chrome extension for automating GST return downloads after the user is logged into the official GST portal.

Important: the GST portal may change its labels, selectors, or page flow across time. This extension is intentionally written as a resilient starter scraper and can be adjusted for your specific GST portal version.

## Features

- Download GST returns by financial year or month
- Supports return types such as GSTR-1, GSTR-3B, GSTR-9, and common GST return pages
- Stores last-used values in Chrome storage
- Opens the GST portal directly from the extension popup
- Attempts to trigger downloads from visible GST return links and buttons

## How this works

1. Open the extension popup.
2. Enter your GSTIN.
3. Select the return type and financial year.
4. Choose the month or all months.
5. Click Download Returns.
6. Log in to the GST portal if required.
7. The scraper will navigate the page based on visible text labels and try to trigger the relevant download.

## Install in Chrome

1. Download this project locally.
2. Open Chrome and visit `chrome://extensions`.
3. Turn on Developer mode.
4. Click Load unpacked.
5. Select this project directory.
6. The GST Returns Downloader extension is now installed.

## Notes for production use

- Use this only for your own authenticated GST portal access.
- The actual GST page DOM can differ from one business portal version to another.
- You may need to update selector strings in `content.js` for your exact GST portal layout.
- Some GST downloads may require browser interaction, manual review, or additional automation logic.

## Project structure

```text
.
├── manifest.json
├── popup.html
├── popup.css
├── popup.js
├── background.js
├── content.js
├── package.json
└── README.md
```

## Validate syntax

```bash
npm run validate
```

## Disclaimer

This tool is meant to automate the user’s own GST portal workflow and is not a public scraping service. The user is responsible for complying with portal terms, access rules, and any tax filing requirements in their jurisdiction.

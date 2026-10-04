const GST_PORTAL_URL = 'https://www.gst.gov.in/';

async function ensureGSTTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab || !tab.url) {
    return await chrome.tabs.create({ url: GST_PORTAL_URL });
  }

  const normalizedUrl = tab.url.toLowerCase();
  const isGSTUrl = normalizedUrl.includes('gst.gov.in') || normalizedUrl.includes('gstportal.gov.in');

  if (!isGSTUrl) {
    return await chrome.tabs.create({ url: GST_PORTAL_URL });
  }

  return tab;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'openPortal') {
    chrome.tabs.create({ url: GST_PORTAL_URL });
    sendResponse({ ok: true });
    return true;
  }

  if (message.type === 'startDownload') {
    (async () => {
      const tab = await ensureGSTTab();
      if (tab && tab.id) {
        chrome.tabs.sendMessage(tab.id, {
          type: 'start-download',
          payload: message.payload,
        });
      }
      sendResponse({ ok: true });
    })();

    return true;
  }

  return false;
});

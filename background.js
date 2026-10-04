const GST_PORTAL_URL = 'https://www.gst.gov.in/';
const EWAY_PORTAL_URL = 'https://ewaybillgst.gov.in/';
const EINVOICE_PORTAL_URL = 'https://einvoice1.gst.gov.in/';
const PORTAL_URLS = {
  gst: GST_PORTAL_URL,
  eway: EWAY_PORTAL_URL,
  einvoice: EINVOICE_PORTAL_URL,
};

async function ensurePortalTab(portalKey) {
  const targetUrl = PORTAL_URLS[portalKey] || GST_PORTAL_URL;
  const tabs = await chrome.tabs.query({ url: `${new URL(targetUrl).origin}/*` });

  if (tabs && tabs.length > 0) {
    return tabs[0];
  }

  return await chrome.tabs.create({ url: targetUrl });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'openPortal') {
    const portalKey = message.portal || 'gst';
    const targetUrl = PORTAL_URLS[portalKey] || GST_PORTAL_URL;
    chrome.tabs.create({ url: targetUrl });
    sendResponse({ ok: true });
    return true;
  }

  if (message.type === 'startDownload') {
    (async () => {
      const tab = await ensurePortalTab('gst');
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

  if (message.type === 'download-file') {
    chrome.downloads.download({
      url: message.url,
      filename: message.filename,
      saveAs: false,
    });
    sendResponse({ ok: true });
    return true;
  }

  if (message.type === 'openEwayPortal') {
    chrome.tabs.create({ url: EWAY_PORTAL_URL });
    sendResponse({ ok: true });
    return true;
  }

  if (message.type === 'openEinvoicePortal') {
    chrome.tabs.create({ url: EINVOICE_PORTAL_URL });
    sendResponse({ ok: true });
    return true;
  }

  return false;
});

const GST_PORTAL_URL = 'https://www.gst.gov.in/';

const form = document.getElementById('gst-form');
const statusBox = document.getElementById('status');

const openPortalBtn = document.getElementById('openPortalBtn');
const gstinInput = document.getElementById('gstin');
const returnTypeSelect = document.getElementById('returnType');
const fiscalYearSelect = document.getElementById('fiscalYear');
const monthSelect = document.getElementById('month');

function setStatus(message) {
  statusBox.textContent = message;
}

function saveFormState() {
  const state = {
    gstin: gstinInput.value.trim(),
    returnType: returnTypeSelect.value,
    fiscalYear: fiscalYearSelect.value,
    month: monthSelect.value,
  };
  chrome.storage.local.set({ gstReturnsDownloader: state });
}

function loadFormState() {
  chrome.storage.local.get(['gstReturnsDownloader'], (result) => {
    const state = result.gstReturnsDownloader ?? {};
    if (state.gstin) gstinInput.value = state.gstin;
    if (state.returnType) returnTypeSelect.value = state.returnType;
    if (state.fiscalYear) fiscalYearSelect.value = state.fiscalYear;
    if (state.month) monthSelect.value = state.month;
  });
}

openPortalBtn.addEventListener('click', async () => {
  setStatus('Opening GST portal...');
  try {
    await chrome.runtime.sendMessage({ type: 'openPortal' });
  } catch (error) {
    console.error('Failed to open portal', error);
    setStatus('Could not open GST portal. Check extension permissions and try again.');
  }
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const gstin = gstinInput.value.trim();

  if (!gstin || gstin.length < 15) {
    setStatus('Please enter a valid GSTIN before downloading returns.');
    gstinInput.focus();
    return;
  }

  const payload = {
    gstin,
    returnType: returnTypeSelect.value,
    fiscalYear: fiscalYearSelect.value,
    month: monthSelect.value,
  };

  saveFormState();
  setStatus('Starting GST return download workflow...');

  try {
    await chrome.runtime.sendMessage({ type: 'startDownload', payload });
  } catch (error) {
    console.error('Download action failed', error);
    setStatus('Could not start the GST scraper. Open the GST portal and log in, then retry.');
  }
});

loadFormState();

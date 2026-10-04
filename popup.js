const GST_PORTAL_URL = 'https://www.gst.gov.in/';
const EWAY_PORTAL_URL = 'https://ewaybillgst.gov.in/';
const EINVOICE_PORTAL_URL = 'https://einvoice1.gst.gov.in/';

const form = document.getElementById('gst-form');
const statusBox = document.getElementById('status');
const bulkStatusBox = document.getElementById('bulk-status');

const gstinInput = document.getElementById('gstin');
const returnTypeSelect = document.getElementById('returnType');
const fiscalYearSelect = document.getElementById('fiscalYear');
const monthSelect = document.getElementById('month');

function setStatus(message) {
  if (statusBox) {
    statusBox.textContent = message;
  }
}

function saveFormState() {
  const state = {
    gstin: gstinInput?.value.trim() || '',
    returnType: returnTypeSelect?.value || '',
    fiscalYear: fiscalYearSelect?.value || '',
    month: monthSelect?.value || '',
  };
  chrome.storage.local.set({ gstReturnsDownloader: state });
}

function loadFormState() {
  chrome.storage.local.get(['gstReturnsDownloader'], (result) => {
    const state = result.gstReturnsDownloader ?? {};
    if (state.gstin && gstinInput) gstinInput.value = state.gstin;
    if (state.returnType && returnTypeSelect) returnTypeSelect.value = state.returnType;
    if (state.fiscalYear && fiscalYearSelect) fiscalYearSelect.value = state.fiscalYear;
    if (state.month && monthSelect) monthSelect.value = state.month;
  });
}

function openPortal(portalKey = 'gst') {
  const targetUrl = {
    gst: GST_PORTAL_URL,
    eway: EWAY_PORTAL_URL,
    einvoice: EINVOICE_PORTAL_URL,
  }[portalKey] || GST_PORTAL_URL;

  setStatus(`Opening ${portalKey.toUpperCase()} portal...`);

  chrome.tabs.create({ url: targetUrl }, () => {
    setStatus(`Opened ${portalKey.toUpperCase()} portal. Log in and continue.`);
  });
}

function attachTabHandlers() {
  document.querySelectorAll('.tab-button').forEach((button) => {
    button.addEventListener('click', () => {
      document.querySelectorAll('.tab-button').forEach((btn) => btn.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach((tab) => tab.classList.remove('active'));
      button.classList.add('active');
      const tabId = `${button.dataset.tab}-tab`;
      const currentTab = document.getElementById(tabId);
      if (currentTab) currentTab.classList.add('active');
      chrome.storage.local.set({ activePortalTab: button.dataset.tab });
    });
  });

  chrome.storage.local.get(['activePortalTab'], (result) => {
    const savedTab = result.activePortalTab || 'gst';
    const savedButton = document.querySelector(`.tab-button[data-tab="${savedTab}"]`);
    if (savedButton) savedButton.click();
  });
}

async function openGSTPortal() {
  try {
    await chrome.runtime.sendMessage({ type: 'openPortal', portal: 'gst' });
  } catch (error) {
    console.error('Failed to open GST portal', error);
    setStatus('Could not open the GST portal. Check extension permissions and try again.');
  }
}

async function openEwayPortal() {
  try {
    await chrome.runtime.sendMessage({ type: 'openEwayPortal' });
  } catch (error) {
    console.error('Failed to open e-Way portal', error);
    setStatus('Could not open the e-Way Bill portal. Check extension permissions and try again.');
  }
}

async function openEinvoicePortal() {
  try {
    await chrome.runtime.sendMessage({ type: 'openEinvoicePortal' });
  } catch (error) {
    console.error('Failed to open e-Invoice portal', error);
    setStatus('Could not open the e-Invoice portal. Check extension permissions and try again.');
  }
}

if (document.getElementById('openGSTBtn')) {
  document.getElementById('openGSTBtn').addEventListener('click', openGSTPortal);
}
if (document.getElementById('openGSTBtn2')) {
  document.getElementById('openGSTBtn2').addEventListener('click', openGSTPortal);
}
if (document.getElementById('openEwayBtn')) {
  document.getElementById('openEwayBtn').addEventListener('click', openEwayPortal);
}
if (document.getElementById('openEinvoiceBtn')) {
  document.getElementById('openEinvoiceBtn').addEventListener('click', openEinvoicePortal);
}

const ledgerFilterType = document.getElementById('ledgerFilterType');
const ledgerFilterOptions = document.getElementById('ledger-filter-options');
const ledgerMonthLabel = document.getElementById('ledger-month-label');
const ledgerYearLabel = document.getElementById('ledger-year-label');
const ledgerFyLabel = document.getElementById('ledger-fy-label');

ledgerFilterType?.addEventListener('change', () => {
  const mode = ledgerFilterType.value;
  ledgerFilterOptions.style.display = mode !== 'all' ? 'block' : 'none';
  ledgerMonthLabel.style.display = mode === 'monthly' ? 'block' : 'none';
  ledgerYearLabel.style.display = mode === 'monthly' ? 'block' : 'none';
  ledgerFyLabel.style.display = mode === 'financial' ? 'block' : 'none';
});

const ewayFilterType = document.getElementById('ewayFilterType');
const ewayFilterOptions = document.getElementById('eway-filter-options');
const ewayMonthLabel = document.getElementById('eway-month-label');
const ewayFyLabel = document.getElementById('eway-fy-label');

ewayFilterType?.addEventListener('change', () => {
  const mode = ewayFilterType.value;
  ewayFilterOptions.style.display = mode !== 'all' ? 'block' : 'none';
  ewayMonthLabel.style.display = mode === 'monthly' ? 'block' : 'none';
  ewayFyLabel.style.display = mode === 'financial' ? 'block' : 'none';
});

const invoiceFilterType = document.getElementById('einvoiceFilterType');
const invoiceFilterOptions = document.getElementById('einvoice-filter-options');
const invoiceMonthLabel = document.getElementById('einvoice-month-label');
const invoiceFyLabel = document.getElementById('einvoice-fy-label');

invoiceFilterType?.addEventListener('change', () => {
  const mode = invoiceFilterType.value;
  invoiceFilterOptions.style.display = mode !== 'all' ? 'block' : 'none';
  invoiceMonthLabel.style.display = mode === 'monthly' ? 'block' : 'none';
  invoiceFyLabel.style.display = mode === 'financial' ? 'block' : 'none';
});

if (form) {
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
      setStatus('Could not start the GST workflow. Open the portal and log in, then retry.');
    }
  });
}

document.getElementById('downloadLedgerBtn')?.addEventListener('click', () => {
  const ledgerType = document.getElementById('ledgerType')?.value;
  if (!ledgerType) {
    setStatus('Please select a ledger type first.');
    return;
  }
  setStatus(`Prepared ledger export for: ${ledgerType}. Open the GST portal and log in if needed.`);
});

document.getElementById('generateEwayBtn')?.addEventListener('click', () => {
  setStatus('Preparing e-Way Bill generation flow...');
});

document.getElementById('downloadEwayOneByOne')?.addEventListener('click', () => {
  setStatus('Preparing one-by-one e-Way Bill report download...');
});

document.getElementById('downloadEwayBulk')?.addEventListener('click', () => {
  setStatus('Preparing bulk e-Way Bill report download...');
});

document.getElementById('generateEinvoiceBtn')?.addEventListener('click', () => {
  setStatus('Preparing e-Invoice generation flow...');
});

document.getElementById('downloadEinvoiceOneByOne')?.addEventListener('click', () => {
  setStatus('Preparing one-by-one e-Invoice report download...');
});

document.getElementById('downloadEinvoiceBulk')?.addEventListener('click', () => {
  setStatus('Preparing bulk e-Invoice report download...');
});

document.getElementById('bulkDownloadBtn')?.addEventListener('click', async () => {
  setStatus('Checking GST, e-Way Bill, and e-Invoice portals...');

  if (bulkStatusBox) {
    bulkStatusBox.classList.add('active');
    bulkStatusBox.innerHTML = `
      <div class="status-item"><span class="icon">⏳</span>Checking GST portal...</div>
      <div class="status-item"><span class="icon">⏳</span>Checking e-Way Bill portal...</div>
      <div class="status-item"><span class="icon">⏳</span>Checking e-Invoice portal...</div>
    `;
  }

  try {
    const gstTabs = await chrome.tabs.query({ url: '*://*.gst.gov.in/*' });
    const ewayTabs = await chrome.tabs.query({ url: '*://ewaybillgst.gov.in/*' });
    const invoiceTabs = await chrome.tabs.query({ url: '*://einvoice1.gst.gov.in/*' });

    const statusRows = [
      gstTabs.length ? 'GST portal detected' : 'GST portal not open',
      ewayTabs.length ? 'e-Way Bill portal detected' : 'e-Way Bill portal not open',
      invoiceTabs.length ? 'e-Invoice portal detected' : 'e-Invoice portal not open',
    ];

    setStatus(statusRows.join(' • '));

    if (bulkStatusBox) {
      bulkStatusBox.innerHTML = statusRows
        .map((item) => `<div class="status-item"><span class="icon">${item.includes('not open') ? '⚠️' : '✅'}</span>${item}</div>`)
        .join('');
    }
  } catch (error) {
    console.error('Bulk portal check failed', error);
    setStatus('Bulk check failed. Try again after opening the portals.');
  }
});

document.querySelectorAll('.service-link').forEach((button) => {
  button.addEventListener('click', () => {
    const service = button.dataset.service || 'service';
    setStatus(`Service selected: ${service}. Open the GST portal and use the relevant service page.`);
  });
});

attachTabHandlers();
loadFormState();
setStatus('Ready. Log in to the GST, e-Way Bill, or e-Invoice portal and use the tabs above.');

const DEFAULT_PAYLOAD = {
  gstin: '',
  returnType: 'GSTR-3B',
  fiscalYear: '2024-25',
  month: 'All',
};

function normalizeText(value) {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function showStatus(message) {
  const statusEl = document.createElement('div');
  statusEl.id = 'gst-scraper-status';
  statusEl.style.position = 'fixed';
  statusEl.style.right = '16px';
  statusEl.style.bottom = '16px';
  statusEl.style.zIndex = '999999';
  statusEl.style.padding = '10px 12px';
  statusEl.style.background = '#0f172a';
  statusEl.style.color = '#ffffff';
  statusEl.style.fontSize = '12px';
  statusEl.style.fontFamily = 'Arial, sans-serif';
  statusEl.style.borderRadius = '8px';
  statusEl.style.boxShadow = '0 8px 18px rgba(0,0,0,0.2)';
  statusEl.textContent = message;

  const existing = document.getElementById('gst-scraper-status');
  if (existing) {
    existing.remove();
  }

  document.body.appendChild(statusEl);
}

function findElementByText(labels) {
  const candidates = Array.from(document.querySelectorAll('button, a, span, div, label, li, option, input, select'));

  for (const node of candidates) {
    const text = normalizeText(node.textContent || node.value || node.innerText || '');
    if (labels.some((label) => text.includes(normalizeText(label)))) {
      return node;
    }
  }

  return null;
}

function clickElement(node) {
  if (!node) return false;

  try {
    node.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
  } catch (error) {
    console.warn('Could not dispatch click event', error);
  }

  if (typeof node.click === 'function') {
    node.click();
  }

  return true;
}

function wait(ms = 400) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getMonthKeyword(monthValue) {
  if (monthValue === 'All') return null;
  return monthValue.toLowerCase();
}

function findDownloadLink(targetText) {
  const links = Array.from(document.querySelectorAll('a, button, input[type="button"], input[type="submit"]'));

  for (const link of links) {
    const text = normalizeText(link.textContent || link.value || link.innerText || '');
    if (!text) continue;

    if (text.includes(normalizeText(targetText))) {
      return link;
    }
  }

  return null;
}

async function attemptDownloadFromVisibleLinks(fileNamePrefix) {
  const possibleTargets = ['download', 'download pdf', 'download file', 'download return', 'view', 'export'];

  for (const target of possibleTargets) {
    const link = findDownloadLink(target);
    if (link) {
      const href = link.href || link.getAttribute('data-url') || link.getAttribute('data-href');
      if (href) {
        const filename = `${fileNamePrefix}-${Date.now()}.pdf`;
        try {
          chrome.downloads.download({ url: href, filename, saveAs: false });
          showStatus(`Download triggered for ${fileNamePrefix}.`);
          return true;
        } catch (error) {
          console.warn('chrome.downloads failed, falling back to click behaviour.', error);
        }
      }

      clickElement(link);
      showStatus(`Opened download action for ${fileNamePrefix}.`);
      return true;
    }
  }

  return false;
}

async function selectDropdownValue(label, value) {
  const selector = Array.from(document.querySelectorAll('select'))
    .find((selectEl) => normalizeText(selectEl.innerText || selectEl.name || selectEl.id || '').includes(normalizeText(label)) ||
      Array.from(selectEl.options).some((opt) => normalizeText(opt.textContent).includes(normalizeText(value))));

  if (!selector) {
    const option = Array.from(document.querySelectorAll('option')).find((opt) => normalizeText(opt.textContent).includes(normalizeText(value)));
    if (option) {
      option.selected = true;
      option.parentElement.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    }
    return false;
  }

  const option = Array.from(selector.options).find((opt) => normalizeText(opt.textContent).includes(normalizeText(value)));
  if (option) {
    selector.value = option.value;
    selector.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }

  return false;
}

async function ensureReturnDashboard(payload) {
  const targetLabels = ['returns', 'return filing', 'return dashboard', 'file returns'];

  for (const label of targetLabels) {
    const match = findElementByText([label]);
    if (match) {
      clickElement(match);
      await wait(1200);
      return true;
    }
  }

  return false;
}

async function chooseReturnType(returnType) {
  const typeCandidates = [returnType, returnType.replace('-', ' ')];
  const match = findElementByText(typeCandidates);
  if (match) {
    clickElement(match);
    await wait(1200);
    return true;
  }

  return await selectDropdownValue('return type', returnType);
}

async function chooseFinancialYear(fiscalYear) {
  const targets = [fiscalYear, fiscalYear.replace('-', ' '), fiscalYear.replace('-', '')];
  const match = findElementByText(targets);
  if (match) {
    clickElement(match);
    await wait(1000);
    return true;
  }

  return await selectDropdownValue('financial year', fiscalYear);
}

async function chooseMonth(monthName) {
  if (!monthName || monthName === 'All') return true;

  const monthCandidates = [monthName, monthName.toLowerCase(), monthName.toUpperCase()];
  const match = findElementByText(monthCandidates);
  if (match) {
    clickElement(match);
    await wait(1000);
    return true;
  }

  return await selectDropdownValue('month', monthName);
}

async function triggerReturnDownload(payload) {
  const monthKeyword = getMonthKeyword(payload.month);
  const filePrefix = `${payload.gstin}-${payload.returnType}-${payload.fiscalYear}${monthKeyword ? `-${monthKeyword}` : ''}`;

  await wait(800);

  if (monthKeyword) {
    const monthMatch = findElementByText([monthKeyword, monthKeyword.replace('-', ' ')]);
    if (monthMatch) {
      clickElement(monthMatch);
      await wait(1200);
    }
  }

  const visibleDownload = await attemptDownloadFromVisibleLinks(filePrefix);
  if (visibleDownload) return true;

  const genericDownloadButton = findElementByText(['download', 'download return', 'download pdf']);
  if (genericDownloadButton) {
    clickElement(genericDownloadButton);
    showStatus(`Triggered download for the selected GST return.`);
    return true;
  }

  showStatus('No visible download action found. Please verify the GST portal has the return file visible.');
  return false;
}

async function executeScrape(payload) {
  const normalizedPayload = { ...DEFAULT_PAYLOAD, ...payload };
  showStatus('GST scraper started...');

  if (!normalizedPayload.gstin) {
    showStatus('GSTIN missing. Please enter your GSTIN in the popup.');
    return;
  }

  await wait(500);
  await ensureReturnDashboard(normalizedPayload);
  await wait(800);

  const returnTypeResult = await chooseReturnType(normalizedPayload.returnType);
  if (!returnTypeResult) {
    showStatus('Return type option was not found on this GST page.');
    return;
  }

  const yearResult = await chooseFinancialYear(normalizedPayload.fiscalYear);
  if (!yearResult) {
    showStatus('Financial year selection was not found on this page.');
    return;
  }

  const monthResult = await chooseMonth(normalizedPayload.month);
  if (!monthResult) {
    showStatus('Month selection was not found on this page.');
    return;
  }

  await triggerReturnDownload(normalizedPayload);
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'start-download') {
    executeScrape(message.payload ?? DEFAULT_PAYLOAD);
    sendResponse({ ok: true });
    return true;
  }

  return false;
});

showStatus('GST scraper ready. Use the popup to start downloading returns.');

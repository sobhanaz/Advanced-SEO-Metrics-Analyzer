// TECSO SEO Checker - Popup script (MV3 CSP-safe)
// Renders UI, requests analysis from content/background scripts, and displays results.

let analysisResult = null;

// Settings helpers
function getDefaultSettings() {
  return {
    checkOnPage: true,
    checkTechnical: true,
    checkContent: true,
    checkOffPage: true,
  };
}

function getSettings() {
  return new Promise((resolve) => {
    try {
      chrome.storage.local.get(['seoSettings'], (result) => {
        const settings = result && result.seoSettings ? result.seoSettings : getDefaultSettings();
        resolve(settings);
      });
    } catch (_) {
      resolve(getDefaultSettings());
    }
  });
}

// DOM utility
function createElement(tag, options = {}) {
  const element = document.createElement(tag);
  if (options.className) element.className = options.className;
  if (options.textContent) element.textContent = options.textContent;
  if (options.innerHTML) element.innerHTML = options.innerHTML;
  if (options.onclick) element.onclick = options.onclick;
  if (options.disabled) element.disabled = options.disabled;
  return element;
}

function formatScore(score) {
  return Math.round(score);
}

function getScoreColor(score) {
  if (score >= 90) return '#4ade80';
  if (score >= 70) return '#facc15';
  if (score >= 50) return '#fb923c';
  return '#ef4444';
}

function scoreFromCounts({ good = 0, warnings = 0, errors = 0 }) {
  // Simple scoring: start at 100, subtract penalties and add tiny bonus for good
  const penalties = errors * 15 + warnings * 5;
  return Math.max(0, Math.min(100, 100 - penalties + Math.min(good, 10)));
}

function computeScores(rawResults) {
  const map = {
    'On-Page SEO': rawResults.onPage,
    'Technical SEO': rawResults.technical,
    'Content Quality': rawResults.content,
    'Off-Page SEO': rawResults.offPage,
  };

  const categories = {};
  Object.entries(map).forEach(([name, data]) => {
    const counts = {
      good: (data && data.good ? data.good.length : 0),
      warnings: (data && data.warnings ? data.warnings.length : 0),
      errors: (data && data.errors ? data.errors.length : 0),
    };
    categories[name] = {
      score: scoreFromCounts(counts),
      counts,
      details: data || { good: [], warnings: [], errors: [] },
    };
  });

  const overallScore = Math.round(
    Object.values(categories).reduce((acc, c) => acc + c.score, 0) / Math.max(1, Object.keys(categories).length)
  );

  return { overallScore, categories };
}

function createScoreCircle(score, size = 60) {
  const circle = createElement('div', { className: 'score-circle' });
  circle.style.cssText = `
    width: ${size}px;
    height: ${size}px;
    border-radius: 50%;
    background: conic-gradient(${getScoreColor(score)} ${score * 3.6}deg, #1f2937 0deg);
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
  `;
  const innerCircle = createElement('div', { textContent: String(formatScore(score)) });
  innerCircle.style.cssText = `
    width: ${size - 8}px;
    height: ${size - 8}px;
    border-radius: 50%;
    background: #111827;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: bold;
    font-size: ${size * 0.3}px;
    color: white;
  `;
  circle.appendChild(innerCircle);
  return circle;
}

function renderResults(analysis) {
  const content = document.querySelector('.app-content');
  if (!content) return;

  content.innerHTML = '';

  // Header
  const header = createElement('div');
  header.style.cssText = 'text-align:center; margin-bottom:16px; padding:16px; background:#1f2937; border:1px solid #374151; border-radius:8px;';
  const title = createElement('div', { textContent: 'SEO Analysis Results' });
  title.style.cssText = 'font-weight:600; margin-bottom:12px;';
  const circle = createScoreCircle(analysis.overallScore, 72);
  const label = createElement('div', { textContent: 'Overall Score' });
  label.style.cssText = 'color:#9ca3af; margin-top:8px; font-size:14px;';
  header.appendChild(title);
  header.appendChild(circle);
  header.appendChild(label);
  content.appendChild(header);

  // Categories
  Object.entries(analysis.categories).forEach(([name, data]) => {
    const card = createElement('div');
    card.style.cssText = 'background:#1f2937; border:1px solid #374151; border-radius:8px; padding:12px; margin-bottom:12px;';

    const row = createElement('div');
    row.style.cssText = 'display:flex; align-items:center; justify-content:space-between; margin-bottom:8px;';
    const left = createElement('div', { textContent: name });
    left.style.cssText = 'font-weight:600;';
    const right = createScoreCircle(data.score, 40);
    row.appendChild(left);
    row.appendChild(right);
    card.appendChild(row);

    const counts = createElement('div');
    counts.style.cssText = 'color:#9ca3af; font-size:12px; margin-bottom:8px;';
    counts.textContent = `Good: ${data.counts.good} • Warnings: ${data.counts.warnings} • Errors: ${data.counts.errors}`;
    card.appendChild(counts);

    const lists = createElement('div');
    lists.style.cssText = 'display:flex; gap:12px;';

    const makeList = (titleText, items, color) => {
      const section = createElement('div');
      section.style.cssText = 'flex:1;';
      const t = createElement('div', { textContent: titleText });
      t.style.cssText = `font-size:12px; margin-bottom:6px; color:${color};`;
      const ul = createElement('ul');
      ul.style.cssText = 'margin:0; padding-left:16px; max-height:120px; overflow:auto;';
      (items || []).slice(0, 5).forEach(it => {
        const li = createElement('li', { textContent: it.message || it.description || String(it) });
        li.style.cssText = 'font-size:12px; color:#d1d5db; margin-bottom:4px;';
        ul.appendChild(li);
      });
      if (!items || items.length === 0) {
        const li = createElement('div', { textContent: 'None' });
        li.style.cssText = 'font-size:12px; color:#9ca3af;';
        ul.appendChild(li);
      }
      section.appendChild(t);
      section.appendChild(ul);
      return section;
    };

    lists.appendChild(makeList('Errors', data.details.errors, '#ef4444'));
    lists.appendChild(makeList('Warnings', data.details.warnings, '#f59e0b'));
    lists.appendChild(makeList('Good', data.details.good, '#10b981'));

    card.appendChild(lists);
    content.appendChild(card);
  });
}

// Chrome messaging helpers
function queryActiveTab() {
  return new Promise((resolve, reject) => {
    try {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (chrome.runtime.lastError) return reject(chrome.runtime.lastError);
        resolve(tabs && tabs[0]);
      });
    } catch (e) {
      reject(e);
    }
  });
}

function sendToContent(tabId, payload) {
  return new Promise((resolve, reject) => {
    try {
      chrome.tabs.sendMessage(tabId, payload, (response) => {
        if (chrome.runtime.lastError) return reject(chrome.runtime.lastError);
        resolve(response);
      });
    } catch (e) {
      reject(e);
    }
  });
}

function sendToBackground(payload) {
  return new Promise((resolve, reject) => {
    try {
      chrome.runtime.sendMessage(payload, (response) => {
        if (chrome.runtime.lastError) return reject(chrome.runtime.lastError);
        resolve(response);
      });
    } catch (e) {
      reject(e);
    }
  });
}

// Analyze current page
async function analyzeCurrentPage() {
  const content = document.querySelector('.app-content');
  if (!content) return;

  content.innerHTML = '<div style="text-align:center; padding: 40px 0; color: #9ca3af;">Analyzing page...</div>';

  try {
    const [tab, settings] = await Promise.all([queryActiveTab(), getSettings()]);
    if (!tab || !tab.id) throw new Error('No active tab');

    // Ask content script for analysis
    let contentResp;
    try {
      contentResp = await sendToContent(tab.id, { action: 'analyzePage', settings });
    } catch (err) {
      throw new Error('Cannot analyze this page. Try reloading it and running the analysis again.');
    }
    if (!contentResp || !contentResp.success) throw new Error(contentResp?.error || 'Analysis failed');

    // Background checks
    let backgroundResp = null;
    try {
      backgroundResp = await sendToBackground({ action: 'analyzePageBackground', url: tab.url, settings });
    } catch (_) {
      // Non-critical
    }

    // Compute and render
    analysisResult = computeScores(contentResp.data);
    renderResults(analysisResult);

    // Optional background notes
    if (backgroundResp && backgroundResp.success) {
      const note = createElement('div');
      note.style.cssText = 'margin-top:8px; color:#9ca3af; font-size:12px;';
      const parts = [];
      if (backgroundResp.data?.robotsTxt) parts.push(`robots.txt: ${backgroundResp.data.robotsTxt.exists ? 'found' : 'missing'}`);
      if (backgroundResp.data?.sitemap) parts.push(`sitemap: ${backgroundResp.data.sitemap.exists ? 'found' : 'missing'}`);
      if (backgroundResp.data?.backlinks) parts.push(`ref domains: ${backgroundResp.data.backlinks.referringDomains}`);
      note.textContent = parts.join(' • ');
      const container = document.querySelector('.app-content');
      if (container) container.appendChild(note);
    }
  } catch (e) {
    const msg = e && e.message ? e.message : 'Unexpected error during analysis';
    const contentEl = document.querySelector('.app-content');
    if (contentEl) contentEl.innerHTML = `<div style="color:#ef4444; background:#1f1f1f; border:1px solid #ef4444; border-radius:8px; padding:12px;">${msg}</div>`;
  }
}

// Initialize UI (CSP-safe, no inline JS)
document.addEventListener('DOMContentLoaded', () => {
  const appContainer = document.getElementById('app');
  if (appContainer) {
    appContainer.innerHTML = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #111827; color: white; min-height: 400px; padding: 16px; margin: 0;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid #374151;">
          <div style="display: flex; align-items: center;">
            <div id="logo-icon" style="font-size: 20px; margin-right: 8px;"></div>
            <span style="font-weight: 600; font-size: 16px; color: #2f81f7;">TECSO SEO Checker</span>
          </div>
          <div style="display:flex; gap:8px; align-items:center;">
            <button id="analyze-button" style="background: #2f81f7; color: white; border: none; padding: 8px 12px; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 500;">Analyze</button>
            <button id="export-button" disabled style="background: #374151; color: #cbd5e1; border: 1px solid #4b5563; padding: 8px 12px; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 500;">Export</button>
            <button id="settings-button" title="Settings" style="background: #111827; color: #cbd5e1; border: 1px solid #4b5563; padding: 8px 12px; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 500;">Settings</button>
          </div>
        </div>
        <div id="settings-panel" style="display:none; background:#0f172a; border:1px solid #374151; border-radius:8px; padding:12px; margin-bottom:12px;">
          <div style="font-weight:600; margin-bottom:8px;">Analysis Settings</div>
          <div style="display:grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap:8px; margin-bottom:8px;">
            <label style="display:flex; align-items:center; gap:8px;">
              <input id="chk-onpage" type="checkbox" /> On-Page SEO
            </label>
            <label style="display:flex; align-items:center; gap:8px;">
              <input id="chk-technical" type="checkbox" /> Technical SEO
            </label>
            <label style="display:flex; align-items:center; gap:8px;">
              <input id="chk-content" type="checkbox" /> Content Quality
            </label>
            <label style="display:flex; align-items:center; gap:8px;">
              <input id="chk-offpage" type="checkbox" /> Off-Page SEO
            </label>
          </div>
          <div style="display:flex; gap:8px; justify-content:flex-end;">
            <button id="settings-cancel" style="background:#1f2937; color:#e5e7eb; border:1px solid #4b5563; padding:6px 10px; border-radius:6px; cursor:pointer; font-size:12px;">Cancel</button>
            <button id="settings-save" style="background:#22c55e; color:#0b1220; border:none; padding:6px 10px; border-radius:6px; cursor:pointer; font-size:12px; font-weight:600;">Save</button>
          </div>
        </div>
        <div class="app-content" style="text-align: center; padding: 40px 0; color: #9ca3af;">
          <div id="placeholder-icon" style="font-size: 48px; margin-bottom: 16px;"></div>
          <div style="font-size: 16px;">Click "Analyze Page" to start SEO analysis</div>
        </div>
      </div>
    `;
    const analyzeBtn = document.getElementById('analyze-button');
    if (analyzeBtn) analyzeBtn.addEventListener('click', analyzeCurrentPage);
    const logoIconEl = document.getElementById('logo-icon');
    if (logoIconEl) logoIconEl.textContent = '📊';
    const placeholderIconEl = document.getElementById('placeholder-icon');
    if (placeholderIconEl) placeholderIconEl.textContent = '🔍';

    // Settings wiring
    const settingsBtn = document.getElementById('settings-button');
    const settingsPanel = document.getElementById('settings-panel');
    const chkOn = document.getElementById('chk-onpage');
    const chkTech = document.getElementById('chk-technical');
    const chkContent = document.getElementById('chk-content');
    const chkOff = document.getElementById('chk-offpage');
    const saveBtn = document.getElementById('settings-save');
    const cancelBtn = document.getElementById('settings-cancel');
    const exportBtn = document.getElementById('export-button');

    const toggleSettings = () => {
      if (!settingsPanel) return;
      const showing = settingsPanel.style.display !== 'none';
      settingsPanel.style.display = showing ? 'none' : 'block';
    };

    const populateSettings = async () => {
      const s = await getSettings();
      if (chkOn) chkOn.checked = !!s.checkOnPage;
      if (chkTech) chkTech.checked = !!s.checkTechnical;
      if (chkContent) chkContent.checked = !!s.checkContent;
      if (chkOff) chkOff.checked = !!s.checkOffPage;
    };

    const saveSettings = async () => {
      const newSettings = {
        checkOnPage: !!(chkOn && chkOn.checked),
        checkTechnical: !!(chkTech && chkTech.checked),
        checkContent: !!(chkContent && chkContent.checked),
        checkOffPage: !!(chkOff && chkOff.checked),
      };
      await new Promise((resolve) => chrome.storage.local.set({ seoSettings: newSettings }, resolve));
      if (settingsPanel) settingsPanel.style.display = 'none';
    };

    const exportResults = () => {
      if (!analysisResult) return;
      const data = {
        generatedAt: new Date().toISOString(),
        url: undefined,
        overallScore: analysisResult.overallScore,
        categories: analysisResult.categories,
      };
      // Try to get current tab URL
      chrome.tabs && chrome.tabs.query && chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        try { data.url = tabs && tabs[0] && tabs[0].url ? tabs[0].url : undefined; } catch(_) {}
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const host = (() => { try { return data.url ? new URL(data.url).hostname : 'site'; } catch(_) { return 'site'; } })();
        a.href = url;
        a.download = `seo-report-${host}.json`;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }, 0);
      });
    };

    if (settingsBtn) settingsBtn.addEventListener('click', () => {
      populateSettings().then(toggleSettings);
    });
    if (saveBtn) saveBtn.addEventListener('click', saveSettings);
    if (cancelBtn) cancelBtn.addEventListener('click', () => settingsPanel && (settingsPanel.style.display = 'none'));
    if (exportBtn) exportBtn.addEventListener('click', exportResults);

    // Enable export after we have results
    const originalRenderResults = renderResults;
    renderResults = function(analysis) {
      const btn = document.getElementById('export-button');
      if (btn) btn.disabled = false;
      return originalRenderResults(analysis);
    };
  }
});

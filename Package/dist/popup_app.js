// TECSO SEO Checker - Popup script (MV3 CSP-safe)
// Renders UI, requests analysis from content/background scripts, and displays results.

let analysisResult = null;
let currentFilter = 'all'; // all | errors | warnings | good

// Settings helpers
function getDefaultSettings() {
  return {
    checkOnPage: true,
    checkTechnical: true,
    checkContent: true,
    checkOffPage: true,
    checkUX: true,
    checkLocal: false,
    checkPerformance: true,
    checkAnalytics: true,
    checkAdvanced: true,
    autoAnalyzeOnPopupOpen: false,
    backlinkProvider: 'mock',
    customBacklinkEndpoint: '',
    enablePSI: false,
    psiApiKey: '',
    theme: 'dark', // legacy
    themeMode: 'system' // 'system' | 'dark' | 'light'
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

function getContrastTextColor(hexColor) {
  // hexColor like #rrggbb -> compute luminance and choose black/white
  try {
    const c = hexColor.replace('#','');
    const r = parseInt(c.substring(0,2),16) / 255;
    const g = parseInt(c.substring(2,4),16) / 255;
    const b = parseInt(c.substring(4,6),16) / 255;
    const [R,G,B] = [r,g,b].map(u => (u <= 0.03928 ? u/12.92 : Math.pow((u+0.055)/1.055, 2.4)));
    const luminance = 0.2126*R + 0.7152*G + 0.0722*B;
    return luminance > 0.55 ? '#0b1220' : '#ffffff';
  } catch(_) {
    return 'var(--gh-text-primary)';
  }
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
    'UX & Core Web Vitals': rawResults.userExperience,
    'Local SEO': rawResults.local,
    'Performance & Speed': rawResults.performance,
    'Analytics & Monitoring': rawResults.analytics,
    'Advanced SEO': rawResults.advanced,
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
    background: conic-gradient(${getScoreColor(score)} ${score * 3.6}deg, var(--score-track) 0deg);
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
  `;
  const innerCircle = createElement('div', { textContent: String(formatScore(score)) });
  const scoreCol = getScoreColor(score);
  const scoreTextCol = getContrastTextColor(scoreCol);
  innerCircle.style.cssText = `
    width: ${size - 8}px;
    height: ${size - 8}px;
    border-radius: 50%;
    background: color-mix(in oklab, var(--gh-bg-primary) 72%, ${scoreCol} 28%);
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: bold;
    font-size: ${size * 0.3}px;
    color: ${scoreTextCol};
    text-shadow: 0 1px 1px rgba(0,0,0,0.25);
  `;
  circle.appendChild(innerCircle);
  return circle;
}

function renderResults(analysis) {
  const content = document.querySelector('.app-content');
  if (!content) return;

  content.innerHTML = '';

  // Filter chips
  const chipBar = createElement('div');
  chipBar.style.cssText = 'display:flex; gap:8px; flex-wrap:wrap; justify-content:center; margin-bottom:12px;';
  const mkChip = (label, key) => {
    const c = createElement('span');
    c.className = 'chip';
    c.textContent = label;
    c.dataset.filter = key;
    c.dataset.active = String(currentFilter === key);
    c.addEventListener('click', () => {
      currentFilter = key;
      // update active states in this bar
      Array.from(chipBar.children).forEach(ch => {
        if (ch && ch.classList && ch.classList.contains('chip')) {
          ch.dataset.active = String(ch.dataset.filter === key);
        }
      });
      renderResults(analysis);
    });
    return c;
  };
  chipBar.appendChild(mkChip('All', 'all'));
  chipBar.appendChild(mkChip('Errors', 'errors'));
  chipBar.appendChild(mkChip('Warnings', 'warnings'));
  chipBar.appendChild(mkChip('Good', 'good'));
  content.appendChild(chipBar);

  // Header
  const header = createElement('div');
  header.className = 'card';
  header.style.cssText = 'text-align:center; margin-bottom:16px; padding:16px;';
  const title = createElement('div', { textContent: 'SEO Analysis Results' });
  title.style.cssText = 'font-weight:600; margin-bottom:12px;';
  const circle = createScoreCircle(analysis.overallScore, 72);
  const label = createElement('div', { textContent: 'Overall Score' });
  label.style.cssText = 'color: var(--gh-text-secondary); margin-top:8px; font-size:14px;';
  // Global quick actions row under the score
  const actions = createElement('div');
  actions.style.cssText = 'margin-top:12px; display:flex; gap:8px; justify-content:center;';
  const copyAllErrBtn = createElement('button');
  copyAllErrBtn.className = 'btn btn-outline';
  copyAllErrBtn.textContent = 'Copy all errors';
  copyAllErrBtn.title = 'Copy all errors across categories';
  copyAllErrBtn.addEventListener('click', () => copyAllErrors());
  actions.appendChild(copyAllErrBtn);
  header.appendChild(title);
  header.appendChild(circle);
  header.appendChild(label);
  header.appendChild(actions);
  content.appendChild(header);

  // Categories
  Object.entries(analysis.categories).forEach(([name, data]) => {
  const card = createElement('div');
    card.className = 'card';
    card.style.cssText = 'margin-bottom:12px;';
    card.dataset.expanded = 'false';

    // Header row (accordion trigger)
    const headerRow = createElement('div');
    headerRow.style.cssText = 'display:flex; align-items:center; justify-content:space-between; padding:12px; cursor:pointer;';

    const leftWrap = createElement('div');
    leftWrap.style.cssText = 'display:flex; align-items:center; gap:10px;';
    const caret = createElement('span', { textContent: '▸' });
    caret.style.cssText = 'display:inline-block; transition: transform 0.15s ease; color: var(--gh-text-secondary);';
    const dot = createElement('span');
    dot.style.cssText = `width:10px; height:10px; border-radius:50%; display:inline-block; background:${getScoreColor(data.score)};`;
    const nameEl = createElement('div', { textContent: name });
    nameEl.style.cssText = 'font-weight:600;';
    leftWrap.appendChild(caret);
    leftWrap.appendChild(dot);
    leftWrap.appendChild(nameEl);

    const midWrap = createElement('div');
    midWrap.style.cssText = 'display:flex; align-items:center; gap:8px; color: var(--gh-text-secondary); font-size:12px;';
    const summary = createElement('div', { textContent: `E ${data.counts.errors} | W ${data.counts.warnings} | G ${data.counts.good}` });
    midWrap.appendChild(summary);

    const rightWrap = createElement('div');
    rightWrap.style.cssText = 'display:flex; align-items:center; gap:10px;';
    const scoreEl = createScoreCircle(data.score, 36);
    const copyBtn = createElement('button');
    copyBtn.className = 'btn icon-btn';
    copyBtn.textContent = '📋';
    copyBtn.title = 'Copy category';
    copyBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      copyCategory(name, data);
    });
    rightWrap.appendChild(scoreEl);
    rightWrap.appendChild(copyBtn);

    headerRow.appendChild(leftWrap);
    headerRow.appendChild(midWrap);
    headerRow.appendChild(rightWrap);

    // Detail body
    const body = createElement('div');
  body.style.cssText = 'display:none; padding:0 12px 12px;';

  const lists = createElement('div');
  lists.style.cssText = 'display:flex; gap:12px;';

    const makeList = (titleText, items, color) => {
      const section = createElement('div');
      section.style.cssText = 'flex:1;';
      const t = createElement('div', { textContent: titleText });
      t.style.cssText = `font-size:12px; margin-bottom:6px; color:${color}; font-weight:600; text-transform:uppercase; letter-spacing:.02em;`;
      const ul = createElement('ul');
      ul.style.cssText = 'margin:0; padding-left:16px;';
      const showAll = () => card.dataset.expanded === 'true';
      const maxItems = showAll() ? Number.MAX_SAFE_INTEGER : 3;
      const arr = items || [];
      if (arr.length === 0) {
        const li = createElement('div', { textContent: 'None' });
  li.style.cssText = 'font-size:12px; color: var(--gh-text-secondary);';
        ul.appendChild(li);
      } else {
        arr.slice(0, maxItems).forEach(it => {
          const li = createElement('li', { textContent: it.message || it.description || String(it) });
          li.style.cssText = 'font-size:12px; color: var(--gh-text-primary); margin-bottom:4px;';
          ul.appendChild(li);
        });
      }
      section.appendChild(t);
      section.appendChild(ul);
      return section;
    };

    const rebuildLists = () => {
      lists.innerHTML = '';
      if (currentFilter === 'errors') {
        lists.appendChild(makeList('Errors', data.details.errors, '#ef4444'));
      } else if (currentFilter === 'warnings') {
        lists.appendChild(makeList('Warnings', data.details.warnings, '#f59e0b'));
      } else if (currentFilter === 'good') {
        lists.appendChild(makeList('Good', data.details.good, '#10b981'));
      } else {
        lists.appendChild(makeList('Errors', data.details.errors, '#ef4444'));
        lists.appendChild(makeList('Warnings', data.details.warnings, '#f59e0b'));
        lists.appendChild(makeList('Good', data.details.good, '#10b981'));
      }
    };
    rebuildLists();

    // Show more/less control
    const controls = createElement('div');
    controls.style.cssText = 'display:flex; justify-content:flex-end; margin-top:8px;';
    const toggleBtn = createElement('button');
  toggleBtn.style.cssText = 'background: var(--gh-bg-primary); color: var(--gh-accent); border:1px solid var(--gh-border); padding:6px 10px; border-radius:6px; cursor:pointer; font-size:12px;';
    toggleBtn.textContent = 'Show more';
    controls.appendChild(toggleBtn);

    body.appendChild(lists);
    body.appendChild(controls);

    // Toggle logic
    const setExpanded = (exp) => {
      card.dataset.expanded = exp ? 'true' : 'false';
      body.style.display = exp ? 'block' : 'none';
      caret.style.transform = exp ? 'rotate(90deg)' : 'rotate(0deg)';
      toggleBtn.textContent = exp ? 'Show less' : 'Show more';
      rebuildLists();
    };

    headerRow.addEventListener('click', () => setExpanded(card.dataset.expanded !== 'true'));
    toggleBtn.addEventListener('click', (e) => { e.stopPropagation(); setExpanded(card.dataset.expanded !== 'true'); });

    // Initial collapsed state
    setExpanded(false);

    card.appendChild(headerRow);
    card.appendChild(body);
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

  content.innerHTML = '<div style="text-align:center; padding: 40px 0; color: var(--gh-text-secondary); display:flex; flex-direction:column; align-items:center; gap:10px;"><span class="spinner"></span><div>Analyzing page…</div></div>';
  const analyzeBtnEl = document.getElementById('analyze-button');
  const exportBtnEl = document.getElementById('export-button');
  const copyErrorsBtnEl = document.getElementById('copy-errors-button');
  const prevAnalyzeText = analyzeBtnEl ? analyzeBtnEl.textContent : null;
  if (analyzeBtnEl) { analyzeBtnEl.disabled = true; analyzeBtnEl.textContent = 'Analyzing…'; }
  if (exportBtnEl) exportBtnEl.disabled = true;
  if (copyErrorsBtnEl) copyErrorsBtnEl.disabled = true;

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
  note.style.cssText = 'margin-top:8px; color: var(--gh-text-secondary); font-size:12px;';
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
  if (contentEl) contentEl.innerHTML = `<div style="color:var(--gh-danger); background:var(--error-bg); border:1px solid var(--gh-danger); border-radius:8px; padding:12px;">${msg}</div>`;
  } finally {
    if (analyzeBtnEl) { analyzeBtnEl.disabled = false; analyzeBtnEl.textContent = prevAnalyzeText || 'Analyze'; }
  }
}

// Initialize UI (CSP-safe, no inline JS)
document.addEventListener('DOMContentLoaded', () => {
  // Inject some UX styles (subtle)
  try {
    const style = document.createElement('style');
    style.textContent = `
      button:hover { filter: brightness(1.05); }
      button:active { transform: translateY(1px); }
    `;
    document.head.appendChild(style);
  } catch(_) {}
  const appContainer = document.getElementById('app');
  if (appContainer) {
    appContainer.innerHTML = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: var(--gh-bg-primary); color: var(--gh-text-primary); min-height: 420px; padding: 16px; margin: 0;">
        <div class="toolbar" style="margin-bottom:12px;">
          <div class="brand">
            <div id="logo-icon" style="font-size: 18px;"></div>
            <span style="font-weight: 800; letter-spacing:.2px;">Tecso SEO Analyzer</span>
          </div>
           <div class="actions">
            <button id="analyze-button" class="btn btn-primary">Analyze</button>
            <button id="export-button" class="btn btn-outline" title="Export report (JSON, CSV, HTML)" disabled>Export</button>
            <button id="copy-errors-button" class="btn btn-outline" title="Copy all errors from the last analysis" disabled>Copy errors</button>
            <button id="settings-button" title="Settings" class="btn btn-ghost">Settings</button>
            <button id="theme-button" title="Toggle theme" class="btn icon-btn" aria-label="Toggle theme">🌓</button>
          </div>
        </div>
        <div id="tecso-promo" class="github-card" style="background: var(--gh-bg-secondary); border:1px solid var(--gh-border); border-radius:10px; padding:12px; margin-bottom:12px;">
          <div style="display:flex; align-items:center; justify-content:space-between; gap:10px;">
            <div style="display:flex; flex-direction:column; gap:4px;">
              <div style="font-weight:700; color: var(--gh-text-primary);">Grow faster with Tecso</div>
              <div style="color: var(--gh-text-secondary); font-size:12px;">SEO audits • Content strategy • Technical optimization</div>
            </div>
            <a href="https://tecso.team" target="_blank" rel="noreferrer" style="text-decoration:none;">
              <button title="Get a free SEO consultation with Tecso" class="btn btn-success" style="font-weight:700;">Free consultation</button>
            </a>
          </div>
        </div>
        <div id="settings-panel" style="display:none; background: var(--gh-bg-secondary); border:1px solid var(--gh-border); border-radius:8px; padding:12px; margin-bottom:12px;">
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
            <label style="display:flex; align-items:center; gap:8px;">
              <input id="chk-ux" type="checkbox" /> UX & Core Web Vitals
            </label>
            <label style="display:flex; align-items:center; gap:8px;">
              <input id="chk-local" type="checkbox" /> Local SEO
            </label>
            <label style="display:flex; align-items:center; gap:8px;">
              <input id="chk-performance" type="checkbox" /> Performance & Speed
            </label>
            <label style="display:flex; align-items:center; gap:8px;">
              <input id="chk-analytics" type="checkbox" /> Analytics & Monitoring
            </label>
            <label style="display:flex; align-items:center; gap:8px;">
              <input id="chk-advanced" type="checkbox" /> Advanced SEO
            </label>
            <label style="display:flex; align-items:center; gap:8px;">
              <input id="chk-auto-analyze" type="checkbox" /> Auto analyze on open
            </label>
          </div>
          <div style="border-top:1px solid #243049; margin:8px 0; padding-top:8px; font-weight:600;">Theme</div>
          <div style="display:grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap:8px; margin-bottom:8px; align-items:center;">
            <label for="sel-theme-mode" class="label">Theme mode</label>
            <select id="sel-theme-mode" class="input" style="padding:6px 8px;">
              <option value="system">System</option>
              <option value="dark">Dark</option>
              <option value="light">Light</option>
            </select>
          </div>
          <div style="border-top:1px solid #243049; margin:8px 0; padding-top:8px; font-weight:600;">Backlinks</div>
          <div style="display:grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap:8px; margin-bottom:8px;">
            <label style="display:flex; align-items:center; gap:8px;">
              <input type="radio" name="backlink-provider" id="rdo-backlinks-mock" value="mock" /> Mock provider
            </label>
            <label style="display:flex; align-items:center; gap:8px;">
              <input type="radio" name="backlink-provider" id="rdo-backlinks-custom" value="custom" /> Custom endpoint
            </label>
            <div style="grid-column: span 2 / span 2; display:flex; gap:8px; align-items:center;">
              <label for="txt-backlinks-endpoint" style="color: var(--gh-text-secondary); font-size:12px; min-width:100px;">Endpoint URL</label>
              <input id="txt-backlinks-endpoint" type="text" placeholder="https://api.example.com/backlinks" style="flex:1; background: var(--gh-bg-primary); color: var(--gh-text-primary); border:1px solid var(--gh-border); border-radius:6px; padding:6px 8px;" />
            </div>
          </div>
          <div style="border-top:1px solid #243049; margin:8px 0; padding-top:8px; font-weight:600;">PageSpeed Insights</div>
          <div style="display:grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap:8px; margin-bottom:8px;">
            <label style="display:flex; align-items:center; gap:8px;">
              <input id="chk-psi-enable" type="checkbox" /> Enable PSI (lab metrics)
            </label>
            <div style="grid-column: span 2 / span 2; display:flex; gap:8px; align-items:center;">
              <label for="txt-psi-key" style="color: var(--gh-text-secondary); font-size:12px; min-width:100px;">PSI API Key</label>
              <input id="txt-psi-key" type="password" placeholder="Enter API key" style="flex:1; background: var(--gh-bg-primary); color: var(--gh-text-primary); border:1px solid var(--gh-border); border-radius:6px; padding:6px 8px;" />
            </div>
          </div>
          <div style="display:flex; gap:8px; justify-content:flex-end;">
            <button id="settings-cancel" style="background: var(--gh-bg-tertiary); color: var(--gh-text-primary); border:1px solid var(--gh-border); padding:6px 10px; border-radius:6px; cursor:pointer; font-size:12px;">Cancel</button>
            <button id="settings-save" style="background:#22c55e; color:#0b1220; border:none; padding:6px 10px; border-radius:6px; cursor:pointer; font-size:12px; font-weight:600;">Save</button>
          </div>
        </div>
        <div class="app-content" style="text-align: center; padding: 24px; color: var(--gh-text-secondary);">
          <div style="display:flex; flex-direction:column; align-items:center; gap:12px;">
            <div id="placeholder-icon" style="font-size: 40px;"></div>
            <div style="font-size: 14px;">Click Analyze to scan the current page, then export a shareable report.</div>
            <div id="pre-chips" style="display:flex; gap:8px; flex-wrap:wrap; justify-content:center;">
              <span class="chip" data-filter="all" data-active="true">All</span>
              <span class="chip" data-filter="errors">Errors</span>
              <span class="chip" data-filter="warnings">Warnings</span>
              <span class="chip" data-filter="good">Good</span>
            </div>
          </div>
        </div>
        <div class="footer">© <span id="footer-year"></span> Tecso • <a href="https://tecso.team" target="_blank" rel="noreferrer">tecso.team</a></div>
      </div>
    `;
    const analyzeBtn = document.getElementById('analyze-button');
    if (analyzeBtn) analyzeBtn.addEventListener('click', analyzeCurrentPage);
    const logoIconEl = document.getElementById('logo-icon');
    if (logoIconEl) logoIconEl.textContent = '📊';
    const placeholderIconEl = document.getElementById('placeholder-icon');
    if (placeholderIconEl) placeholderIconEl.textContent = '🔍';
  const footerYearEl = document.getElementById('footer-year');
  if (footerYearEl) footerYearEl.textContent = String(new Date().getFullYear());

    // pre-result chips behavior
    const preChips = document.getElementById('pre-chips');
    if (preChips) {
      preChips.addEventListener('click', (e) => {
        const t = e.target;
        if (t && t.classList && t.classList.contains('chip')) {
          const key = t.getAttribute('data-filter');
          if (key) currentFilter = key;
          Array.from(preChips.children).forEach(ch => {
            if (ch && ch.classList && ch.classList.contains('chip')) {
              const ck = ch.getAttribute('data-filter');
              ch.setAttribute('data-active', String(ck === key));
            }
          });
        }
      });
    }

    // Settings wiring
  const settingsBtn = document.getElementById('settings-button');
  const themeBtn = document.getElementById('theme-button');
  const copyErrorsBtn = document.getElementById('copy-errors-button');
    const settingsPanel = document.getElementById('settings-panel');
  const chkOn = document.getElementById('chk-onpage');
  const chkTech = document.getElementById('chk-technical');
  const chkContent = document.getElementById('chk-content');
  const chkOff = document.getElementById('chk-offpage');
  const chkUX = document.getElementById('chk-ux');
  const chkLocal = document.getElementById('chk-local');
  const chkPerf = document.getElementById('chk-performance');
  const chkAnalytics = document.getElementById('chk-analytics');
  const chkAdvanced = document.getElementById('chk-advanced');
  const chkAutoAnalyze = document.getElementById('chk-auto-analyze');
  const selThemeMode = document.getElementById('sel-theme-mode');
  const rdoBacklinksMock = document.getElementById('rdo-backlinks-mock');
  const rdoBacklinksCustom = document.getElementById('rdo-backlinks-custom');
  const txtBacklinksEndpoint = document.getElementById('txt-backlinks-endpoint');
  const chkPSIEnable = document.getElementById('chk-psi-enable');
  const txtPSIKey = document.getElementById('txt-psi-key');
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
      if (chkUX) chkUX.checked = s.checkUX !== false; // default true
      if (chkLocal) chkLocal.checked = !!s.checkLocal; // default false
      if (chkPerf) chkPerf.checked = s.checkPerformance !== false; // default true
      if (chkAnalytics) chkAnalytics.checked = s.checkAnalytics !== false; // default true
      if (chkAdvanced) chkAdvanced.checked = s.checkAdvanced !== false; // default true
      if (chkAutoAnalyze) chkAutoAnalyze.checked = !!s.autoAnalyzeOnPopupOpen;
  if (selThemeMode) selThemeMode.value = (s.themeMode || s.theme || 'system');
      if (rdoBacklinksMock) rdoBacklinksMock.checked = (s.backlinkProvider || 'mock') === 'mock';
      if (rdoBacklinksCustom) rdoBacklinksCustom.checked = (s.backlinkProvider || 'mock') === 'custom';
      if (txtBacklinksEndpoint) txtBacklinksEndpoint.value = s.customBacklinkEndpoint || '';
      if (chkPSIEnable) chkPSIEnable.checked = !!s.enablePSI;
      if (txtPSIKey) txtPSIKey.value = s.psiApiKey || '';
    };

    const saveSettings = async () => {
      const newSettings = {
        checkOnPage: !!(chkOn && chkOn.checked),
        checkTechnical: !!(chkTech && chkTech.checked),
        checkContent: !!(chkContent && chkContent.checked),
        checkOffPage: !!(chkOff && chkOff.checked),
        checkUX: !!(chkUX && chkUX.checked),
        checkLocal: !!(chkLocal && chkLocal.checked),
        checkPerformance: !!(chkPerf && chkPerf.checked),
        checkAnalytics: !!(chkAnalytics && chkAnalytics.checked),
        checkAdvanced: !!(chkAdvanced && chkAdvanced.checked),
        autoAnalyzeOnPopupOpen: !!(chkAutoAnalyze && chkAutoAnalyze.checked),
        backlinkProvider: (rdoBacklinksCustom && rdoBacklinksCustom.checked) ? 'custom' : 'mock',
        customBacklinkEndpoint: (txtBacklinksEndpoint && txtBacklinksEndpoint.value || '').trim(),
        enablePSI: !!(chkPSIEnable && chkPSIEnable.checked),
        psiApiKey: (txtPSIKey && txtPSIKey.value || '').trim(),
        themeMode: (selThemeMode && selThemeMode.value) || 'system'
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
        // Offer export formats
        exportDownload('json', data);
        exportDownload('csv', data);
        exportDownload('html', data);
      });
    };

    function exportDownload(format, data) {
      const host = (() => { try { return data.url ? new URL(data.url).hostname : 'site'; } catch(_) { return 'site'; } })();
      let blob, filename;
      if (format === 'json') {
        blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        filename = `seo-report-${host}.json`;
      } else if (format === 'csv') {
        const rows = [['Category','Type','Message']];
        Object.entries(data.categories).forEach(([cat, obj]) => {
          [['errors','Errors'],['warnings','Warnings'],['good','Good']].forEach(([key,label]) => {
            (obj.details[key] || []).forEach(item => rows.push([cat, label, (item.message || '').replace(/\n/g,' ') ]));
          });
        });
        const csv = rows.map(r => r.map(v => '"' + String(v).replace(/"/g,'""') + '"').join(',')).join('\n');
        blob = new Blob([csv], { type: 'text/csv' });
        filename = `seo-report-${host}.csv`;
      } else {
        const style = '<style>@media print { @page{ margin:16mm; } } body{font-family:Segoe UI,Arial,sans-serif;background:#ffffff;color:#24292f;padding:16px;}h1{color:#0b61f7;}table{width:100%;border-collapse:collapse;margin-top:12px;}th,td{border:1px solid #d0d7de;padding:8px;font-size:13px;}th{background:#f6f8fa;text-align:left;}mark{background:#e6f0ff;color:#0b61f7;padding:0 4px;border-radius:4px;}</style>';
        let html = `<!doctype html><html><head><meta charset="utf-8">${style}<title>SEO Report - ${host}</title></head><body>`;
        html += `<h1>SEO Report - ${host}</h1><div>Generated: ${data.generatedAt}</div>`;
        html += `<div style="margin:8px 0;">Overall Score: <mark>${data.overallScore}</mark></div>`;
        Object.entries(data.categories).forEach(([cat, obj]) => {
          html += `<h2>${cat} <small style="color:#9ca3af;">(Score ${obj.score})</small></h2>`;
          html += '<table><thead><tr><th>Type</th><th>Message</th></tr></thead><tbody>';
          [['errors','Errors'],['warnings','Warnings'],['good','Good']].forEach(([key,label]) => {
            (obj.details[key] || []).forEach(item => {
              html += `<tr><td>${label}</td><td>${(item.message || '').replace(/</g,'&lt;')}</td></tr>`;
            });
          });
          html += '</tbody></table>';
        });
        html += '</body></html>';
        blob = new Blob([html], { type: 'text/html' });
        filename = `seo-report-${host}.html`;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 0);
    }

    if (settingsBtn) settingsBtn.addEventListener('click', () => {
      populateSettings().then(toggleSettings);
    });
    if (themeBtn) themeBtn.addEventListener('click', async () => {
      const s = await getSettings();
      const mode = s.themeMode || s.theme || 'system';
      const order = ['dark','light','system'];
      const idx = order.indexOf(mode);
      const next = order[(idx + 1) % order.length];
      const updated = { ...s, themeMode: next };
      await new Promise((resolve) => chrome.storage.local.set({ seoSettings: updated }, resolve));
      applyTheme(next);
    });
    if (copyErrorsBtn) copyErrorsBtn.addEventListener('click', copyAllErrors);
    if (saveBtn) saveBtn.addEventListener('click', saveSettings);
    if (cancelBtn) cancelBtn.addEventListener('click', () => settingsPanel && (settingsPanel.style.display = 'none'));
    if (exportBtn) exportBtn.addEventListener('click', exportResults);

    // Enable export after we have results
    const originalRenderResults = renderResults;
    renderResults = function(analysis) {
      const btn = document.getElementById('export-button');
      if (btn) btn.disabled = false;
      const copyErrorsBtnTop = document.getElementById('copy-errors-button');
      if (copyErrorsBtnTop) copyErrorsBtnTop.disabled = false;
      // Update action badge via background
      try {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs && tabs[0]) {
            chrome.runtime.sendMessage({ action: 'setBadgeScore', score: analysis.overallScore, tabId: tabs[0].id });
          }
        });
      } catch(_) {}
      return originalRenderResults(analysis);
    };

    // Apply persisted theme and optionally auto-analyze
    getSettings().then(s => {
      // migrate legacy theme
      if (!s.themeMode && s.theme) s.themeMode = s.theme;
      applyTheme(s.themeMode || 'system');
      if (s.autoAnalyzeOnPopupOpen) analyzeCurrentPage();
    });
  }
});

function applyTheme(themeMode) {
  try {
    let mode = themeMode;
    if (mode === 'system') {
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      mode = prefersDark ? 'dark' : 'light';
    }
    const t = (mode === 'light') ? 'light' : 'dark';
    document.body.setAttribute('data-theme', t);
  } catch(_) {}
}

function normalizeItemsForCopy(items) {
  return (items || []).map(i => (i.message || i.description || String(i))).filter(Boolean);
}

function copyCategory(categoryName, data) {
  try {
    let lines = [];
    if (currentFilter === 'errors' || currentFilter === 'all') {
      lines = lines.concat(normalizeItemsForCopy(data.details.errors).map(m => `[ERROR] ${m}`));
    }
    if (currentFilter === 'warnings' || currentFilter === 'all') {
      lines = lines.concat(normalizeItemsForCopy(data.details.warnings).map(m => `[WARN] ${m}`));
    }
    if (currentFilter === 'good' || currentFilter === 'all') {
      lines = lines.concat(normalizeItemsForCopy(data.details.good).map(m => `[GOOD] ${m}`));
    }
    const text = `Category: ${categoryName}\n` + lines.join('\n');
    navigator.clipboard && navigator.clipboard.writeText(text);
  } catch(_) {}
}

function copyAllErrors() {
  try {
    if (!analysisResult) return;
    const lines = [];
    Object.entries(analysisResult.categories).forEach(([cat, obj]) => {
      normalizeItemsForCopy(obj.details.errors).forEach(m => lines.push(`${cat}: ${m}`));
    });
    if (lines.length === 0) return;
    navigator.clipboard && navigator.clipboard.writeText(lines.join('\n'));
  } catch(_) {}
}

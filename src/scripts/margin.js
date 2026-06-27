// lilMargin: from a cost and any one of margin %, markup %, or sale price,
// work out the full pricing picture and explain margin vs markup. All math
// runs in the browser.

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

/* ---------- theme (OS-aware, matches the family) ---------- */
const MOON_SVG = '<svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true"><path fill="currentColor" d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/></svg>';
const SUN_SVG = '<svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4l1.4-1.4M18 6l1.4-1.4"/></g></svg>';

function setThemeIcon(btn, theme) {
  if (theme === 'dark') { btn.innerHTML = SUN_SVG; btn.setAttribute('aria-label', 'Switch to light mode'); }
  else { btn.innerHTML = MOON_SVG; btn.setAttribute('aria-label', 'Switch to dark mode'); }
}
function initTheme() {
  const btn = $('#ui-theme-btn');
  const current = () => (document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light');
  setThemeIcon(btn, current());
  btn.addEventListener('click', () => {
    const next = current() === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem('lilmargin-theme', next); } catch (e) { /* storage may be unavailable; safe to ignore */ }
    setThemeIcon(btn, next);
  });
}

/* ---------- state ---------- */
const state = { mode: 'margin', sym: '$' };
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const MODES = {
  margin: { label: 'Desired margin', sym: '%', placeholder: 'e.g. 40' },
  markup: { label: 'Desired markup', sym: '%', placeholder: 'e.g. 60' },
  price: { label: 'Sale price', sym: '$', placeholder: 'e.g. 25.00' },
};

function money(n) {
  if (!isFinite(n)) return 'n/a';
  return state.sym + n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function pct(n) {
  if (!isFinite(n)) return 'n/a';
  return n.toLocaleString(undefined, { maximumFractionDigits: 1 }) + '%';
}

/* ---------- the math ---------- */
// returns { price, profit, margin, markup } or { error }
function compute(cost, mode, value) {
  if (mode === 'margin') {
    if (value >= 100) return { error: 'A margin of 100% or more is impossible: the cost would have to be zero or negative. Margin always stays under 100%.' };
    const price = cost / (1 - value / 100);
    const profit = price - cost;
    const markup = cost > 0 ? (profit / cost) * 100 : Infinity;
    return { price, profit, margin: value, markup };
  }
  if (mode === 'markup') {
    const price = cost * (1 + value / 100);
    const profit = price - cost;
    const margin = price > 0 ? (profit / price) * 100 : Infinity;
    return { price, profit, margin, markup: value };
  }
  // price mode
  const price = value;
  const profit = price - cost;
  const margin = price > 0 ? (profit / price) * 100 : Infinity;
  const markup = cost > 0 ? (profit / cost) * 100 : Infinity;
  return { price, profit, margin, markup };
}

/* ---------- render ---------- */
function tile(label, value, sub, accent) {
  return `<div class="mg-tile${accent ? ' mg-tile--accent' : ''}">
    <div class="mg-tile-v">${esc(value)}</div>
    <div class="mg-tile-l">${esc(label)}</div>
    ${sub ? `<div class="mg-tile-s">${sub}</div>` : ''}
  </div>`;
}

function render() {
  const cost = parseFloat($('#f-cost').value);
  const value = parseFloat($('#f-value').value);
  const box = $('#results');

  const haveCost = !isNaN(cost) && cost >= 0;
  const haveVal = !isNaN(value);
  if (!haveCost || !haveVal) {
    box.innerHTML = `<div class="mg-empty">
      <p class="mg-empty-big">Your numbers show up here</p>
      <p class="mg-empty-sub">Enter a cost and ${state.mode === 'price' ? 'a sale price' : 'a ' + state.mode} on the left to see the sale price, profit, margin, and markup, side by side.</p>
    </div>${explainer()}`;
    return;
  }

  const r = compute(cost, state.mode, value);
  if (r.error) {
    box.innerHTML = `<div class="t-note t-note--err">${esc(r.error)}</div>${explainer()}`;
    return;
  }

  const loss = r.profit < -1e-9;
  const tiles =
    tile('Sale price', money(r.price), state.mode === 'price' ? 'what you entered' : 'what to charge', true) +
    tile('Profit per unit', money(r.profit), loss ? 'you would lose money' : 'cost ' + money(cost), false) +
    tile('Margin', pct(r.margin), 'profit ÷ sale price') +
    tile('Markup', pct(r.markup), 'profit ÷ cost');

  box.innerHTML = `<div class="mg-grid">${tiles}</div>${gap(r)}${explainer()}`;
}

// the one-line "why they differ" using the user's own numbers
function gap(r) {
  if (!isFinite(r.markup) || !isFinite(r.margin)) return '';
  return `<div class="mg-gap">A <strong>${pct(r.markup)}</strong> markup is the same money as a <strong>${pct(r.margin)}</strong> margin. Same profit, two reference points.</div>`;
}

function explainer() {
  return `<div class="mg-explain">
    <div class="mg-explain-h">Margin vs markup</div>
    <p><strong>Margin</strong> is profit as a share of the <em>sale price</em>: profit &divide; price. It tells you how much of each sale you keep.</p>
    <p><strong>Markup</strong> is profit as a share of the <em>cost</em>: profit &divide; cost. It tells you how much you added on top of cost.</p>
    <p class="mg-explain-note">They are never equal (except at zero). A 50% markup is only a 33.3% margin, so quoting markup as if it were margin quietly overstates what you keep.</p>
  </div>`;
}

/* ---------- wire-up ---------- */
function syncMode() {
  const m = MODES[state.mode];
  $('#value-label').textContent = m.label;
  $('#value-sym').textContent = state.mode === 'price' ? state.sym : '%';
  $('#f-value').placeholder = m.placeholder;
}

function initMargin() {
  initTheme();
  syncMode();

  $('#f-cost').addEventListener('input', render);
  $('#f-value').addEventListener('input', render);
  $('#f-sym').addEventListener('input', () => {
    state.sym = $('#f-sym').value || '$';
    $('#sym-cost').textContent = state.sym;
    if (state.mode === 'price') $('#value-sym').textContent = state.sym;
    render();
  });
  $$('[data-mode]').forEach((b) => b.addEventListener('click', () => {
    state.mode = b.dataset.mode;
    $$('[data-mode]').forEach((x) => x.classList.toggle('is-active', x === b));
    syncMode();
    render();
  }));

  $('#example-btn').addEventListener('click', () => {
    $('#f-cost').value = '12';
    $('#f-value').value = '40';
    state.mode = 'margin';
    $$('[data-mode]').forEach((x) => x.classList.toggle('is-active', x.dataset.mode === 'margin'));
    syncMode();
    render();
  });
  $('#clear-btn').addEventListener('click', () => {
    $('#f-cost').value = '';
    $('#f-value').value = '';
    render();
  });

  render();
}

export { initMargin };

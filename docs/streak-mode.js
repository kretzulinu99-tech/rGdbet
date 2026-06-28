/* ═══════════════════════════════════════════════════════════════
   streak-mode.js v2 — OPTIMIZAT PERFORMANȚĂ
   5 WIN  consecutive → glow verde (CSS pur, fără canvas)
   5 LOSS consecutive → glow roșu  (CSS pur, fără canvas)
   
   Optimizări:
   - Fără canvas, fără requestAnimationFrame loop continuu
   - Particule generate cu CSS animations, nu JS loop
   - CSS contain: layout style pe containere
   - will-change doar pe elementele care se animează
   - Debounce pe detectStreak
═══════════════════════════════════════════════════════════════ */
'use strict';

const STREAK_THRESHOLD = 5;
const LS_KEY = 'rgb_bets';

let _currentMode  = null;  // 'win' | 'loss' | null
let _toastTimer   = null;
let _detectTimer  = null;
let _particlePool = [];    // refolosim elementele DOM în loc să le creăm mereu

/* ══════════════════════════════════════════════════════════
   CSS INJECTAT O SINGURĂ DATĂ — nu se rescrie niciodată
══════════════════════════════════════════════════════════ */
function injectCSS() {
  if (document.getElementById('sm-css')) return;
  const el = document.createElement('style');
  el.id = 'sm-css';
  el.textContent = `

  /* Toast */
  #streak-toast {
    position: fixed;
    top: -100px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 99500;
    pointer-events: none;
    transition: top .45s cubic-bezier(.34,1.56,.64,1);
    display: flex; align-items: center; gap: 10px;
    padding: 12px 22px; border-radius: 50px;
    font-family: 'Syncopate', sans-serif;
    font-size: 10px; font-weight: 700; letter-spacing: 1.5px;
    white-space: nowrap;
  }
  #streak-toast.sm-visible { top: 14px; }
  #streak-toast.sm-win {
    background: rgba(0,30,15,.96);
    border: 1px solid rgba(0,255,136,.55);
    color: #00ff88;
    box-shadow: 0 4px 32px rgba(0,255,136,.4);
  }
  #streak-toast.sm-loss {
    background: rgba(30,0,8,.96);
    border: 1px solid rgba(255,51,102,.55);
    color: #ff3366;
    box-shadow: 0 4px 32px rgba(255,51,102,.4);
  }
  .sm-toast-icon { font-size: 18px; }
  .sm-toast-main { display: block; font-size: 11px; }
  .sm-toast-sub  { display: block; font-size: 7.5px; opacity: .7; letter-spacing: 1px; margin-top: 2px; }

  /* Particle container — un singur div fix */
  #sm-particles {
    position: fixed; inset: 0;
    pointer-events: none;
    z-index: 9100;
    overflow: hidden;
    display: none;
  }
  #sm-particles.sm-active { display: block; }

  /* Particule individuale — animate complet în CSS */
  .sm-p {
    position: absolute;
    border-radius: 50%;
    opacity: 0;
    will-change: transform, opacity;
  }
  /* WIN particles — urcă din jos */
  .sm-p.sm-p-win {
    bottom: -12px;
    animation: smRise var(--dur, 3s) var(--delay, 0s) ease-out infinite;
  }
  /* LOSS particles — cad din sus */
  .sm-p.sm-p-loss {
    top: -12px;
    animation: smFall var(--dur, 3s) var(--delay, 0s) ease-out infinite;
  }

  @keyframes smRise {
    0%   { opacity: 0;   transform: translateX(0) translateY(0)     scale(.4); }
    12%  { opacity: .9; }
    80%  { opacity: .4; }
    100% { opacity: 0;   transform: translateX(var(--dx,0px)) translateY(-85vh) scale(.15); }
  }
  @keyframes smFall {
    0%   { opacity: 0;   transform: translateX(0) translateY(0)    scale(.4); }
    12%  { opacity: .9; }
    80%  { opacity: .4; }
    100% { opacity: 0;   transform: translateX(var(--dx,0px)) translateY(85vh) scale(.15); }
  }

  /* ── WIN STREAK: glow verde pe containere ── */
  body.sm-win .form-card,
  body.sm-win .stat-card,
  body.sm-win .chart-wrap,
  body.sm-win .target-card,
  body.sm-win .dss-team-panel,
  body.sm-win .dss-global,
  body.sm-win .dss-sb-wrap,
  body.sm-win .dss-report,
  body.sm-win .bet-item {
    border-color: rgba(0,255,136,.55) !important;
    box-shadow: 0 0 16px rgba(0,255,136,.30), inset 0 0 18px rgba(0,255,136,.06) !important;
    animation: smWinPulse 2.6s ease-in-out infinite !important;
    will-change: box-shadow, border-color;
  }
  @keyframes smWinPulse {
    0%,100% { box-shadow: 0 0 14px rgba(0,255,136,.28), inset 0 0 14px rgba(0,255,136,.05); border-color: rgba(0,255,136,.50) !important; }
    50%     { box-shadow: 0 0 32px rgba(0,255,136,.60), inset 0 0 28px rgba(0,255,136,.12); border-color: rgba(0,255,180,.90) !important; }
  }
  body.sm-win .bottom-nav {
    border-top-color: rgba(0,255,136,.40) !important;
    box-shadow: 0 -3px 24px rgba(0,255,136,.35) !important;
  }
  body.sm-win::after {
    content: '';
    position: fixed; inset: 0; pointer-events: none; z-index: 0;
    background: radial-gradient(ellipse at 50% 100%, rgba(0,255,136,.055) 0%, transparent 60%);
    animation: smWinBg 3.5s ease-in-out infinite alternate;
    will-change: opacity;
  }
  @keyframes smWinBg { from{opacity:.4} to{opacity:1} }

  /* ── LOSS STREAK: glow roșu pe containere ── */
  body.sm-loss .form-card,
  body.sm-loss .stat-card,
  body.sm-loss .chart-wrap,
  body.sm-loss .target-card,
  body.sm-loss .dss-team-panel,
  body.sm-loss .dss-global,
  body.sm-loss .dss-sb-wrap,
  body.sm-loss .dss-report,
  body.sm-loss .bet-item {
    border-color: rgba(255,51,102,.55) !important;
    box-shadow: 0 0 16px rgba(255,51,102,.28), inset 0 0 18px rgba(255,51,102,.06) !important;
    animation: smLossPulse 2.4s ease-in-out infinite !important;
    will-change: box-shadow, border-color;
  }
  @keyframes smLossPulse {
    0%,100% { box-shadow: 0 0 14px rgba(255,51,102,.26), inset 0 0 14px rgba(255,51,102,.05); border-color: rgba(255,51,102,.50) !important; }
    50%     { box-shadow: 0 0 32px rgba(255,51,102,.58), inset 0 0 28px rgba(255,51,102,.12); border-color: rgba(255,100,130,.90) !important; }
  }
  body.sm-loss .bottom-nav {
    border-top-color: rgba(255,51,102,.40) !important;
    box-shadow: 0 -3px 24px rgba(255,51,102,.35) !important;
  }
  body.sm-loss::after {
    content: '';
    position: fixed; inset: 0; pointer-events: none; z-index: 0;
    background: radial-gradient(ellipse at 50% 0%, rgba(255,51,102,.055) 0%, transparent 60%);
    animation: smLossBg 3s ease-in-out infinite alternate;
    will-change: opacity;
  }
  @keyframes smLossBg { from{opacity:.4} to{opacity:1} }
  `;
  document.head.appendChild(el);
}

/* ══════════════════════════════════════════════════════════
   PARTICLE POOL — 24 particule pre-create, refolosite
══════════════════════════════════════════════════════════ */
let _pContainer = null;
const POOL_SIZE  = 24;

function buildParticlePool() {
  _pContainer = document.getElementById('sm-particles');
  if (!_pContainer) {
    _pContainer = document.createElement('div');
    _pContainer.id = 'sm-particles';
    document.body.appendChild(_pContainer);
  }

  const WIN_COLORS  = ['#00ff88','#00ffcc','#66ffaa','#aaffdd'];
  const LOSS_COLORS = ['#ff3366','#ff6644','#ff0044','#ff8866'];

  for (let i = 0; i < POOL_SIZE; i++) {
    const p = document.createElement('div');
    p.className = 'sm-p';
    const size  = 4 + Math.random() * 11;
    const dur   = (2.2 + Math.random() * 2).toFixed(2);
    const delay = (Math.random() * 2.4).toFixed(2);
    const left  = (Math.random() * 98).toFixed(1);
    const dx    = ((Math.random() - 0.5) * 80).toFixed(0);

    p.style.cssText = `
      width: ${size}px;
      height: ${size}px;
      left: ${left}%;
      --dur: ${dur}s;
      --delay: ${delay}s;
      --dx: ${dx}px;
      border-radius: ${Math.random() > .45 ? '50%' : '4px'};
    `;

    // Store color sets on element
    p.dataset.winColor  = WIN_COLORS [Math.floor(Math.random() * WIN_COLORS.length)];
    p.dataset.lossColor = LOSS_COLORS[Math.floor(Math.random() * LOSS_COLORS.length)];
    p.style.display = 'none';
    _pContainer.appendChild(p);
    _particlePool.push(p);
  }
}

function showParticles(type) {
  if (!_pContainer) return;
  _pContainer.classList.add('sm-active');
  const color_key = type === 'win' ? 'winColor' : 'lossColor';
  const cls       = type === 'win' ? 'sm-p-win'  : 'sm-p-loss';

  _particlePool.forEach(p => {
    // Remove previous class
    p.classList.remove('sm-p-win', 'sm-p-loss');
    p.classList.add(cls);
    const color = p.dataset[color_key === 'winColor' ? 'winColor' : 'lossColor'];
    p.style.background  = color;
    p.style.boxShadow   = `0 0 ${parseInt(p.style.width) * 2}px ${color}`;
    p.style.display     = 'block';
    // Reset animation by toggling class
    p.style.animationName = 'none';
    void p.offsetWidth; // minimal reflow — unavoidable for animation restart
    p.style.animationName = '';
  });
}

function hideParticles() {
  if (!_pContainer) return;
  _pContainer.classList.remove('sm-active');
  _particlePool.forEach(p => {
    p.classList.remove('sm-p-win', 'sm-p-loss');
    p.style.display = 'none';
  });
}

/* ══════════════════════════════════════════════════════════
   DETECȚIE STREAK — debounced
══════════════════════════════════════════════════════════ */
function detectStreak() {
  // Debounce: dacă e apelat de mai multe ori rapid, execută o singură dată
  clearTimeout(_detectTimer);
  _detectTimer = setTimeout(_doDetect, 120);
}

function _doDetect() {
  let bets = [];
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) bets = JSON.parse(raw);
  } catch { return; }

  const settled = bets.filter(b =>
    b.status === 'win' || b.status === 'loss' || b.status === 'cashout'
  );
  if (!settled.length) { _clearMode(); return; }

  let wins = 0, losses = 0;
  for (let i = settled.length - 1; i >= 0; i--) {
    const st = settled[i].status;
    if (st === 'win' || st === 'cashout') {
      if (losses > 0) break;
      wins++;
    } else {
      if (wins > 0) break;
      losses++;
    }
  }

  if      (wins   >= STREAK_THRESHOLD) _activateMode('win',  wins);
  else if (losses >= STREAK_THRESHOLD) _activateMode('loss', losses);
  else                                  _clearMode();
}

/* ══════════════════════════════════════════════════════════
   ACTIVARE / DEZACTIVARE
══════════════════════════════════════════════════════════ */
function _activateMode(type, count) {
  if (_currentMode === type) return; // deja activ — nu face nimic
  _clearMode(false);
  _currentMode = type;

  document.body.classList.add(type === 'win' ? 'sm-win' : 'sm-loss');
  showParticles(type);
  _showToast(type, count);

  if (type === 'win' && typeof window.confetti === 'function') {
    window.confetti({
      particleCount: 60,
      spread: 80,
      colors: ['#00ff88','#00ffcc','#66ffaa','#ffffff'],
      origin: { y: 0.7 },
      scalar: 0.9,
    });
  }
}

function _clearMode(resetVar = true) {
  document.body.classList.remove('sm-win', 'sm-loss');
  hideParticles();
  if (resetVar) _currentMode = null;
}

/* ══════════════════════════════════════════════════════════
   TOAST
══════════════════════════════════════════════════════════ */
function _showToast(type, count) {
  const toast = document.getElementById('streak-toast');
  if (!toast) return;
  if (_toastTimer) clearTimeout(_toastTimer);

  const isWin = type === 'win';
  toast.className = `sm-${type} sm-visible`;
  toast.innerHTML =
    `<span class="sm-toast-icon">${isWin ? '🔥' : '❄️'}</span>` +
    `<span>` +
      `<span class="sm-toast-main">${isWin ? 'WIN STREAK!' : 'LOSS STREAK!'}</span>` +
      `<span class="sm-toast-sub">${count} bilete ${isWin ? 'câștigătoare' : 'pierdute'} consecutiv</span>` +
    `</span>` +
    `<span class="sm-toast-icon">${isWin ? '🔥' : '❄️'}</span>`;

  _toastTimer = setTimeout(() => {
    toast.classList.remove('sm-visible');
  }, 5000);
}

/* ══════════════════════════════════════════════════════════
   HOOK PE changeStatus
══════════════════════════════════════════════════════════ */
function _hookApp() {
  let tries = 0;
  const iv = setInterval(() => {
    tries++;
    if (typeof window.changeStatus === 'function' && !window._smHooked) {
      const orig = window.changeStatus;
      window.changeStatus = function(id, st) {
        const r = orig(id, st);
        detectStreak(); // debounced internă
        return r;
      };
      window._smHooked = true;
      clearInterval(iv);
    }
    if (tries > 50) clearInterval(iv);
  }, 200);
}

/* ══════════════════════════════════════════════════════════
   INIT
══════════════════════════════════════════════════════════ */
function _init() {
  injectCSS();
  buildParticlePool();
  _hookApp();
  setTimeout(detectStreak, 700);
}

// API publică
window.streakMode = {
  detect: detectStreak,
  clear:  _clearMode,
  mode:   () => _currentMode,
};

if (document.readyState === 'loading')
  document.addEventListener('DOMContentLoaded', _init);
else
  _init();

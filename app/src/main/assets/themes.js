/* ═══════════════════════════════════════════════════════════════
   themes.js — Sistem teme premium pentru rGdbet
   Teme: neon | aurora | sunset | cyber | matrix | gold
   Fiecare temă are culori vii, gradiente și efecte luminoase
═══════════════════════════════════════════════════════════════ */
'use strict';

const THEMES = [
  {
    id: 'neon',
    label: 'NEON',
    icon: '⚡',
    vars: {
      '--bg':      '#06090f',
      '--bg2':     '#0a0f1a',
      '--card':    'rgba(0,20,50,0.75)',
      '--border':  'rgba(0,200,255,0.25)',
      '--ng':      '#00ff88',
      '--nb':      '#00c8ff',
      '--np':      '#bf5fff',
      '--gold':    '#ffcc00',
      '--danger':  '#ff3366',
      '--text':    '#e8f4ff',
      '--text2':   '#7ec8e3',
      '--text3':   '#b0d4e8',
      '--accent1': '#00c8ff',
      '--accent2': '#00ff88',
      '--glow1':   'rgba(0,200,255,0.35)',
      '--glow2':   'rgba(0,255,136,0.25)',
    },
    bodyClass: 'theme-neon',
    bgGradient: 'radial-gradient(ellipse at 20% 0%, rgba(0,200,255,0.12) 0%, transparent 60%), radial-gradient(ellipse at 80% 100%, rgba(0,255,136,0.08) 0%, transparent 60%), linear-gradient(180deg,#06090f 0%,#080c14 100%)',
  },
  {
    id: 'aurora',
    label: 'AURORA',
    icon: '🌌',
    vars: {
      '--bg':      '#050812',
      '--bg2':     '#080d1c',
      '--card':    'rgba(10,5,40,0.78)',
      '--border':  'rgba(180,80,255,0.28)',
      '--ng':      '#40ffb0',
      '--nb':      '#a855f7',
      '--np':      '#ec4899',
      '--gold':    '#fbbf24',
      '--danger':  '#f87171',
      '--text':    '#f0e8ff',
      '--text2':   '#c084fc',
      '--text3':   '#e0d0ff',
      '--accent1': '#a855f7',
      '--accent2': '#40ffb0',
      '--glow1':   'rgba(168,85,247,0.40)',
      '--glow2':   'rgba(64,255,176,0.25)',
    },
    bodyClass: 'theme-aurora',
    bgGradient: 'radial-gradient(ellipse at 10% 20%, rgba(168,85,247,0.18) 0%, transparent 55%), radial-gradient(ellipse at 90% 80%, rgba(64,255,176,0.12) 0%, transparent 55%), radial-gradient(ellipse at 50% 50%, rgba(236,72,153,0.08) 0%, transparent 70%), linear-gradient(160deg,#050812 0%,#0a0520 100%)',
  },
  {
    id: 'sunset',
    label: 'SUNSET',
    icon: '🔥',
    vars: {
      '--bg':      '#0f0805',
      '--bg2':     '#180c06',
      '--card':    'rgba(40,10,5,0.78)',
      '--border':  'rgba(255,100,30,0.28)',
      '--ng':      '#fbbf24',
      '--nb':      '#f97316',
      '--np':      '#ec4899',
      '--gold':    '#fde68a',
      '--danger':  '#ef4444',
      '--text':    '#fff1e6',
      '--text2':   '#fdba74',
      '--text3':   '#fed7aa',
      '--accent1': '#f97316',
      '--accent2': '#fbbf24',
      '--glow1':   'rgba(249,115,22,0.40)',
      '--glow2':   'rgba(251,191,36,0.28)',
    },
    bodyClass: 'theme-sunset',
    bgGradient: 'radial-gradient(ellipse at 0% 0%, rgba(239,68,68,0.20) 0%, transparent 50%), radial-gradient(ellipse at 100% 100%, rgba(251,191,36,0.15) 0%, transparent 55%), linear-gradient(160deg,#0f0805 0%,#180a04 100%)',
  },
  {
    id: 'cyber',
    label: 'CYBER',
    icon: '🤖',
    vars: {
      '--bg':      '#050f0a',
      '--bg2':     '#080f0c',
      '--card':    'rgba(0,30,15,0.80)',
      '--border':  'rgba(0,255,128,0.22)',
      '--ng':      '#00ff80',
      '--nb':      '#00ffcc',
      '--np':      '#80ff00',
      '--gold':    '#ccff00',
      '--danger':  '#ff4060',
      '--text':    '#e0ffe8',
      '--text2':   '#66ffaa',
      '--text3':   '#99ffcc',
      '--accent1': '#00ff80',
      '--accent2': '#ccff00',
      '--glow1':   'rgba(0,255,128,0.38)',
      '--glow2':   'rgba(204,255,0,0.25)',
    },
    bodyClass: 'theme-cyber',
    bgGradient: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,128,0.015) 2px, rgba(0,255,128,0.015) 4px), radial-gradient(ellipse at 50% 0%, rgba(0,255,128,0.15) 0%, transparent 60%), linear-gradient(180deg,#050f0a 0%,#040c08 100%)',
  },
  {
    id: 'gold',
    label: 'GOLD',
    icon: '👑',
    vars: {
      '--bg':      '#0c0900',
      '--bg2':     '#140d00',
      '--card':    'rgba(30,20,0,0.80)',
      '--border':  'rgba(255,200,0,0.25)',
      '--ng':      '#ffd700',
      '--nb':      '#ffaa00',
      '--np':      '#ff6600',
      '--gold':    '#ffe066',
      '--danger':  '#ff4444',
      '--text':    '#fff8e0',
      '--text2':   '#ffd060',
      '--text3':   '#ffe8a0',
      '--accent1': '#ffaa00',
      '--accent2': '#ffd700',
      '--glow1':   'rgba(255,170,0,0.42)',
      '--glow2':   'rgba(255,215,0,0.28)',
    },
    bodyClass: 'theme-gold',
    bgGradient: 'radial-gradient(ellipse at 30% 0%, rgba(255,200,0,0.18) 0%, transparent 55%), radial-gradient(ellipse at 70% 100%, rgba(255,100,0,0.12) 0%, transparent 55%), linear-gradient(160deg,#0c0900 0%,#150b00 100%)',
  },
  {
    id: 'matrix',
    label: 'MATRIX',
    icon: '💊',
    vars: {
      '--bg':      '#020602',
      '--bg2':     '#040a04',
      '--card':    'rgba(0,20,0,0.85)',
      '--border':  'rgba(0,200,60,0.22)',
      '--ng':      '#00ff41',
      '--nb':      '#00cc33',
      '--np':      '#66ff66',
      '--gold':    '#aaff00',
      '--danger':  '#ff3300',
      '--text':    '#e0ffe0',
      '--text2':   '#55ff55',
      '--text3':   '#99ff99',
      '--accent1': '#00ff41',
      '--accent2': '#aaff00',
      '--glow1':   'rgba(0,255,65,0.38)',
      '--glow2':   'rgba(170,255,0,0.22)',
    },
    bodyClass: 'theme-matrix',
    bgGradient: 'repeating-linear-gradient(90deg, transparent, transparent 3px, rgba(0,255,65,0.012) 3px, rgba(0,255,65,0.012) 6px), radial-gradient(ellipse at 50% 50%, rgba(0,200,60,0.10) 0%, transparent 70%), linear-gradient(180deg,#020602 0%,#030804 100%)',
  },
];

let currentThemeIdx = 0;

/* ── Aplică tema ── */
function applyTheme(theme) {
  // Setează variabilele CSS
  const root = document.documentElement;
  Object.entries(theme.vars).forEach(([k, v]) => root.style.setProperty(k, v));

  // Salvăm gradientul temei într-o variabilă CSS în loc să suprascriem body direct
  // Acest lucru permite imaginii de fundal din CSS să rămână vizibilă sub gradient
  root.style.setProperty('--theme-gradient', theme.bgGradient);

  // Clase body
  THEMES.forEach(t => document.body.classList.remove(t.bodyClass));
  document.body.classList.add(theme.bodyClass);

  // Update buton
  const icon  = document.getElementById('themeCycleIcon');
  const label = document.getElementById('themeCycleLabel');
  if (icon)  icon.textContent  = theme.icon;
  if (label) label.textContent = theme.label;

  // Salvează preferința
  localStorage.setItem('rgb_theme', theme.id);

  // Update chart dacă există
  if (typeof updateChart === 'function') setTimeout(updateChart, 100);
}

/* ── Cycle tema la click ── */
window.cycleTheme = function () {
  currentThemeIdx = (currentThemeIdx + 1) % THEMES.length;
  applyTheme(THEMES[currentThemeIdx]);

  // Animație flash pe buton
  const btn = document.getElementById('themeCycleBtn');
  if (btn) {
    btn.classList.add('theme-btn-flash');
    setTimeout(() => btn.classList.remove('theme-btn-flash'), 400);
  }
};

/* ── Init: restaurează tema salvată ── */
(function initTheme() {
  const saved = localStorage.getItem('rgb_theme') || 'neon';
  const idx   = THEMES.findIndex(t => t.id === saved);
  currentThemeIdx = idx >= 0 ? idx : 0;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => applyTheme(THEMES[currentThemeIdx]));
  } else {
    applyTheme(THEMES[currentThemeIdx]);
  }
})();

// Expune pentru eventuale alte scripturi
window.THEMES    = THEMES;
window.applyTheme = applyTheme;

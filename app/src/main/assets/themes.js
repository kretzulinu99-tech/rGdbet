/* ═══════════════════════════════════════════════════════════════
   themes.js — Sistem teme premium rGdbet (v17.0 Apex Ultimate)
   Teme ultra-complexe: obsidian | emerald | inferno | amethyst | vortex
═══════════════════════════════════════════════════════════════ */
'use strict';

const THEMES = [
  {
    id: 'neon',
    label: 'Cyber Neon',
    icon: '⚡',
    vars: {
      '--bg': '#06090f', '--bg2': '#0a0f1a', '--card': 'rgba(10,15,25,0.4)', '--border': 'rgba(0,200,255,0.4)',
      '--ng': '#00ff88', '--nb': '#00c8ff', '--np': '#bf5fff', '--gold': '#ffcc00', '--danger': '#ff3366',
      '--text': '#ffffff', '--text2': '#7ec8e3', '--text3': '#b0d4e8', '--glow': 'rgba(0,200,255,0.6)',
      '--card-radius': '14px', '--card-blur': '15px', '--card-shadow': '0 8px 32px rgba(0,0,0,0.8)',
      '--border-weight': '1.5px', '--border-style': 'solid', '--font-ls': '1px', '--font-up': 'none'
    },
    bodyClass: 'theme-neon',
    bgGradient: 'radial-gradient(circle at 20% 0%, rgba(0,200,255,0.15) 0%, transparent 50%), linear-gradient(180deg,#06090f 0%,#0a0f1a 100%)'
  },
  {
    id: 'obsidian',
    label: 'Obsidian Deep',
    icon: '💎',
    vars: {
      '--bg': '#020406', '--bg2': '#05070a', '--card': 'rgba(2,2,4,0.9)', '--border': 'rgba(212,175,55,0.4)',
      '--ng': '#ffffff', '--nb': '#d4af37', '--np': '#888888', '--gold': '#d4af37', '--danger': '#ff0000',
      '--text': '#ffffff', '--text2': '#aaaaaa', '--text3': '#666666', '--glow': 'rgba(212,175,55,0.3)',
      '--card-radius': '0px', '--card-blur': '8px', '--card-shadow': '0 20px 50px rgba(0,0,0,1)',
      '--border-weight': '2px', '--border-style': 'solid', '--font-ls': '3px', '--font-up': 'uppercase'
    },
    bodyClass: 'theme-obsidian',
    bgGradient: 'linear-gradient(180deg, #020406 0%, #080a0f 100%)'
  },
  {
    id: 'emerald',
    label: 'Emerald Wealth',
    icon: '🍀',
    vars: {
      '--bg': '#040d08', '--bg2': '#061a10', '--card': 'rgba(8,30,15,0.45)', '--border': 'rgba(0,255,136,0.5)',
      '--ng': '#00ffa2', '--nb': '#059669', '--np': '#10b981', '--gold': '#fcd34d', '--danger': '#ef4444',
      '--text': '#ecfdf5', '--text2': '#6ee7b7', '--text3': '#a7f3d0', '--glow': 'rgba(0,255,136,0.4)',
      '--card-radius': '24px', '--card-blur': '12px', '--card-shadow': '0 12px 40px rgba(0,255,136,0.15)',
      '--border-weight': '1px', '--border-style': 'double', '--font-ls': '0.5px', '--font-up': 'none'
    },
    bodyClass: 'theme-emerald',
    bgGradient: 'radial-gradient(circle at top, rgba(0,255,136,0.15) 0%, transparent 70%), linear-gradient(180deg,#040d08 0%,#061a10 100%)'
  },
  {
    id: 'inferno',
    label: 'Inferno Strike',
    icon: '🔥',
    vars: {
      '--bg': '#0d0404', '--bg2': '#1a0606', '--card': 'rgba(40,10,10,0.5)', '--border': 'rgba(255,61,0,0.6)',
      '--ng': '#ff9100', '--nb': '#ff3d00', '--np': '#d32f2f', '--gold': '#ffea00', '--danger': '#ff1744',
      '--text': '#fff5f5', '--text2': '#ffab91', '--text3': '#ffccbc', '--glow': 'rgba(255,61,0,0.7)',
      '--card-radius': '18px 4px', '--card-blur': '10px', '--card-shadow': '0 10px 40px rgba(255,61,0,0.3)',
      '--border-weight': '2px', '--border-style': 'dashed', '--font-ls': '1px', '--font-up': 'none'
    },
    bodyClass: 'theme-inferno',
    bgGradient: 'radial-gradient(circle at 50% -20%, rgba(255,61,0,0.2) 0%, transparent 60%), linear-gradient(180deg,#0d0404 0%,#1a0606 100%)'
  },
  {
    id: 'vortex',
    label: 'Cosmic Vortex',
    icon: '🌀',
    vars: {
      '--bg': '#020008', '--bg2': '#08001a', '--card': 'rgba(15,0,40,0.4)', '--border': 'rgba(180,80,255,0.5)',
      '--ng': '#a855f7', '--nb': '#6366f1', '--np': '#ec4899', '--gold': '#fbbf24', '--danger': '#f43f5e',
      '--text': '#f5f3ff', '--text2': '#c4b5fd', '--text3': '#ddd6fe', '--glow': 'rgba(139,92,246,0.6)',
      '--card-radius': '30px', '--card-blur': '40px', '--card-shadow': '0 0 40px rgba(139,92,246,0.3)',
      '--border-weight': '1px', '--border-style': 'solid', '--font-ls': '4px', '--font-up': 'uppercase'
    },
    bodyClass: 'theme-vortex',
    bgGradient: 'conic-gradient(from 180deg at 50% 50%, #020008, #08001a, #020008)'
  }
];

function applyThemeById(id) {
  const theme = THEMES.find(t => t.id === id) || THEMES[0];
  const root = document.documentElement;
  Object.entries(theme.vars).forEach(([k, v]) => root.style.setProperty(k, v));
  root.style.setProperty('--theme-gradient', theme.bgGradient);

  THEMES.forEach(t => document.body.classList.remove(t.bodyClass));
  document.body.classList.add(theme.bodyClass);
  localStorage.setItem('rgb_theme', theme.id);

  updateThemeFX(theme.id);

  if (typeof updateChart === 'function') setTimeout(updateChart, 100);
}

function updateThemeFX(id) {
  const layer = document.getElementById('theme-fx-layer');
  if (!layer) return;
  layer.innerHTML = '';

  let count = 0;
  if (id === 'emerald') count = 20;
  if (id === 'inferno') count = 35;
  if (id === 'vortex') count = 30;

  for (let i = 0; i < count; i++) {
    const p = document.createElement('div');
    p.className = 'theme-fx-particle';
    const size = Math.random() * (id === 'vortex' ? 10 : 5) + 2;
    p.style.width = size + 'px';
    p.style.height = size + 'px';
    p.style.left = Math.random() * 100 + '%';
    p.style.top = Math.random() * 100 + '%';
    p.style.animationDelay = (Math.random() * 10) + 's';
    p.style.animationDuration = (id === 'inferno' ? 3 : 8) + Math.random() * 5 + 's';
    if (id === 'vortex') {
        p.style.background = `rgba(${Math.random()*255}, ${Math.random()*255}, 255, 0.6)`;
        p.style.boxShadow = `0 0 15px ${p.style.background}`;
    }
    layer.appendChild(p);
  }
}

window.setTheme = function(id) {
  applyThemeById(id);
  const cards = document.querySelectorAll('.theme-option-card');
  cards.forEach(c => {
    c.classList.remove('active');
    if (c.dataset.theme === id) c.classList.add('active');
  });
};

(function initTheme() {
  const saved = localStorage.getItem('rgb_theme') || 'neon';
  applyThemeById(saved);
})();

window.THEMES = THEMES;
window.applyThemeById = applyThemeById;

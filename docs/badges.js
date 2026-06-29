/* ═══════════════════════════════════════════════════════════════
   badges.js — Sistem Gamificare (Realizări & Insigne)
   rGdbet ELITE v4.0
═══════════════════════════════════════════════════════════════ */
'use strict';

const BADGE_STORAGE_KEY = 'rgb_unlocked_badges';

const BADGES_CONFIG = [
  {
    id: 'on_fire',
    name: 'Pe Val',
    desc: 'Câștigă 5 bilete consecutive (Win Streak)',
    icon: '🔥',
    goal: 5,
    check: (stats) => stats.maxWinStreak || 0,
    color: '#ff4500'
  },
  {
    id: 'golden_ticket',
    name: 'Biletul de Aur',
    desc: 'Atinge un număr total de 50 de bilete plasate',
    icon: '🏆',
    goal: 50,
    check: (stats) => stats.total || 0,
    color: '#ffcc00'
  },
  {
    id: 'high_roller',
    name: 'High Roller',
    desc: 'Câștigă o sumă totală de 1000 RON',
    icon: '💎',
    goal: 1000,
    check: (stats) => stats.totalWonAmount || 0,
    color: '#b026ff'
  },
  {
    id: 'loyal_user',
    name: 'Analist Fidel',
    desc: 'Folosește aplicația în 7 zile diferite',
    icon: '📅',
    goal: 7,
    check: (stats) => stats.daysActive || 1,
    color: '#00c8ff'
  }
];

window.openBadgesModal = function() {
  const modal = document.getElementById('badges-modal');
  if (!modal) return;

  renderBadgesGrid();
  modal.style.display = 'flex';
};

function getUnlockedBadges() {
  try {
    return JSON.parse(localStorage.getItem(BADGE_STORAGE_KEY) || '[]');
  } catch { return []; }
}

function saveUnlockedBadge(id) {
  const unlocked = getUnlockedBadges();
  if (!unlocked.includes(id)) {
    unlocked.push(id);
    localStorage.setItem(BADGE_STORAGE_KEY, JSON.stringify(unlocked));
    showBadgeUnlockCelebration(id);
  }
}

function renderBadgesGrid() {
  const grid = document.getElementById('badges-grid');
  if (!grid) return;

  const stats = getExtendedStats();
  const unlocked = getUnlockedBadges();

  grid.innerHTML = BADGES_CONFIG.map(badge => {
    const currentProgress = badge.check(stats);
    const isUnlocked = currentProgress >= badge.goal;
    const progressPct = Math.min(100, Math.round((currentProgress / badge.goal) * 100));

    if (isUnlocked && !unlocked.includes(badge.id)) {
      saveUnlockedBadge(badge.id);
    }

    return `
      <div class="badge-card ${isUnlocked ? 'unlocked' : 'locked'}" onclick="showBadgeDetail('${badge.id}')">
        <div class="badge-icon-wrap">
          <div class="badge-icon">${badge.icon}</div>
          ${!isUnlocked ? '<div class="badge-lock"><i class="fa-solid fa-lock"></i></div>' : ''}
        </div>
        <div class="badge-name">${badge.name}</div>
        <div class="badge-progress-container">
          <div class="badge-progress-bar" style="width: ${progressPct}%; background: ${badge.color};"></div>
        </div>
        <div class="badge-progress-text">${currentProgress} / ${badge.goal}</div>
      </div>
    `;
  }).join('');
}

function getExtendedStats() {
  let bets = [];
  try { bets = JSON.parse(localStorage.getItem('rgb_bets') || '[]'); } catch {}

  const settled = bets.filter(b => b.status === 'win' || b.status === 'loss');
  let currentStreak = 0;
  let maxStreak = 0;
  let totalWon = 0;

  // Calculăm streak-ul maxim din tot istoricul
  bets.forEach(b => {
    if (b.status === 'win') {
      currentStreak++;
      if (currentStreak > maxStreak) maxStreak = currentStreak;
      totalWon += (b.stake * b.odds);
    } else if (b.status === 'loss') {
      currentStreak = 0;
    }
  });

  return {
    total: bets.length,
    maxWinStreak: maxStreak,
    totalWonAmount: totalWon,
    daysActive: 1 // TODO: Implementare tracker zile
  };
}

function showBadgeDetail(id) {
  const badge = BADGES_CONFIG.find(b => b.id === id);
  if (!badge) return;

  const stats = getExtendedStats();
  const currentProgress = badge.check(stats);
  const isUnlocked = currentProgress >= badge.goal;

  showMsgToast(`${badge.name}: ${badge.desc}${isUnlocked ? ' 🎉' : ''}`, isUnlocked ? 'success' : 'info');
}

function showBadgeUnlockCelebration(id) {
  const badge = BADGES_CONFIG.find(b => b.id === id);
  confetti({
    particleCount: 150,
    spread: 70,
    origin: { y: 0.6 },
    colors: [badge.color, '#ffffff', '#ffcc00']
  });
  showMsgToast(`FELICITĂRI! Ai deblocat insigna: ${badge.name} 🏆`, 'success');
}

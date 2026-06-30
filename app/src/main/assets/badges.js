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
    desc: 'Câștigă 5 bilete consecutive (Win Streak). Arată că ești într-o formă de invidiat!',
    icon: '🔥',
    goal: 5,
    check: (stats) => stats.maxWinStreak || 0,
    color: '#ff4500'
  },
  {
    id: 'golden_ticket',
    name: 'Biletul de Aur',
    desc: 'Plasează un număr total de 50 de bilete. Cantitatea se transformă în experiență!',
    icon: '🏆',
    goal: 50,
    check: (stats) => stats.total || 0,
    color: '#ffcc00'
  },
  {
    id: 'high_roller',
    name: 'High Roller',
    desc: 'Câștigă o sumă totală de 1000 RON. Joci în liga mare a profitului!',
    icon: '💎',
    goal: 1000,
    check: (stats) => stats.totalWonAmount || 0,
    color: '#b026ff'
  },
  {
    id: 'sniper',
    name: 'Sniper',
    desc: 'Câștigă un bilet cu o cotă de peste 5.00. Precizie chirurgicală!',
    icon: '🎯',
    goal: 1, // Cel puțin un bilet cu cota mare
    check: (stats) => stats.maxSingleOdds >= 5 ? 1 : 0,
    color: '#00ff88'
  },
  {
    id: 'strategist',
    name: 'Strategist',
    desc: 'Câștigă 10 bilete folosind analizele AI. Demonstrează că stăpânești datele!',
    icon: '♟️',
    goal: 10,
    check: (stats) => stats.winSolist || 0,
    color: '#ffffff'
  },
  {
    id: 'over_achiever',
    name: 'Over Achiever',
    desc: 'Câștigă 10 bilete de tip "Goluri". Ai ochiul format pentru spectacol!',
    icon: '⚽',
    goal: 10,
    check: (stats) => stats.winGoals || 0,
    color: '#00c8ff'
  },
  {
    id: 'comeback_king',
    name: 'Comeback King',
    desc: 'Câștigă un bilet după o serie de 3 pierderi. Nu te dai bătut niciodată!',
    icon: '👑',
    goal: 1,
    check: (stats) => stats.comebacks || 0,
    color: '#ff9900'
  },
  {
    id: 'night_owl',
    name: 'Bufnița de Noapte',
    desc: 'Plasează 10 bilete după ora 22:00. Pariurile nu dorm niciodată!',
    icon: '🦉',
    goal: 10,
    check: (stats) => stats.nightBets || 0,
    color: '#3d5afe'
  },
  {
    id: 'early_bird',
    name: 'Pasăre Matinală',
    desc: 'Plasează 10 bilete înainte de ora 10:00. Începi ziua cu profit!',
    icon: '☀️',
    goal: 10,
    check: (stats) => stats.morningBets || 0,
    color: '#f4ff81'
  },
  {
    id: 'bankroll_master',
    name: 'Bankroll Master',
    desc: 'Atinge un profit net de +500 RON. Gestionezi banca ca un profesionist!',
    icon: '🏦',
    goal: 500,
    check: (stats) => stats.netProfit || 0,
    color: '#4caf50'
  },
  {
    id: 'combo_master',
    name: 'Combo Master',
    desc: 'Câștigă un bilet cu minim 5 evenimente. Arta biletelor lungi!',
    icon: '📜',
    goal: 1,
    check: (stats) => stats.maxComboSize >= 5 ? 1 : 0,
    color: '#ffc107'
  },
  {
    id: 'expert_analyst',
    name: 'Analist Expert',
    desc: 'Folosește AI Pro Analyst de 10 ori. Tehnologia este aliatul tău!',
    icon: '🧠',
    goal: 10,
    check: (stats) => stats.aiConsultations || 0,
    color: '#e040fb'
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
        <div class="badge-instructions" style="font-family: 'Rajdhani', sans-serif; font-size: 11px; color: rgba(255,255,255,0.5); margin-bottom: 10px; line-height: 1.3;">
          ${badge.desc}
        </div>
        <div class="badge-progress-container">
          <div class="badge-progress-bar" style="width: ${progressPct}%; background: ${badge.color};"></div>
        </div>
        <div class="badge-progress-text">${Math.floor(currentProgress)} / ${badge.goal}</div>
      </div>
    `;
  }).join('');
}

function getExtendedStats() {
  let bets = [];
  try { bets = JSON.parse(localStorage.getItem('rgb_bets') || '[]'); } catch {}

  let currentStreak = 0;
  let maxStreak = 0;
  let totalWon = 0;
  let maxOdds = 0;
  let winSolist = 0;
  let winGoals = 0;
  let currentLossStreak = 0;
  let comebacks = 0;
  let nightBets = 0;
  let morningBets = 0;
  let maxCombo = 0;
  let netProfit = 0;

  bets.forEach(b => {
    const d = new Date(b.date || Date.now());
    const hours = d.getHours();
    if (hours >= 22 || hours < 6) nightBets++;
    if (hours >= 6 && hours < 10) morningBets++;

    if (b.status === 'win') {
      currentStreak++;
      if (currentStreak > maxStreak) maxStreak = currentStreak;
      totalWon += (b.stake * b.odds);
      netProfit += (b.stake * (b.odds - 1));

      if (b.odds > maxOdds) maxOdds = b.odds;
      if (b.type === 'solist') winSolist++;
      if (b.type === 'goluri') winGoals++;
      if (b.events && b.events.length > maxCombo) maxCombo = b.events.length;

      if (currentLossStreak >= 3) comebacks++;
      currentLossStreak = 0;
    } else if (b.status === 'loss') {
      currentStreak = 0;
      currentLossStreak++;
      netProfit -= b.stake;
    }
  });

  return {
    total: bets.length,
    maxWinStreak: maxStreak,
    totalWonAmount: totalWon,
    maxSingleOdds: maxOdds,
    winSolist: winSolist,
    winGoals: winGoals,
    comebacks: comebacks,
    nightBets: nightBets,
    morningBets: morningBets,
    maxComboSize: maxCombo,
    netProfit: netProfit,
    aiConsultations: parseInt(localStorage.getItem('rgb_ai_usage') || '0')
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
  if (typeof confetti === 'function') {
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 },
      colors: [badge.color, '#ffffff', '#ffcc00']
    });
  }
  showMsgToast(`FELICITĂRI! Ai deblocat insigna: ${badge.name} 🏆`, 'success');
}

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
    id: 'event_collector',
    name: 'Colecționarul',
    desc: 'Adaugă un total de 100 de evenimente pe biletele tale. Analizezi piața în detaliu!',
    icon: '📚',
    goal: 100,
    check: (stats) => stats.totalEventsPlaced || 0,
    color: '#00c8ff'
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
    goal: 1,
    check: (stats) => stats.maxSingleOdds >= 5 ? 1 : 0,
    color: '#00ff88'
  },
  {
    id: 'event_winner',
    name: 'Maestrul Selecțiilor',
    desc: 'Câștigă un total de 50 de evenimente individuale. Ai ochiul format pentru predictii corecte!',
    icon: '✅',
    goal: 50,
    check: (stats) => stats.totalEventsWon || 0,
    color: '#4caf50'
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
    id: 'volume_king',
    name: 'Regele Volumului',
    desc: 'Câștigă un bilet cu minim 8 evenimente selectate. Record de selecții corecte pe un singur bilet!',
    icon: '⚡',
    goal: 1,
    check: (stats) => stats.maxComboSize >= 8 ? 1 : 0,
    color: '#ffeb3b'
  },
  {
    id: 'steady_winner',
    name: 'Constantin cel Câștigător',
    desc: 'Câștigă minim un bilet pe zi timp de 3 zile la rând. Consistența este cheia succesului!',
    icon: '⚖️',
    goal: 3,
    check: (stats) => stats.dailyWinStreak || 0,
    color: '#8bc34a'
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
  let maxCombo = 0;
  let netProfit = 0;
  let totalEventsPlaced = 0;
  let totalEventsWon = 0;

  // Pentru calcularea streak-ului zilnic
  const winDates = new Set();

  bets.forEach(b => {
    const bEventsCount = (b.events && b.events.length) || 1;
    totalEventsPlaced += bEventsCount;

    if (b.status === 'win') {
      totalEventsWon += bEventsCount;
      currentStreak++;
      if (currentStreak > maxStreak) maxStreak = currentStreak;
      totalWon += (b.stake * b.odds);
      netProfit += (b.stake * (b.odds - 1));

      if (b.odds > maxOdds) maxOdds = b.odds;
      if (b.type === 'solist') winSolist++;
      if (b.type === 'goluri') winGoals++;
      if (bEventsCount > maxCombo) maxCombo = bEventsCount;

      if (currentLossStreak >= 3) comebacks++;
      currentLossStreak = 0;

      if (b.date) {
        winDates.add(new Date(b.date).toDateString());
      }
    } else if (b.status === 'loss') {
      currentStreak = 0;
      currentLossStreak++;
      netProfit -= b.stake;
    }
  });

  // Calculare daily win streak simplificată
  let dailyWinStreak = 0;
  if (winDates.size > 0) {
    // Sortăm datele și vedem dacă sunt consecutive
    const sortedDates = Array.from(winDates).map(d => new Date(d).getTime()).sort((a, b) => b - a);
    let tempStreak = 1;
    for (let i = 0; i < sortedDates.length - 1; i++) {
      const diff = (sortedDates[i] - sortedDates[i+1]) / (1000 * 60 * 60 * 24);
      if (diff === 1) {
        tempStreak++;
        if (tempStreak > dailyWinStreak) dailyWinStreak = tempStreak;
      } else {
        tempStreak = 1;
      }
    }
    if (tempStreak > dailyWinStreak) dailyWinStreak = tempStreak;
  }

  return {
    total: bets.length,
    maxWinStreak: maxStreak,
    totalWonAmount: totalWon,
    maxSingleOdds: maxOdds,
    winSolist: winSolist,
    winGoals: winGoals,
    comebacks: comebacks,
    maxComboSize: maxCombo,
    netProfit: netProfit,
    totalEventsPlaced: totalEventsPlaced,
    totalEventsWon: totalEventsWon,
    dailyWinStreak: dailyWinStreak
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

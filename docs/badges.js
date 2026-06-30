/* ═══════════════════════════════════════════════════════════════
   badges.js — Sistem Gamificare (Realizări & Insigne)
   rGdbet ELITE v4.0 — 30+ Achievements Edition
═══════════════════════════════════════════════════════════════ */
'use strict';

const BADGE_STORAGE_KEY = 'rgb_unlocked_badges';

const BADGES_CONFIG = [
  // ── SERII & CONSISTENȚĂ ──
  { id: 'on_fire', name: 'Pe Val', desc: 'Câștigă 5 bilete la rând.', icon: '🔥', goal: 5, check: (s) => s.maxWinStreak, color: '#ff4500' },
  { id: 'steady_winner', name: 'Constantin', desc: 'Câștigă un bilet pe zi, 3 zile la rând.', icon: '⚖️', goal: 3, check: (s) => s.dailyWinStreak, color: '#8bc34a' },
  { id: 'marathon', name: 'Maratonistul', desc: 'Câștigă bilete în 7 zile consecutive.', icon: '🏃', goal: 7, check: (s) => s.dailyWinStreak, color: '#4caf50' },
  { id: 'comeback_king', name: 'Regele Revenirii', desc: 'Câștigă după 3 pierderi consecutive.', icon: '👑', goal: 1, check: (s) => s.comebacks, color: '#ff9900' },

  // ── VOLUM BILETE & EVENIMENTE ──
  { id: 'rookie', name: 'Începător', desc: 'Plasează primele 10 bilete.', icon: '🌱', goal: 10, check: (s) => s.total, color: '#aed581' },
  { id: 'golden_ticket', name: 'Biletul de Aur', desc: 'Plasează 50 de bilete.', icon: '🏆', goal: 50, check: (s) => s.total, color: '#ffcc00' },
  { id: 'veteran', name: 'Veteran', desc: 'Plasează 100 de bilete.', icon: '🎖️', goal: 100, check: (s) => s.total, color: '#795548' },
  { id: 'event_collector', name: 'Colecționarul', desc: 'Adaugă 100 de evenimente pe bilete.', icon: '📚', goal: 100, check: (s) => s.totalEventsPlaced, color: '#00c8ff' },
  { id: 'event_master', name: 'Maestrul Selecțiilor', desc: 'Câștigă 50 de evenimente individuale.', icon: '✅', goal: 50, check: (s) => s.totalEventsWon, color: '#4caf50' },
  { id: 'encyclopedia', name: 'Enciclopedia', desc: 'Câștigă 200 de evenimente individuale.', icon: '📖', goal: 200, check: (s) => s.totalEventsWon, color: '#009688' },

  // ── COTE & COMBO-URI ──
  { id: 'sniper', name: 'Sniper', desc: 'Câștigă un bilet cu cotă peste 5.00.', icon: '🎯', goal: 1, check: (s) => s.maxSingleOdds >= 5 ? 1 : 0, color: '#00ff88' },
  { id: 'marksman', name: 'Trăgător Elită', desc: 'Câștigă un bilet cu cotă peste 10.00.', icon: '🏹', goal: 1, check: (s) => s.maxSingleOdds >= 10 ? 1 : 0, color: '#ff5722' },
  { id: 'combo_master', name: 'Combo Master', desc: 'Câștigă un bilet cu 5+ evenimente.', icon: '📜', goal: 1, check: (s) => s.maxComboSize >= 5 ? 1 : 0, color: '#ffc107' },
  { id: 'volume_king', name: 'Regele Volumului', desc: 'Câștigă un bilet cu 8+ evenimente.', icon: '⚡', goal: 1, check: (s) => s.maxComboSize >= 8 ? 1 : 0, color: '#ffeb3b' },
  { id: 'accumulator', name: 'Acumulatorul', desc: 'Câștigă un bilet cu 12+ evenimente.', icon: '🔋', goal: 1, check: (s) => s.maxComboSize >= 12 ? 1 : 0, color: '#cddc39' },

  // ── FINANCIAR & PROFIT ──
  { id: 'first_profit', name: 'Primul Profit', desc: 'Atinge un profit net de +50 RON.', icon: '💵', goal: 50, check: (s) => s.netProfit, color: '#81c784' },
  { id: 'bankroll_master', name: 'Bankroll Master', desc: 'Atinge un profit net de +500 RON.', icon: '🏦', goal: 500, check: (s) => s.netProfit, color: '#4caf50' },
  { id: 'millionaire', name: 'Miliardarul', desc: 'Atinge un profit net de +5000 RON.', icon: '💰', goal: 5000, check: (s) => s.netProfit, color: '#ff9800' },
  { id: 'high_roller', name: 'High Roller', desc: 'Câștigă un total de 1000 RON.', icon: '💎', goal: 1000, check: (s) => s.totalWonAmount, color: '#b026ff' },
  { id: 'whale', name: 'Balena', desc: 'Câștigă un total de 10000 RON.', icon: '🐋', goal: 10000, check: (s) => s.totalWonAmount, color: '#1a237e' },
  { id: 'investor', name: 'Investitorul', desc: 'Rulează (mizează) 2000 RON în total.', icon: '📊', goal: 2000, check: (s) => s.totalStaked, color: '#607d8b' },

  // ── SPORTURI SPECIFICE ──
  { id: 'football_fan', name: 'Microbistul', desc: 'Câștigă 10 bilete la Fotbal.', icon: '⚽', goal: 10, check: (s) => s.winFootball, color: '#388e3c' },
  { id: 'tennis_pro', name: 'Tenis Pro', desc: 'Câștigă 10 bilete la Tenis.', icon: '🎾', goal: 10, check: (s) => s.winTennis, color: '#cddc39' },
  { id: 'basket_star', name: 'Slam Dunk', desc: 'Câștigă 10 bilete la Baschet.', icon: '🏀', goal: 10, check: (s) => s.winBasketball, color: '#ff9800' },
  { id: 'multi_sport', name: 'Polivalentul', desc: 'Câștigă câte un bilet în 3 sporturi diferite.', icon: '🌈', goal: 3, check: (s) => s.sportsDiversified, color: '#9c27b0' },
  { id: 'all_rounder', name: 'Omul Bun la Toate', desc: 'Câștigă 5 bilete la categoria "Alte Sporturi".', icon: '🎮', goal: 5, check: (s) => s.winOther, color: '#9e9e9e' },

  // ── TIPURI DE PARIURI ──
  { id: 'goal_hunter', name: 'Vânătorul de Goluri', desc: 'Câștigă 10 bilete tip "Goluri".', icon: '🥅', goal: 10, check: (s) => s.winGoals, color: '#ff3366' },
  { id: 'corner_expert', name: 'Expert Cornere', desc: 'Câștigă 10 bilete tip "Cornere".', icon: '🚩', goal: 10, check: (s) => s.winCorners, color: '#03a9f4' },
  { id: 'card_shark', name: 'Regele Cartonașelor', desc: 'Câștigă 10 bilete tip "Cartonașe".', icon: '🟨', goal: 10, check: (s) => s.winCards, color: '#ffeb3b' },
  { id: 'half_time', name: 'Prima Repriză', desc: 'Câștigă 5 bilete tip "Goluri 1P".', icon: '⏱️', goal: 5, check: (s) => s.winHT, color: '#ff5722' },

  // ── UTILIZARE APLICAȚIE ──
  { id: 'social_butterfly', name: 'Popular', desc: 'Urmărește 10 pariori în Feed-ul Social.', icon: '🦋', goal: 10, check: (s) => s.followingCount, color: '#e91e63' },
  { id: 'content_creator', name: 'Influencer', desc: 'Postează 20 de bilete în Comunitate.', icon: '📸', goal: 20, check: (s) => s.postsCount, color: '#673ab7' },
  { id: 'loyal', name: 'Fidel rGdbet', desc: 'Folosește aplicația în 10 zile diferite.', icon: '🤝', goal: 10, check: (s) => s.daysActive, color: '#2196f3' }
];

window.openBadgesModal = function() {
  const modal = document.getElementById('badges-modal');
  if (!modal) return;
  renderBadgesGrid();
  modal.style.display = 'flex';
};

function getUnlockedBadges() {
  try { return JSON.parse(localStorage.getItem(BADGE_STORAGE_KEY) || '[]'); }
  catch { return []; }
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
    if (isUnlocked && !unlocked.includes(badge.id)) saveUnlockedBadge(badge.id);

    return `
      <div class="badge-card ${isUnlocked ? 'unlocked' : 'locked'}" onclick="showBadgeDetail('${badge.id}')">
        <div class="badge-icon-wrap">
          <div class="badge-icon">${badge.icon}</div>
          ${!isUnlocked ? '<div class="badge-lock"><i class="fa-solid fa-lock"></i></div>' : ''}
        </div>
        <div class="badge-name">${badge.name}</div>
        <div class="badge-instructions" style="font-family:'Manrope',sans-serif;font-size:10px;color:rgba(255,255,255,0.45);margin-bottom:8px;line-height:1.3;min-height:26px;">
          ${badge.desc}
        </div>
        <div class="badge-progress-container">
          <div class="badge-progress-bar" style="width:${progressPct}%;background:${badge.color};"></div>
        </div>
        <div class="badge-progress-text">${Math.floor(currentProgress)} / ${badge.goal}</div>
      </div>
    `;
  }).join('');
}

function getExtendedStats() {
  let bets = [];
  try { bets = JSON.parse(localStorage.getItem('rgb_bets') || '[]'); } catch {}

  let currentStreak = 0, maxStreak = 0, totalWon = 0, maxOdds = 0, netProfit = 0, totalStaked = 0;
  let winHT = 0, winGoals = 0, winCorners = 0, winCards = 0, winFootball = 0, winTennis = 0, winBasketball = 0, winOther = 0;
  let currentLossStreak = 0, comebacks = 0, maxCombo = 0, totalEventsPlaced = 0, totalEventsWon = 0;
  const winDates = new Set(), winSports = new Set(), activeDays = new Set();

  bets.forEach(b => {
    const eCount = (b.events && b.events.length) || 1;
    totalEventsPlaced += eCount;
    totalStaked += (parseFloat(b.stake) || 0);
    if (b.date) activeDays.add(new Date(b.date).toDateString());

    if (b.status === 'win') {
      totalEventsWon += eCount;
      currentStreak++;
      if (currentStreak > maxStreak) maxStreak = currentStreak;
      totalWon += (b.stake * b.odds);
      netProfit += (b.stake * (b.odds - 1));
      if (b.odds > maxOdds) maxOdds = b.odds;
      if (eCount > maxCombo) maxCombo = eCount;
      if (currentLossStreak >= 3) comebacks++;
      currentLossStreak = 0;
      if (b.date) winDates.add(new Date(b.date).toDateString());
      winSports.add(b.sport);

      if (b.sport === 'football') winFootball++;
      if (b.sport === 'tennis') winTennis++;
      if (b.sport === 'basketball') winBasketball++;
      if (b.sport === 'other') winOther++;

      const type = (b.type || '').toLowerCase();
      if (type.includes('goluri-1p')) winHT++;
      else if (type.includes('goluri')) winGoals++;
      if (type.includes('cornere')) winCorners++;
      if (type.includes('cartonase')) winCards++;
    } else if (b.status === 'loss') {
      currentStreak = 0;
      currentLossStreak++;
      netProfit -= b.stake;
    }
  });

  let dailyWinStreak = 0;
  if (winDates.size > 0) {
    const sorted = Array.from(winDates).map(d => new Date(d).getTime()).sort((a, b) => b - a);
    let temp = 1;
    for (let i = 0; i < sorted.length - 1; i++) {
      if ((sorted[i] - sorted[i+1]) / 86400000 === 1) {
        temp++; if (temp > dailyWinStreak) dailyWinStreak = temp;
      } else temp = 1;
    }
    if (temp > dailyWinStreak) dailyWinStreak = temp;
  }

  let following = 0, postsCount = 0;
  try {
    const me = JSON.parse(localStorage.getItem('rgb_user') || '{}');
    const fMap = JSON.parse(localStorage.getItem('rgb_follows') || '{}');
    following = (fMap[me.username?.toLowerCase()] || []).length;
    const allPosts = JSON.parse(localStorage.getItem('rgb_social_feed') || '[]');
    postsCount = allPosts.filter(p => p.author?.toLowerCase() === me.username?.toLowerCase()).length;
  } catch {}

  return {
    total: bets.length, maxWinStreak, totalWonAmount: totalWon, maxSingleOdds: maxOdds,
    winHT, winGoals, winCorners, winCards, winFootball, winTennis, winBasketball, winOther,
    comebacks, maxComboSize: maxCombo, netProfit, totalEventsPlaced, totalEventsWon,
    totalStaked, dailyWinStreak, sportsDiversified: winSports.size, daysActive: activeDays.size,
    followingCount: following, postsCount
  };
}

function showBadgeDetail(id) {
  const b = BADGES_CONFIG.find(x => x.id === id);
  if (!b) return;
  const isUnlocked = getUnlockedBadges().includes(id);
  showMsgToast(`${b.name}: ${b.desc}${isUnlocked ? ' 🎉' : ''}`, isUnlocked ? 'success' : 'info');
}

function showBadgeUnlockCelebration(id) {
  const b = BADGES_CONFIG.find(x => x.id === id);
  if (typeof confetti === 'function') {
    confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 }, colors: [b.color, '#fff', '#ffcc00'] });
  }
  showMsgToast(`FELICITĂRI! Ai deblocat insigna: ${b.name} 🏆`, 'success');
}

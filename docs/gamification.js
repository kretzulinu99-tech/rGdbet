/* ═══════════════════════════════════════════════════════════════
   gamification.js — Modul Gamificare Elitist (v7.0)
   Sistem de Niveluri 1-120 + Bară de Experiență Dinamică
═══════════════════════════════════════════════════════════════ */
'use strict';

// Configurare Niveluri: XP necesar pentru nivelul N
// Folosim o creștere pătratică pentru a face nivelurile superioare mai greu de atins
function getXPForLevel(level) {
  if (level <= 1) return 0;
  // Formula: 100 * (level-1)^2 + 400 * (level-1)
  // Lvl 2: 500 XP, Lvl 10: 13,600 XP, Lvl 120: ~1.5M XP
  return Math.floor(100 * Math.pow(level - 1, 1.8) + 400 * (level - 1));
}

const MAX_LEVEL = 120;

// Recompense XP granulate
const XP_VALUES = {
  BASE_TICKET: 50,      // XP de bază pentru adăugare bilet
  WIN_MULTIPLIER: 20,   // XP bonus per unitate de cotă câștigată (ex: cota 2.0 = +40 XP)
  LOSS_PENALTY: 0.5,    // Proporția de XP primită la bilet pierdut (muncă depusă, dar eșec)
  SOCIAL_POST: 30,
  MESSAGE_SENT: 5
};

/* ── LOGICĂ NIVEL ── */

window.getUserLevelData = function() {
  const user = getCurrentUser();
  const xp = user?.xp || 0;

  let level = 1;
  for (let i = 1; i <= MAX_LEVEL; i++) {
    if (xp >= getXPForLevel(i)) {
      level = i;
    } else {
      break;
    }
  }

  const currentLevelXP = getXPForLevel(level);
  const nextLevelXP = level < MAX_LEVEL ? getXPForLevel(level + 1) : currentLevelXP;
  const progressXP = xp - currentLevelXP;
  const requiredXP = nextLevelXP - currentLevelXP;
  const progressPct = level < MAX_LEVEL ? (progressXP / requiredXP) * 100 : 100;

  return {
    level,
    xp,
    progressXP: Math.floor(progressXP),
    requiredXP: Math.floor(requiredXP),
    progressPct: Math.floor(progressPct),
    isMax: level >= MAX_LEVEL
  };
};

window.addXP = function(amount) {
  const user = getCurrentUser();
  if (!user) return;

  const oldData = getUserLevelData();
  user.xp = (user.xp || 0) + Math.floor(amount);
  const newData = getUserLevelData();

  saveCurrentUser(user);
  const users = getUsers();
  if (users[user.username.toLowerCase()]) {
    users[user.username.toLowerCase()].xp = user.xp;
    saveUsers(users);
  }

  if (newData.level > oldData.level) {
    showLevelUpToast(newData.level);
  }

  if (typeof cloudPushData === 'function') cloudPushData();
  if (typeof buildProfilePage === 'function') buildProfilePage(true);
};

/* ── CALCUL XP DIN BILETE ── */
// Apelat din script.js când se adaugă sau se schimbă statusul unui bilet
window.calculateTicketXP = function(bet) {
  let xp = XP_VALUES.BASE_TICKET;
  const odds = parseFloat(bet.totalOdds || bet.odds || 1);

  if (bet.status === 'win') {
    xp += odds * XP_VALUES.WIN_MULTIPLIER;
  } else if (bet.status === 'loss') {
    xp += (XP_VALUES.BASE_TICKET * XP_VALUES.LOSS_PENALTY);
  } else if (bet.status === 'cashout') {
    xp += (odds * XP_VALUES.WIN_MULTIPLIER) * 0.5;
  }

  return Math.floor(xp);
};

/* ── UI HELPERS ── */

function showLevelUpToast(level) {
  const toast = document.createElement('div');
  toast.className = 'level-up-toast';
  toast.innerHTML = `
    <div class="level-up-icon">🏆</div>
    <div class="level-up-info">
      <div class="level-up-title">NEW LEVEL REACHED!</div>
      <div class="level-up-name">NIVELUL ${level}</div>
    </div>
  `;
  document.body.appendChild(toast);
  setTimeout(() => toast.classList.add('visible'), 100);
  setTimeout(() => {
    toast.classList.remove('visible');
    setTimeout(() => toast.remove(), 500);
  }, 4000);

  // Confetti pentru niveluri mari (din 10 în 10)
  if (level % 10 === 0 && typeof confetti === 'function') {
    confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 }, colors: ['#ffcc00', '#00e0ff', '#bd00ff'] });
  }
}

/* ── VERIFIED TIPSTER & LEAGUES (Keep existing) ── */
window.getVerificationBadge = function(username) {
  const allPosts = getPosts();
  const userPosts = allPosts.filter(p => p.author?.toLowerCase() === username.toLowerCase());
  const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
  const recent = userPosts.filter(p => p.postedAt >= thirtyDaysAgo && (p.status === 'win' || p.status === 'loss'));

  if (recent.length < 5) return '';
  let profit = 0;
  recent.forEach(p => {
    const s = parseFloat(p.stake || 0), o = parseFloat(p.odds || 1);
    if (p.status === 'win') profit += s * (o - 1); else profit -= s;
  });

  if (profit > 0) return `<i class="fa-solid fa-circle-check" style="color:var(--nb); font-size:12px; margin-left:4px;" title="Verified Tipster"></i>`;
  return '';
};

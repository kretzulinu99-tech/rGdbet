/* ═══════════════════════════════════════════════════════════════
   gamification.js — Modul Gamificare & Statut Social
   rGdbet ELITE v7.0
   Conține: XP System, Verified Tipster Logic, Private Leagues
═══════════════════════════════════════════════════════════════ */
'use strict';

const XP_LEVELS = [
  { name: 'Rookie', min: 0 },
  { name: 'Amateur', min: 500 },
  { name: 'Semi-Pro', min: 1500 },
  { name: 'Professional', min: 4000 },
  { name: 'Elite Analyst', min: 10000 },
  { name: 'Legendary Whale', min: 25000 }
];

const XP_REWARDS = {
  ADD_TICKET: 150,
  WIN_TICKET: 300,
  POST_SOCIAL: 50,
  SEND_MESSAGE: 10,
  DAILY_LOGIN: 100
};

/* ── XP & LEVELING ── */

window.getUserXP = function() {
  const user = getCurrentUser();
  return user?.xp || 0;
};

window.calculateLevel = function(xp) {
  let currentLevel = XP_LEVELS[0];
  for (let i = XP_LEVELS.length - 1; i >= 0; i--) {
    if (xp >= XP_LEVELS[i].min) {
      currentLevel = XP_LEVELS[i];
      break;
    }
  }
  return currentLevel;
};

window.addXP = function(amount) {
  const user = getCurrentUser();
  if (!user) return;

  const oldLevel = calculateLevel(user.xp || 0);
  user.xp = (user.xp || 0) + amount;
  const newLevel = calculateLevel(user.xp);

  saveCurrentUser(user);
  const users = getUsers();
  if (users[user.username.toLowerCase()]) {
    users[user.username.toLowerCase()].xp = user.xp;
    saveUsers(users);
  }

  if (newLevel.name !== oldLevel.name) {
    showLevelUpToast(newLevel.name);
  }

  if (typeof cloudPushData === 'function') cloudPushData();
};

function showLevelUpToast(levelName) {
  const toast = document.createElement('div');
  toast.className = 'level-up-toast';
  toast.innerHTML = `
    <div class="level-up-icon">⭐</div>
    <div class="level-up-info">
      <div class="level-up-title">LEVEL UP!</div>
      <div class="level-up-name">Ești acum ${levelName.toUpperCase()}</div>
    </div>
  `;
  document.body.appendChild(toast);
  setTimeout(() => toast.classList.add('visible'), 100);
  setTimeout(() => {
    toast.classList.remove('visible');
    setTimeout(() => toast.remove(), 500);
  }, 4000);
}

/* ── VERIFIED TIPSTER LOGIC ── */

window.isVerifiedTipster = function(username) {
  const allPosts = getPosts();
  const userPosts = allPosts.filter(p => p.author?.toLowerCase() === username.toLowerCase());

  // Verificăm profitul pe ultimele 30 de zile
  const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
  const recentPosts = userPosts.filter(p => p.postedAt >= thirtyDaysAgo && (p.status === 'win' || p.status === 'loss'));

  if (recentPosts.length < 5) return false; // Minim 5 bilete pentru verificare

  let profit = 0;
  recentPosts.forEach(p => {
    const stake = parseFloat(p.stake || 0);
    const odds = parseFloat(p.odds || 1);
    if (p.status === 'win') profit += stake * (odds - 1);
    else profit -= stake;
  });

  return profit > 0;
};

window.getVerificationBadge = function(username) {
  if (isVerifiedTipster(username)) {
    return `<i class="fa-solid fa-circle-check" style="color:var(--nb); font-size:12px; margin-left:4px;" title="Verified Tipster (Profit pe 30 zile)"></i>`;
  }
  return '';
};

/* ── PRIVATE LEAGUES ── */

window.createPrivateLeague = function(name) {
  const user = getCurrentUser();
  if (!user) return;

  const leagues = JSON.parse(localStorage.getItem('rgb_private_leagues') || '[]');
  const newLeague = {
    id: 'league_' + Date.now(),
    name: name,
    creator: user.username,
    members: [user.username.toLowerCase()],
    createdAt: Date.now()
  };

  leagues.push(newLeague);
  localStorage.setItem('rgb_private_leagues', JSON.stringify(leagues));
  if (typeof cloudPushData === 'function') cloudPushData();
  return newLeague;
};

window.joinPrivateLeague = function(leagueId) {
  const user = getCurrentUser();
  if (!user) return;

  const leagues = JSON.parse(localStorage.getItem('rgb_private_leagues') || '[]');
  const league = leagues.find(l => l.id === leagueId);
  if (league && !league.members.includes(user.username.toLowerCase())) {
    league.members.push(user.username.toLowerCase());
    localStorage.setItem('rgb_private_leagues', JSON.stringify(leagues));
    if (typeof cloudPushData === 'function') cloudPushData();
  }
};

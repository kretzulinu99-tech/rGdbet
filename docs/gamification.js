/* ═══════════════════════════════════════════════════════════════
   gamification.js — Sistem XP Elitist (v7.0)
   Niveluri 1-120 + Bară de Progres Vizibilă
═══════════════════════════════════════════════════════════════ */
'use strict';

const MAX_LEVEL = 120;

/**
 * Calculează XP-ul necesar pentru nivelul cerut.
 */
function getXPForLevel(level) {
  if (level <= 1) return 0;
  // Formula: progresie non-liniară pentru 120 niveluri
  return Math.floor(100 * Math.pow(level - 1, 1.9) + 500 * (level - 1));
}

/**
 * Returnează datele de nivel pentru un anumit XP.
 */
window.getUserLevelData = function(xp = 0) {
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
  const totalNextXP = nextLevelXP - currentLevelXP;
  const progressPct = level < MAX_LEVEL ? (progressXP / totalNextXP) * 100 : 100;

  return {
    level,
    xp,
    progressXP: Math.floor(progressXP),
    requiredXP: Math.floor(totalNextXP),
    progressPct: Math.floor(progressPct),
    isMax: level >= MAX_LEVEL
  };
};

/**
 * Adaugă XP utilizatorului curent și salvează permanent.
 */
window.addXP = function(amount) {
  const user = getCurrentUser();
  if (!user) return;

  const oldData = getUserLevelData(user.xp || 0);
  user.xp = (user.xp || 0) + Math.floor(amount);
  const newData = getUserLevelData(user.xp);

  saveCurrentUser(user);

  // Sincronizăm și cu cheia individuală pentru cloud-sync
  localStorage.setItem('rgb_xp', user.xp.toString());

  // Actualizăm baza de date locală de utilizatori
  const users = getUsers();
  const key = user.username.toLowerCase();
  if (users[key]) {
    users[key].xp = user.xp;
    saveUsers(users);
  }

  if (newData.level > oldData.level) {
    showLevelUpToast(newData.level);
  }

  // Declanșăm push în cloud
  if (typeof cloudPushData === 'function') cloudPushData();

  // Re-randăm profilul dacă suntem pe pagina de profil
  if (typeof buildProfilePage === 'function' && document.body.dataset.page === 'profile') {
    buildProfilePage(true);
  }
};

/**
 * Calculează XP primit dintr-un bilet.
 */
window.calculateTicketXP = function(bet) {
  const base = 50;
  const odds = parseFloat(bet.totalOdds || bet.odds || 1);

  let bonus = 0;
  if (bet.status === 'win') {
    bonus = odds * 25;
  } else if (bet.status === 'loss') {
    bonus = 10;
  } else if (bet.status === 'cashout') {
    bonus = odds * 12;
  }

  return Math.floor(base + bonus);
};

/**
 * Notificare spectaculoasă la trecere de nivel.
 */
function showLevelUpToast(level) {
  const toast = document.createElement('div');
  toast.className = 'level-up-toast';
  toast.innerHTML = `
    <div class="level-up-icon">🏆</div>
    <div class="level-up-info">
      <div class="level-up-title">NEW RANK REACHED!</div>
      <div class="level-up-name">LEVEL ${level}</div>
    </div>
  `;
  document.body.appendChild(toast);

  setTimeout(() => toast.classList.add('visible'), 100);

  if (typeof confetti === 'function') {
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#ffcc00', '#00e0ff', '#bd00ff']
    });
  }

  setTimeout(() => {
    toast.classList.remove('visible');
    setTimeout(() => toast.remove(), 600);
  }, 4000);
}

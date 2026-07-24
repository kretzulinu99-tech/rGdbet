/* ═══════════════════════════════════════════════════════════════
   gamification.js — Sistem XP Profesional (v8.7 Platinum)
   Niveluri 1-120 + Algoritm Realist de Performanță
═══════════════════════════════════════════════════════════════ */
'use strict';

const MAX_LEVEL = 120;

/**
 * Calculează XP-ul necesar pentru nivelul cerut.
 * Progresie non-liniară (quadratică ușoară) pentru 120 niveluri.
 */
function getXPForLevel(level) {
  if (level <= 1) return 0;
  // Formula: bazată pe efort și volum realist
  return Math.floor(120 * Math.pow(level - 1, 1.85) + 400 * (level - 1));
}

/**
 * Returnează datele de nivel pentru un anumit XP.
 */
window.getUserLevelData = function(xp = 0) {
  let level = 1;
  for (let i = 1; i <= MAX_LEVEL; i++) {
    if (xp >= getXPForLevel(i)) level = i;
    else break;
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
    progressPct: Math.min(100, Math.max(0, Math.floor(progressPct))),
    isMax: level >= MAX_LEVEL
  };
};

/**
 * Adaugă sau scade XP utilizatorului curent (Ajustare Delta).
 */
window.addXP = function(amount, isAdjustment = false) {
  const user = getCurrentUser();
  if (!user) return;

  const oldData = getUserLevelData(user.xp || 0);
  user.xp = (user.xp || 0) + Math.floor(amount);
  if (user.xp < 0) user.xp = 0; // Prevenim rank negativ

  const newData = getUserLevelData(user.xp);
  saveCurrentUser(user);
  localStorage.setItem('rgb_xp', user.xp.toString());

  // Actualizăm baza de date locală
  const users = getUsers();
  if (users[user.username.toLowerCase()]) {
    users[user.username.toLowerCase()].xp = user.xp;
    saveUsers(users);
  }

  // Notificăm doar la creștere reală de nivel (nu la ajustări silențioase/negative)
  if (!isAdjustment && newData.level > oldData.level) {
    if (typeof showRPGLevelUp === 'function') {
        showRPGLevelUp(newData.level);
    } else {
        showLevelUpToast(newData.level);
    }
  }

  if (typeof cloudPushData === 'function') cloudPushData();
  if (typeof updateXPUI === 'function') updateXPUI();
};

/**
 * ALGORITM PROFESIONAL CALCUL XP (v8.7)
 * Factori: Status, Cotă, Volum (Miză), Complexitate (Evenimente).
 */
window.calculateTicketXP = function(bet) {
  // 1. Experiență de Bază (Efort plasare)
  const base = 50;

  // 2. Complexitate (Bonus pentru bilete cu multe evenimente)
  const eventCount = (bet.events && bet.events.length) ? bet.events.length : 1;
  const complexityBonus = (eventCount - 1) * 15;

  // 3. Volum (Miză) - Influență logaritmică pentru a preveni abuzul sumelor mari
  const stake = parseFloat(bet.stake || 0);
  const volumeBonus = stake > 0 ? Math.floor(Math.log10(stake + 1) * 20) : 0;

  // 4. Performanță (Bazată pe status și cotă)
  const odds = parseFloat(bet.totalOdds || bet.odds || 1);
  let performanceBonus = 0;

  if (bet.status === 'win') {
    // Victoria oferă cel mai mare bonus (Cotă x 15)
    performanceBonus = Math.floor(odds * 15) + 30;
  } else if (bet.status === 'loss') {
    // Pierderea oferă un mic bonus de consolare
    performanceBonus = 10;
  } else if (bet.status === 'cashout') {
    // Cashout oferă un bonus intermediar
    performanceBonus = Math.floor(odds * 8) + 10;
  }

  return base + complexityBonus + volumeBonus + performanceBonus;
};

/**
 * Notificare SPECTACULOASĂ Level Up
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
    confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 }, colors: ['#ffcc00', '#00e0ff', '#bd00ff'] });
  }

  setTimeout(() => {
    toast.classList.remove('visible');
    setTimeout(() => toast.remove(), 600);
  }, 4000);
}

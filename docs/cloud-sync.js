/* ═══════════════════════════════════════════════════════════════
   cloud-sync.js — Sistem Sincronizare Hibrid (Storage Sync)
   v11.5 Elite Sovereign Platinum (The Persistence Fix)
   Garantează restaurarea avatarului în ambele straturi de memorie.
═══════════════════════════════════════════════════════════════ */
'use strict';

const CLOUD_KEYS = [
  'rgb_bets',
  'rgb_portfolios',
  'rgb_current_portfolio',
  'rgb_unlocked_badges',
  'rgb_theme',
  'rgb_lang',
  'rgb_messages',
  'rgb_friends',
  'rgb_friend_reqs',
  'rgb_unread',
  'rgb_user',
  'rgb_social_feed',
  'rgb_gamb_test',
  'rgb_xp',
  'rgb_currency'
];

/**
 * Salvează datele folosind cel mai bun motor disponibil.
 */
window.cloudPushData = function() {
  return new Promise((resolve) => {
    const payload = {};
    CLOUD_KEYS.forEach(key => {
      const raw = localStorage.getItem(key);
      if (raw !== null) {
        try { payload[key] = JSON.parse(raw); } catch { payload[key] = raw; }
      }
    });

    payload.lastSync = Date.now();
    payload.v = "11.5";

    // 1. Motor NATIV (Android Bridge)
    if (typeof Android !== 'undefined' && Android.saveToCloud) {
      console.log('[CloudSync] Trimitere date profil către Android...');
      Android.saveToCloud(JSON.stringify(payload));
      setTimeout(() => resolve(true), 800); // Barrieră de 800ms pentru siguranță
      return;
    }

    // 2. Motor WEB (Firebase JS)
    if (typeof fbDb !== 'undefined' && typeof fbUser !== 'undefined' && fbUser) {
      fbDb.collection('user_data').doc(fbUser.uid).set(payload, { merge: true })
        .then(() => resolve(true))
        .catch(() => resolve(false));
      return;
    }

    resolve(false);
  });
};

/**
 * Încarcă datele din Cloud și forțează sincronizarea MEMORIEI.
 */
window.cloudPullData = async function() {
  let uid = null;
  if (typeof window.nativeUID !== 'undefined') uid = window.nativeUID;
  else if (typeof fbUser !== 'undefined' && fbUser) uid = fbUser.uid;

  if (!uid || typeof fbDb === 'undefined') return;

  console.log('[CloudSync] Restaurare date cont pentru UID:', uid);

  try {
    const doc = await fbDb.collection('user_data').doc(uid).get();
    if (doc.exists) {
      const data = doc.data();

      CLOUD_KEYS.forEach(key => {
        if (data[key] !== undefined) {
          const val = typeof data[key] === 'string' ? data[key] : JSON.stringify(data[key]);

          // CRITIC: Actualizăm LocalStorage
          localStorage.setItem(key, val);

          // SPECIAL: Dacă cheia este 'rgb_user', forțăm și SessionStorage (Unde stă avatarul activ)
          if (key === 'rgb_user' && typeof window.saveCurrentUser === 'function') {
            try {
              const restoredUser = JSON.parse(val);
              window.saveCurrentUser(restoredUser);
              console.log('[CloudSync] Avatar restaurat:', restoredUser.avatar ? 'DETECTOR ACTIV' : 'DEFAULT');
            } catch(e) {}
          }
        }
      });

      console.log('[CloudSync] Sincronizare memorie completă.');

      // Notificăm interfața să se actualizeze IMEDIAT
      if (typeof buildProfilePage === 'function') buildProfilePage(true);
      if (typeof authUpdateTopBar === 'function') {
        const u = JSON.parse(localStorage.getItem('rgb_user') || '{}');
        if (u.username) authUpdateTopBar(u);
      }
      if (typeof render === 'function') render();
      if (typeof updateXPUI === 'function') updateXPUI();
    }
  } catch (err) {
    console.error('[CloudSync] Eroare la pull date:', err);
  }
};

/**
 * MOTORUL DE PERSISTENȚĂ
 */
(function initSyncEngine() {
  const originalSetItem = localStorage.setItem;
  localStorage.setItem = function(key, value) {
    originalSetItem.apply(this, arguments);
    if (CLOUD_KEYS.includes(key)) {
      clearTimeout(window._syncTimeout);
      window._syncTimeout = setTimeout(() => {
        window.cloudPushData();
      }, 500);
    }
  };
})();

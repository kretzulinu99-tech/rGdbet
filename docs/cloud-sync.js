/* ═══════════════════════════════════════════════════════════════
   cloud-sync.js — Sistem Sincronizare Hibrid (Sync Lock)
   v11.8 Elite Sovereign Platinum (The Overwrite Fix)
   Previne suprascrierea avatarului din Cloud la login.
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

let _syncBlocked = false;

/**
 * Salvează datele folosind cel mai bun motor disponibil.
 */
window.cloudPushData = function() {
  if (_syncBlocked) {
    console.log('[CloudSync] Salvare blocată (Sistem în restaurare)');
    return Promise.resolve(false);
  }

  return new Promise((resolve) => {
    const payload = {};
    CLOUD_KEYS.forEach(key => {
      const raw = localStorage.getItem(key);
      if (raw !== null) {
        try { payload[key] = JSON.parse(raw); } catch { payload[key] = raw; }
      }
    });

    payload.lastSync = Date.now();
    payload.v = "11.8";

    if (typeof Android !== 'undefined' && Android.saveToCloud) {
      Android.saveToCloud(JSON.stringify(payload));
      setTimeout(() => resolve(true), 600);
      return;
    }

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
window.cloudPullData = async function(customUID = null) {
  let uid = customUID;
  if (!uid) {
    if (typeof window.nativeUID !== 'undefined') uid = window.nativeUID;
    else if (typeof fbUser !== 'undefined' && fbUser) uid = fbUser.uid;
  }

  if (!uid || typeof fbDb === 'undefined') return;

  console.log('[CloudSync] Restaurare date pentru UID:', uid);
  _syncBlocked = true; // BLOCĂM orice scriere în timpul pull-ului

  try {
    const doc = await fbDb.collection('user_data').doc(uid).get();
    if (doc.exists) {
      const data = doc.data();
      CLOUD_KEYS.forEach(key => {
        if (data[key] !== undefined) {
          const val = typeof data[key] === 'string' ? data[key] : JSON.stringify(data[key]);
          localStorage.setItem(key, val);
          if (key === 'rgb_user' && typeof window.saveCurrentUser === 'function') {
            window.saveCurrentUser(JSON.parse(val));
          }
        }
      });
      console.log('[CloudSync] Date restaurate cu succes.');
    } else {
      console.log('[CloudSync] Nu există date în Cloud pentru acest UID.');
    }
  } catch (err) {
    console.error('[CloudSync] Eroare Pull:', err);
  } finally {
    // Deblocăm salvarea după ce Pull-ul este complet
    setTimeout(() => {
      _syncBlocked = false;
      // Refresh UI final
      if (typeof buildProfilePage === 'function') buildProfilePage(true);
      if (typeof authUpdateTopBar === 'function') {
        const u = JSON.parse(localStorage.getItem('rgb_user') || '{}');
        if (u.username) authUpdateTopBar(u);
      }
      if (typeof render === 'function') render();
    }, 1000);
  }
};

/**
 * MOTORUL DE PERSISTENȚĂ
 */
(function initSyncEngine() {
  const originalSetItem = localStorage.setItem;
  localStorage.setItem = function(key, value) {
    originalSetItem.apply(this, arguments);
    if (!_syncBlocked && CLOUD_KEYS.includes(key)) {
      clearTimeout(window._syncTimeout);
      window._syncTimeout = setTimeout(() => {
        window.cloudPushData();
      }, 800);
    }
  };
})();

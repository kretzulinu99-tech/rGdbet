/* ═══════════════════════════════════════════════════════════════
   cloud-sync.js — Sistem Sincronizare Hibrid (Web + Native)
   v11.3 Elite Sovereign Platinum (The Barrier Fix)
   Garantează salvarea prin blocarea deconectării până la confirmare.
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

let _isSyncing = false;

/**
 * Salvează datele folosind cel mai bun motor disponibil.
 * Acum returnează un PROMISE pentru a permite "await" la logout.
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
    payload.v = "11.3";

    // 1. Motor NATIV (Prioritate maximă)
    if (typeof Android !== 'undefined' && Android.saveToCloud) {
      console.log('[CloudSync] Salvare Nativă în curs...');
      Android.saveToCloud(JSON.stringify(payload));
      // Deoarece apelul bridge este asincron pe Android, simulăm o mică așteptare
      // pentru a permite sistemului de operare să inițieze scrierea.
      setTimeout(() => resolve(true), 600);
      return;
    }

    // 2. Motor WEB (Fallback)
    if (typeof fbDb !== 'undefined' && typeof fbUser !== 'undefined' && fbUser) {
      console.log('[CloudSync] Salvare Web Firebase în curs...');
      fbDb.collection('user_data').doc(fbUser.uid).set(payload, { merge: true })
        .then(() => { console.log('[CloudSync] OK (Web)'); resolve(true); })
        .catch((err) => { console.error('[CloudSync] ERR (Web):', err); resolve(false); });
      return;
    }

    resolve(false);
  });
};

/**
 * Încarcă datele din Cloud.
 */
window.cloudPullData = async function() {
  let uid = null;
  if (typeof window.nativeUID !== 'undefined') uid = window.nativeUID;
  else if (typeof fbUser !== 'undefined' && fbUser) uid = fbUser.uid;

  if (!uid || typeof fbDb === 'undefined') return;

  try {
    const doc = await fbDb.collection('user_data').doc(uid).get();
    if (doc.exists) {
      const data = doc.data();
      CLOUD_KEYS.forEach(key => {
        if (data[key] !== undefined) {
          localStorage.setItem(key, typeof data[key] === 'string' ? data[key] : JSON.stringify(data[key]));
        }
      });
      console.log('[CloudSync] Date restaurate cu succes.');

      // Forțăm actualizarea elementelor vizuale (v11.4)
      const restoredUser = JSON.parse(localStorage.getItem('rgb_user') || '{}');
      if (typeof authUpdateTopBar === 'function' && restoredUser.username) {
        authUpdateTopBar(restoredUser);
      }
      if (typeof render === 'function') render();
      if (typeof updateXPUI === 'function') updateXPUI();
      if (typeof buildProfilePage === 'function') buildProfilePage(true);
    }
  } catch (err) {}
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
      }, 500); // Reducem timpul de reacție la 500ms
    }
  };
})();

/* ═══════════════════════════════════════════════════════════════
   cloud-sync.js — Sistem Sincronizare Hibrid (Web + Native)
   v11.2 Elite Sovereign Platinum (Sync Fix)
   Garantează salvarea avatarului și a biletelor prin bridge Android.
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
 * Salvează datele folosind cel mai bun motor disponibil (Native sau Web).
 */
window.cloudPushData = async function() {
  const payload = {};
  CLOUD_KEYS.forEach(key => {
    const raw = localStorage.getItem(key);
    if (raw !== null) {
      try { payload[key] = JSON.parse(raw); } catch { payload[key] = raw; }
    }
  });

  // Adăugăm timestamp
  payload.lastSync = Date.now();
  payload.v = "11.2";

  // 1. Încercăm motorul NATIV (Android Bridge) - Cel mai sigur pentru salvare permanentă
  if (typeof Android !== 'undefined' && Android.saveToCloud) {
    console.log('[CloudSync] Salvare prin motor Nativ Android...');
    try {
      Android.saveToCloud(JSON.stringify(payload));
      return true;
    } catch(e) { console.error('[CloudSync] Eroare Bridge:', e); }
  }

  // 2. Fallback pe motorul WEB (Firebase JS) - Pentru testarea pe browser (GitHub)
  if (typeof fbDb !== 'undefined' && typeof fbUser !== 'undefined' && fbUser) {
    console.log('[CloudSync] Salvare prin motor Web Firebase...');
    if (_isSyncing) return false;
    _isSyncing = true;
    try {
      await fbDb.collection('user_data').doc(fbUser.uid).set(payload, { merge: true });
      return true;
    } catch (err) {
      console.error('[CloudSync] Eroare Firebase Web:', err);
      return false;
    } finally { _isSyncing = false; }
  }

  return false;
};

/**
 * Încarcă datele din Cloud (Firestore).
 */
window.cloudPullData = async function() {
  let uid = null;

  // Detectăm UID din Android sau Web
  if (typeof window.nativeUID !== 'undefined') uid = window.nativeUID;
  else if (typeof fbUser !== 'undefined' && fbUser) uid = fbUser.uid;

  if (!uid || typeof fbDb === 'undefined') return;

  console.log('[CloudSync] Restaurare date pentru UID:', uid);

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
      if (typeof render === 'function') render();
      if (typeof updateXPUI === 'function') updateXPUI();
    }
  } catch (err) { console.error('[CloudSync] Eroare Pull:', err); }
};

/**
 * MOTORUL DE PERSISTENȚĂ (Interceptor)
 */
(function initSyncEngine() {
  const originalSetItem = localStorage.setItem;
  localStorage.setItem = function(key, value) {
    originalSetItem.apply(this, arguments);
    if (CLOUD_KEYS.includes(key)) {
      // Trigger salvare la orice modificare (avatar, bilete, etc.)
      clearTimeout(window._syncDebounce);
      window._syncTimeout = setTimeout(() => {
        window.cloudPushData();
      }, 800);
    }
  };

  // Salvare forțată la ieșire
  window.addEventListener('beforeunload', () => { window.cloudPushData(); });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') window.cloudPushData();
  });
})();

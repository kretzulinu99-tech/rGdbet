/* ═══════════════════════════════════════════════════════════════
   cloud-sync.js — Sistem Sincronizare Cloud Ultra-Persistent
   v11.0 Elite Sovereign Platinum
   Asigură salvarea IMEDIATĂ și PERMANENTĂ în Firebase Firestore.
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
let _pendingSync = false;

/**
 * Încarcă toate datele din Firestore și le aplică în LocalStorage.
 * Restaurare automată la login sau intrare în aplicație.
 */
window.cloudPullData = async function() {
  if (!fbDb || !fbUser) {
    console.warn('[CloudSync] Pull anulat: Firebase nu este logat.');
    return;
  }

  console.log('[CloudSync] Pornire descărcare date permanente...');

  try {
    const doc = await fbDb.collection('user_data').doc(fbUser.uid).get();
    if (doc.exists) {
      const data = doc.data();

      // Aplicăm fiecare cheie în LocalStorage pentru a restaura starea contului
      CLOUD_KEYS.forEach(key => {
        if (data[key] !== undefined) {
          const val = data[key];
          localStorage.setItem(key, typeof val === 'string' ? val : JSON.stringify(val));
        }
      });

      console.log('[CloudSync] Date restaurate cu succes din Cloud.');

      // Notificăm interfața să se actualizeze cu noile date descărcate
      if (typeof render === 'function') render();
      if (typeof updateMsgBadge === 'function') updateMsgBadge();
      if (typeof buildProfilePage === 'function') buildProfilePage(true);
      if (typeof updateXPUI === 'function') updateXPUI();

    } else {
      console.log('[CloudSync] Cont nou: Se inițializează prima salvare în Cloud.');
      await window.cloudPushData();
    }
  } catch (err) {
    console.error('[CloudSync] Eroare critică la descărcare date:', err);
  }
};

/**
 * Salvează starea curentă a aplicației în Firebase Firestore.
 * Funcția este acum optimizată pentru apeluri instantanee.
 */
window.cloudPushData = async function() {
  if (!fbDb || !fbUser) return false;

  // Dacă deja se salvează, marcăm că avem un sync în așteptare
  if (_isSyncing) {
    _pendingSync = true;
    return false;
  }

  _isSyncing = true;
  _pendingSync = false;

  const payload = {};
  CLOUD_KEYS.forEach(key => {
    const raw = localStorage.getItem(key);
    if (raw !== null) {
      try {
        payload[key] = JSON.parse(raw);
      } catch {
        payload[key] = raw;
      }
    }
  });

  // Metadata pentru integritate
  payload.lastSync = firebase.firestore.FieldValue.serverTimestamp();
  payload.email = fbUser.email;
  payload.uid = fbUser.uid;
  payload.v = "11.0";

  try {
    await fbDb.collection('user_data').doc(fbUser.uid).set(payload, { merge: true });
    console.log('[CloudSync] Date salvate permanent în Firebase.');
    return true;
  } catch (err) {
    console.error('[CloudSync] Eroare la salvarea în Firebase:', err);
    return false;
  } finally {
    _isSyncing = false;
    // Dacă au apărut modificări noi în timpul salvării, declanșăm un nou sync
    if (_pendingSync) {
      setTimeout(window.cloudPushData, 500);
    }
  }
};

/**
 * MOTORUL DE PERSISTENȚĂ REAL-TIME (v11.0)
 * Interceptează orice modificare de date și forțează salvarea.
 */
(function setupUltraPersistence() {
  // 1. Interceptăm modificările locale imediate
  const originalSetItem = localStorage.setItem;
  localStorage.setItem = function(key, value) {
    originalSetItem.apply(this, arguments);
    if (CLOUD_KEYS.includes(key)) {
      // Salvare ultra-rapidă (debounce de 500ms pentru a nu suprasolicita Firebase la scrieri masive)
      clearTimeout(this._syncTimeout);
      this._syncTimeout = setTimeout(() => {
        window.cloudPushData();
      }, 500);
    }
  };

  // 2. Salvare la închiderea aplicației (Lifecycle Hooks)
  // visibilitychange este cel mai sigur mod pe mobil
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      console.log('[CloudSync] Aplicație în fundal: Salvare forțată.');
      window.cloudPushData();
    }
  });

  // 3. Salvare la părăsirea paginii
  window.addEventListener('beforeunload', () => {
    window.cloudPushData();
  });

  console.log('[CloudSync] Sistemul de Persistență Real-Time v11.0 este ACTIV.');
})();

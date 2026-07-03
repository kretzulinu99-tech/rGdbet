/* ═══════════════════════════════════════════════════════════════
   cloud-sync.js — Sistem Sincronizare Cloud (Firestore)
   rGdbet ELITE v4.0
   Asigură permanența datelor (Bilete, Setări, Profil) pe cont.
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
  'rgb_xp' // XP Persistence ensured
];

let _isSyncing = false;

/**
 * Încarcă toate datele din Firestore și le aplică în LocalStorage.
 * Apelat imediat după login succes.
 */
window.cloudPullData = async function() {
  if (!fbDb || !fbUser) return;
  console.log('[CloudSync] Pornire descărcare date...');

  try {
    const doc = await fbDb.collection('user_data').doc(fbUser.uid).get();
    if (doc.exists) {
      const data = doc.data();

      // Aplicăm fiecare cheie în LocalStorage
      CLOUD_KEYS.forEach(key => {
        if (data[key] !== undefined) {
          const val = data[key];
          localStorage.setItem(key, typeof val === 'string' ? val : JSON.stringify(val));
        }
      });

      console.log('[CloudSync] Date sincronizate din Cloud cu succes.');

      // Forțăm reîncărcarea aplicației pentru a aplica noile date (bilete, temă etc.)
      if (typeof render === 'function') render();
      if (typeof updateMsgBadge === 'function') updateMsgBadge();
      if (typeof buildMessagesPage === 'function') buildMessagesPage(true);
      if (typeof applyTheme === 'function' && data['rgb_theme']) {
        // Căutăm obiectul temă și îl aplicăm
        const t = THEMES.find(x => x.id === data['rgb_theme']);
        if (t) applyTheme(t);
      }
    } else {
      console.log('[CloudSync] Nu există date salvate anterior pentru acest cont.');
      // Dacă e cont nou, încărcăm datele locale actuale în cloud
      await cloudPushData();
    }
  } catch (err) {
    console.error('[CloudSync] Eroare la pull:', err);
  }
};

/**
 * Salvează starea curentă a LocalStorage în Firestore.
 * Apelat automat la modificări (debounced).
 */
window.cloudPushData = async function() {
  if (!fbDb || !fbUser || _isSyncing) return;
  _isSyncing = true;

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

  // Adăugăm metadata
  payload.lastSync = firebase.firestore.FieldValue.serverTimestamp();
  payload.email = fbUser.email;
  payload.username = fbUser.displayName || fbUser.email.split('@')[0];

  try {
    await fbDb.collection('user_data').doc(fbUser.uid).set(payload, { merge: true });
    console.log('[CloudSync] Date salvate în Cloud.');
  } catch (err) {
    console.error('[CloudSync] Eroare la push:', err);
  } finally {
    _isSyncing = false;
  }
};

/**
 * Interceptează modificările importante și declanșează push.
 */
(function setupCloudAutoSave() {
  // Debounce helper
  let timeout;
  const triggerPush = () => {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      window.cloudPushData();
    }, 2000); // Salvăm la 2 secunde după ultima modificare
  };

  // Observăm Storage-ul local (pentru modificări din alte scripturi)
  window.addEventListener('storage', (e) => {
    if (CLOUD_KEYS.includes(e.key)) triggerPush();
  });

  // Monkey-patch localStorage.setItem pentru a intercepta apelurile din script.js
  const originalSetItem = localStorage.setItem;
  localStorage.setItem = function(key, value) {
    originalSetItem.apply(this, arguments);
    if (CLOUD_KEYS.includes(key)) triggerPush();
  };
})();

/* ═══════════════════════════════════════════════════════════════
   firebase-auth.js
   Login cu Google + Facebook via Firebase Authentication
   Share bilete via link public generat în Firestore
═══════════════════════════════════════════════════════════════ */

'use strict';

const FIREBASE_CONFIG = {
  apiKey:            "INLOCUIESTE_CU_API_KEY",
  authDomain:        "INLOCUIESTE_CU_AUTH_DOMAIN",
  projectId:         "INLOCUIESTE_CU_PROJECT_ID",
  storageBucket:     "INLOCUIESTE_CU_STORAGE_BUCKET",
  messagingSenderId: "INLOCUIESTE_CU_SENDER_ID",
  appId:             "INLOCUIESTE_CU_APP_ID",
};

let fbApp = null, fbAuth = null, fbDb = null, fbUser = null, fbReady = false;

function fbLoadSDK() {
  return new Promise((resolve, reject) => {
    if (fbReady) { resolve(); return; }
    if (FIREBASE_CONFIG.apiKey === 'INLOCUIESTE_CU_API_KEY') {
      fbShowSetupGuide(); reject(new Error('config_missing')); return;
    }
    const scripts = [
      'https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js',
      'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth-compat.js',
      'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore-compat.js',
    ];
    let loaded = 0;
    scripts.forEach(src => {
      const sc = document.createElement('script');
      sc.src = src;
      sc.onload = () => {
        loaded++;
        if (loaded === scripts.length) {
          try {
            fbApp = firebase.initializeApp(FIREBASE_CONFIG);
            fbAuth = firebase.auth();
            fbDb = firebase.firestore();
            fbReady = true;
            fbAuth.onAuthStateChanged(fbHandleAuthState);
            resolve();
          } catch(e) { reject(e); }
        }
      };
      sc.onerror = () => reject(new Error('sdk_load_failed'));
      document.head.appendChild(sc);
    });
  });
}

function fbHandleAuthState(user) {
  if (user) { fbUser = user; if (typeof cloudPullData === 'function') window.cloudPullData(); }
  else fbUser = null;
}

window.authLogout = async function () {
  if (fbAuth && fbUser) { try { await fbAuth.signOut(); } catch {} fbUser = null; }
  if (typeof sessionStorage !== 'undefined') sessionStorage.clear();
  localStorage.removeItem('rgb_user');
  if (typeof Android !== 'undefined' && Android.logout) Android.logout();
  else window.location.reload();
};

/* ── SHARE SYSTEM (v12.0 Elite) ── */
window.shareTicket = async function (id) {
  const shareModal = document.getElementById('share-modal');
  const shareUrl = document.getElementById('share-url-input');
  const shareStatus = document.getElementById('share-status');
  if (shareModal) shareModal.classList.add('open');
  if (shareStatus) shareStatus.textContent = '⏳ Se generează linkul...';

  // Determinăm dacă ID-ul este bilet local sau postare socială
  let dataToShare = null;
  const isSocialPost = String(id).startsWith('post_');

  if (isSocialPost) {
    const posts = typeof getPosts === 'function' ? getPosts() : [];
    dataToShare = posts.find(p => p.id === id);
  } else {
    const raw = localStorage.getItem('rgb_bets');
    const bets = raw ? JSON.parse(raw) : [];
    dataToShare = bets.find(b => b.id === id);
  }

  if (!dataToShare) {
    if (shareStatus) shareStatus.textContent = '❌ Eroare: Date negăsite.';
    return;
  }

  // Fallback Link local dacă Firebase nu e configurat
  if (FIREBASE_CONFIG.apiKey === 'INLOCUIESTE_CU_API_KEY') {
    const mockUrl = `${window.location.href.split('?')[0]}?share=${id}`;
    if (shareUrl) shareUrl.value = mockUrl;
    if (shareStatus) shareStatus.textContent = '⚠️ Mod demonstrativ (Firebase neconectat)';
    fbShowShareButtons(mockUrl, dataToShare);
    return;
  }

  try {
    await fbLoadSDK();
    if (!fbUser) { fbShowPreShareAuth(id); return; }

    const docId = isSocialPost ? id : `${fbUser.uid}_${id}`;
    const docRef = fbDb.collection('shared_items').doc(docId);

    const payload = {
      type: isSocialPost ? 'post' : 'ticket',
      data: dataToShare,
      sharedBy: fbUser.displayName || fbUser.email,
      sharedAt: firebase.firestore.FieldValue.serverTimestamp(),
      uid: fbUser.uid
    };

    await docRef.set(payload);
    const publicUrl = `${window.location.href.split('?')[0]}?share=${docId}`;
    if (shareUrl) shareUrl.value = publicUrl;
    if (shareStatus) shareStatus.textContent = '✅ Link generat cu succes!';
    fbShowShareButtons(publicUrl, dataToShare);
  } catch (err) {
    if (shareStatus) shareStatus.textContent = '❌ Eroare: ' + err.message;
  }
};

function fbShowShareButtons(url, item) {
  const container = document.getElementById('share-social-btns');
  if (!container) return;
  const encoded = encodeURIComponent(url);
  const title = item.name || (item.tickets ? `Postare @${item.author}` : 'Bilet rGdbet');
  const text = encodeURIComponent(`🎫 Verifică ${title} pe rGdbet!`);

  container.innerHTML = `
    <a class="share-social-btn share-whatsapp" href="https://wa.me/?text=${text}%20${encoded}" target="_blank"><i class="fa-brands fa-whatsapp"></i> WhatsApp</a>
    <a class="share-social-btn share-facebook" href="https://www.facebook.com/sharer/sharer.php?u=${encoded}" target="_blank"><i class="fa-brands fa-facebook"></i> Facebook</a>
    <a class="share-social-btn share-telegram" href="https://t.me/share/url?url=${encoded}&text=${text}" target="_blank"><i class="fa-brands fa-telegram"></i> Telegram</a>
    <button class="share-social-btn share-copy" onclick="fbCopyShareUrl()"><i class="fa-solid fa-copy"></i> Copiază</button>
  `;
}

window.fbCopyShareUrl = function () {
  const inp = document.getElementById('share-url-input');
  if (!inp) return;
  navigator.clipboard.writeText(inp.value).then(() => {
    const btn = document.querySelector('.share-copy');
    if (btn) { btn.innerHTML = '✅ Copiat!'; setTimeout(() => btn.innerHTML = '<i class="fa-solid fa-copy"></i> Copiază', 2000); }
  });
};

window.openShareModal = function(id) { window.shareTicket(id); };
window.closeShareModal = function() { document.getElementById('share-modal')?.classList.remove('open'); };

function fbShowSetupGuide() {
  console.warn('[rGdbet] Firebase Config Missing. Please update FIREBASE_CONFIG in firebase-auth.js');
}

function fbShowPreShareAuth(id) {
  alert('Te rugăm să te autentifici pentru a genera link-uri de share.');
}

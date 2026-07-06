/* ═══════════════════════════════════════════════════════════════
   firebase-auth.js
   Sistem Distribuire Hibridă (Bilete + Postări Sociale)
   v13.1 Elite Apex Edition
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
      console.warn('[Firebase] Config lipsă.'); reject(new Error('config_missing')); return;
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
            fbAuth.onAuthStateChanged(user => { fbUser = user; });
            resolve();
          } catch(e) { reject(e); }
        }
      };
      document.head.appendChild(sc);
    });
  });
}

/**
 * 🛠️ SHARE POLYMORPHIC (v13.1)
 * Suportă atât Bilete locale cât și Postări Sociale.
 */
window.shareTicket = async function (id) {
  const modal = document.getElementById('share-modal');
  const shareUrlInp = document.getElementById('share-url-input');
  const status = document.getElementById('share-status');

  if (modal) modal.classList.add('open');
  if (status) status.textContent = '⏳ Se generează linkul Apex...';

  let dataToShare = null;
  const isPost = String(id).startsWith('post_');

  // Identificăm sursa datelor
  if (isPost) {
    const posts = typeof getPosts === 'function' ? getPosts() : [];
    dataToShare = posts.find(p => p.id === id);
  } else {
    const bets = JSON.parse(localStorage.getItem('rgb_bets') || '[]');
    dataToShare = bets.find(b => b.id === parseInt(id));
  }

  if (!dataToShare) {
    if (status) status.textContent = '❌ Eroare: Datele nu au fost găsite.';
    return;
  }

  // Fallback Link Demo
  if (FIREBASE_CONFIG.apiKey === 'INLOCUIESTE_CU_API_KEY') {
    const demoUrl = `${window.location.href.split('?')[0]}?share=${id}`;
    if (shareUrlInp) shareUrlInp.value = demoUrl;
    if (status) status.textContent = '⚠️ Mod Demo (Firebase neconfigurat)';
    fbShowShareButtons(demoUrl, dataToShare);
    return;
  }

  try {
    await fbLoadSDK();
    if (!fbUser) {
      if (status) status.textContent = '🔐 Te rugăm să te autentifici.';
      return;
    }

    const docId = isPost ? id : `ticket_${fbUser.uid}_${id}`;
    await fbDb.collection('shared_items').doc(docId).set({
      type: isPost ? 'post' : 'ticket',
      payload: dataToShare,
      author: fbUser.displayName || fbUser.email,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });

    const finalUrl = `${window.location.origin}${window.location.pathname}?share=${docId}`;
    if (shareUrlInp) shareUrlInp.value = finalUrl;
    if (status) status.textContent = '✅ Link Apex generat cu succes!';
    fbShowShareButtons(finalUrl, dataToShare);

  } catch (err) {
    if (status) status.textContent = '❌ Eroare Cloud: ' + err.message;
  }
};

function fbShowShareButtons(url, item) {
  const container = document.getElementById('share-social-btns');
  if (!container) return;

  const encoded = encodeURIComponent(url);
  const title = item.tickets ? `Postarea @${item.author}` : (item.name || 'Bilet');
  const text = encodeURIComponent(`🎫 Verifică ${title} pe rGdbet Apex!`);

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
function fbShowSetupGuide() { console.warn('[Firebase] Configurație lipsă în firebase-auth.js'); }

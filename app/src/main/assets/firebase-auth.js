/* ═══════════════════════════════════════════════════════════════
   firebase-auth.js
   Sistem Distribuire Hibridă (Bilete + Postări Sociale)
   v15.2 Debug & Fix Edition
═══════════════════════════════════════════════════════════════ */

'use strict';

const FIREBASE_CONFIG = {
  apiKey:            "AIzaSyCxhvk4QcFsdP9yZdJzjvQ6uAUo1Qv7rXc",
  authDomain:        "rgdbet-rgd1495.firebaseapp.com",
  projectId:         "rgdbet-rgd1495",
  storageBucket:     "rgdbet-rgd1495.firebasestorage.app",
  messagingSenderId: "679777601888",
  appId:             "1:679777601888:android:e24dd003116b52681ef605",
};

let fbApp = null, fbAuth = null, fbDb = null, fbUser = null, fbReady = false;

function fbLoadSDK() {
  return new Promise((resolve, reject) => {
    if (fbReady) { resolve(); return; }
    if (FIREBASE_CONFIG.apiKey.includes('API_KEY')) {
      console.warn('[Firebase] Config demo activat.');
      resolve(); return;
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

window.shareTicket = async function (id) {
  console.log('[Share] Inițiere proces pentru ID:', id);
  const modal = document.getElementById('share-modal');
  const shareUrlInp = document.getElementById('share-url-input');
  const status = document.getElementById('share-status');

  if (modal) {
    modal.classList.add('open');
    modal.style.display = 'flex'; // Forțăm display flex
  }
  if (status) status.textContent = '⏳ Se generează linkul Apex...';

  let dataToShare = null;
  const isPost = String(id).startsWith('post_');

  if (isPost) {
    const posts = typeof getPosts === 'function' ? getPosts() : [];
    dataToShare = posts.find(p => p.id === id);
  } else {
    const bets = JSON.parse(localStorage.getItem('rgb_bets') || '[]');
    dataToShare = bets.find(b => b.id === parseInt(id));
  }

  if (!dataToShare) {
    console.error('[Share] Date negăsite pentru ID:', id);
    if (status) status.textContent = '❌ Eroare: Biletul nu a fost găsit.';
    return;
  }

  // Fallback Demo
  if (FIREBASE_CONFIG.apiKey.includes('API_KEY')) {
    const demoUrl = `${window.location.origin}${window.location.pathname}?share=${id}`;
    if (shareUrlInp) shareUrlInp.value = demoUrl;
    if (status) status.textContent = '✅ Link generat (Mod Demo)';
    fbShowShareButtons(demoUrl, dataToShare);
    return;
  }

  try {
    await fbLoadSDK();
    const docId = isPost ? id : `ticket_${Date.now()}`;
    // Aici ar veni logica Firestore dacă avem Config valid
    const finalUrl = `${window.location.origin}${window.location.pathname}?share=${docId}`;
    if (shareUrlInp) shareUrlInp.value = finalUrl;
    if (status) status.textContent = '✅ Gata de trimis!';
    fbShowShareButtons(finalUrl, dataToShare);
  } catch (err) {
    console.error('[Share] Eroare:', err);
    if (status) status.textContent = '❌ Eroare: ' + err.message;
  }
};

function fbShowShareButtons(url, item) {
  const container = document.getElementById('share-social-btns');
  if (!container) return;
  const encoded = encodeURIComponent(url);
  const text = encodeURIComponent(`🎫 Verifică biletul meu pe rGdbet Apex!`);

  container.innerHTML = `
    <a class="share-social-btn share-whatsapp" href="https://wa.me/?text=${text}%20${encoded}" target="_blank" style="background:#25D366; color:#fff; padding:10px; border-radius:8px; text-decoration:none; display:flex; align-items:center; gap:5px;"><i class="fa-brands fa-whatsapp"></i> WhatsApp</a>
    <a class="share-social-btn share-facebook" href="https://www.facebook.com/sharer/sharer.php?u=${encoded}" target="_blank" style="background:#1877F2; color:#fff; padding:10px; border-radius:8px; text-decoration:none; display:flex; align-items:center; gap:5px;"><i class="fa-brands fa-facebook"></i> Facebook</a>
    <button class="share-social-btn share-copy" onclick="fbCopyShareUrl()" style="background:var(--nb); color:#000; padding:10px; border:none; border-radius:8px; cursor:pointer;"><i class="fa-solid fa-copy"></i> Copiază</button>
  `;
}

window.fbCopyShareUrl = function () {
  const inp = document.getElementById('share-url-input');
  if (!inp) return;
  inp.select();
  document.execCommand('copy');
  alert('Link copiat în clipboard!');
};

window.closeShareModal = function() {
  const modal = document.getElementById('share-modal');
  if (modal) {
    modal.classList.remove('open');
    modal.style.display = 'none';
  }
};

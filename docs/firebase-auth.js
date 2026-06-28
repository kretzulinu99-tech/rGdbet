/* ═══════════════════════════════════════════════════════════════
   firebase-auth.js
   Login cu Google + Facebook via Firebase Authentication
   Share bilete via link public generat în Firestore

   ⚙️  SETUP (o singură dată):
   1. Mergi la https://console.firebase.google.com
   2. Creează proiect → Authentication → Sign-in method
      → Activează Google  ✓
      → Activează Facebook ✓ (necesită Facebook App ID + Secret)
   3. Mergi la Project Settings → Your apps → Add web app
   4. Copiază config-ul în obiectul FIREBASE_CONFIG de mai jos
   5. Pentru share: activează Firestore Database în Firebase Console
   6. Pentru Facebook: https://developers.facebook.com
      → My Apps → Create App → Facebook Login
      → OAuth Redirect URI: https://TUL_PROIECT.firebaseapp.com/__/auth/handler

   📌  Regulile Firestore (pune în Console → Firestore → Rules):
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /shared_tickets/{ticketId} {
         allow read: if true;
         allow write: if request.auth != null;
       }
     }
   }
═══════════════════════════════════════════════════════════════ */

'use strict';

/* ══════════════════════════════════════════════════════════════
   1. CONFIGURARE FIREBASE
   !! Înlocuiește valorile de mai jos cu cele din Firebase Console !!
══════════════════════════════════════════════════════════════ */
const FIREBASE_CONFIG = {
  apiKey:            "INLOCUIESTE_CU_API_KEY",
  authDomain:        "INLOCUIESTE_CU_AUTH_DOMAIN",
  projectId:         "INLOCUIESTE_CU_PROJECT_ID",
  storageBucket:     "INLOCUIESTE_CU_STORAGE_BUCKET",
  messagingSenderId: "INLOCUIESTE_CU_SENDER_ID",
  appId:             "INLOCUIESTE_CU_APP_ID",
};

/* ══════════════════════════════════════════════════════════════
   2. STARE GLOBALĂ
══════════════════════════════════════════════════════════════ */
let fbApp      = null;   // Firebase App
let fbAuth     = null;   // Firebase Auth
let fbDb       = null;   // Firestore
let fbUser     = null;   // utilizator curent Firebase
let fbReady    = false;  // SDK încărcat

/* ══════════════════════════════════════════════════════════════
   3. ÎNCĂRCARE SDK FIREBASE (dinamic, din CDN)
══════════════════════════════════════════════════════════════ */
function fbLoadSDK() {
  return new Promise((resolve, reject) => {
    if (fbReady) { resolve(); return; }

    // Verifică dacă config-ul a fost completat
    if (FIREBASE_CONFIG.apiKey === 'INLOCUIESTE_CU_API_KEY') {
      console.warn('[rGdbet] Firebase: config necompletat — login social dezactivat');
      fbShowSetupGuide();
      reject(new Error('config_missing'));
      return;
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
            fbApp  = firebase.initializeApp(FIREBASE_CONFIG);
            fbAuth = firebase.auth();
            fbDb   = firebase.firestore();
            fbReady = true;

            // Observer de stare autentificare
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

/* ══════════════════════════════════════════════════════════════
   4. HANDLER STARE AUTH — apelat automat la login/logout
══════════════════════════════════════════════════════════════ */
function fbHandleAuthState(user) {
  if (user) {
    fbUser = user;
    fbOnLoginSuccess(user);
  } else {
    fbUser = null;
  }
}

function fbOnLoginSuccess(user) {
  // Extrage sau construiește username din displayName / email
  const rawName  = user.displayName || user.email.split('@')[0];
  const username = rawName.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_.]/g, '').substring(0, 20) || 'user';

  // Salvează/actualizează în sistemul local de auth
  const users = authGetUsers();
  const key   = username.toLowerCase();

  if (!users[key]) {
    users[key] = {
      username,
      email:        user.email,
      passwordHash: '__firebase__',   // cont social — fără parolă locală
      createdAt:    new Date().toISOString(),
      avatar:       user.photoURL || null,
      provider:     user.providerData[0]?.providerId || 'firebase',
      firebaseUid:  user.uid,
    };
    authSaveUsers(users);
  }

  // Pornește sesiunea în sistemul existent de auth
  authStartSession(users[key]);
}

/* ══════════════════════════════════════════════════════════════
   5. GOOGLE SIGN-IN
══════════════════════════════════════════════════════════════ */
window.fbSignInGoogle = async function () {
  fbSetOAuthLoading('google', true);
  try {
    await fbLoadSDK();
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.addScope('email');
    provider.addScope('profile');
    await fbAuth.signInWithPopup(provider);
    // fbHandleAuthState se apelează automat după popup
  } catch (err) {
    fbSetOAuthLoading('google', false);
    fbHandleOAuthError(err, 'Google');
  }
};

/* ══════════════════════════════════════════════════════════════
   6. FACEBOOK SIGN-IN
══════════════════════════════════════════════════════════════ */
window.fbSignInFacebook = async function () {
  fbSetOAuthLoading('facebook', true);
  try {
    await fbLoadSDK();
    const provider = new firebase.auth.FacebookAuthProvider();
    provider.addScope('email');
    provider.addScope('public_profile');
    await fbAuth.signInWithPopup(provider);
  } catch (err) {
    fbSetOAuthLoading('facebook', false);
    fbHandleOAuthError(err, 'Facebook');
  }
};

/* ══════════════════════════════════════════════════════════════
   7. LOGOUT FIREBASE (extinde authLogout existent)
══════════════════════════════════════════════════════════════ */
const _origLogout = window.authLogout;
window.authLogout = async function () {
  if (fbAuth && fbUser) {
    try { await fbAuth.signOut(); } catch {}
    fbUser = null;
  }
  if (typeof _origLogout === 'function') _origLogout();
};

/* ══════════════════════════════════════════════════════════════
   8. SHARE BILET — link public via Firestore
══════════════════════════════════════════════════════════════ */
window.shareTicket = async function (betId) {
  // Găsim biletul
  const raw  = localStorage.getItem('rgb_bets');
  const bets = raw ? JSON.parse(raw) : [];
  const bet  = bets.find(b => b.id === betId);
  if (!bet) return;

  const shareModal = document.getElementById('share-modal');
  const shareUrl   = document.getElementById('share-url-input');
  const shareStatus = document.getElementById('share-status');

  if (shareModal) shareModal.classList.add('open');
  if (shareStatus) shareStatus.textContent = '⏳ Se generează linkul...';
  if (shareUrl) shareUrl.value = '';

  // Dacă Firebase nu e configurat → generează un link local mock
  if (FIREBASE_CONFIG.apiKey === 'INLOCUIESTE_CU_API_KEY') {
    const mockId  = 'local_' + betId;
    const mockUrl = `${window.location.href.split('?')[0]}?ticket=${mockId}`;
    if (shareUrl)   shareUrl.value   = mockUrl;
    if (shareStatus) shareStatus.textContent = '⚠️ Firebase neconectat — link demonstrativ';
    fbShowShareButtons(mockUrl, bet);
    return;
  }

  try {
    await fbLoadSDK();

    // Dacă nu e autentificat, cere login înainte de share
    if (!fbUser) {
      if (shareModal) shareModal.classList.remove('open');
      fbShowPreShareAuth(betId);
      return;
    }

    // Salvează biletul în Firestore
    const docId  = `${fbUser.uid}_${betId}`;
    const docRef = fbDb.collection('shared_tickets').doc(docId);

    const shareData = {
      betId,
      title:      bet.name,
      sport:      bet.sport || 'football',
      odds:       bet.odds,
      stake:      bet.stake,
      status:     bet.status,
      events:     bet.events || [],
      date:       bet.date,
      confidence: bet.confidence || 0,
      sharedBy:   fbUser.displayName || fbUser.email,
      sharedAt:   firebase.firestore.FieldValue.serverTimestamp(),
      uid:        fbUser.uid,
    };

    await docRef.set(shareData);

    const publicUrl = `${window.location.href.split('?')[0]}?ticket=${docId}`;

    if (shareUrl)    shareUrl.value   = publicUrl;
    if (shareStatus) shareStatus.textContent = '✅ Link generat! Distribuie oriunde:';

    fbShowShareButtons(publicUrl, bet);

    // Salvează url-ul și pe bilet (pentru referință)
    const betIdx = bets.findIndex(b => b.id === betId);
    if (betIdx >= 0) {
      bets[betIdx].shareUrl = publicUrl;
      localStorage.setItem('rgb_bets', JSON.stringify(bets));
    }

  } catch (err) {
    console.error('[rGdbet] Share error:', err);
    if (shareStatus) shareStatus.textContent = '❌ Eroare: ' + err.message;
  }
};

/* ══════════════════════════════════════════════════════════════
   9. AFIȘARE BILET PARTAJAT (la deschidere link ?ticket=ID)
══════════════════════════════════════════════════════════════ */
async function fbCheckSharedTicket() {
  const params = new URLSearchParams(window.location.search);
  const ticketId = params.get('ticket');
  if (!ticketId) return;

  // Link local mock
  if (ticketId.startsWith('local_')) {
    const betId = parseInt(ticketId.replace('local_', ''));
    const raw   = localStorage.getItem('rgb_bets');
    const bets  = raw ? JSON.parse(raw) : [];
    const bet   = bets.find(b => b.id === betId);
    if (bet) fbShowPublicTicketCard(bet);
    return;
  }

  // Link Firebase real
  try {
    await fbLoadSDK();
    const doc = await fbDb.collection('shared_tickets').doc(ticketId).get();
    if (doc.exists) {
      fbShowPublicTicketCard(doc.data());
    }
  } catch (err) {
    console.error('[rGdbet] Load shared ticket error:', err);
  }
}

function fbShowPublicTicketCard(bet) {
  // Creează overlay cu preview-ul biletului
  const stars = Array.from({length:5}, (_,i) =>
    `<span style="color:${i < (bet.confidence||0) ? '#ffcc00' : '#333'};font-size:16px;">★</span>`
  ).join('');

  const statusColor = bet.status === 'win' ? '#00ff88'
    : bet.status === 'loss' ? '#ff3366'
    : bet.status === 'cashout' ? '#ffcc00' : '#8b949e';

  const eventsHtml = (bet.events || []).map(ev =>
    `<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid rgba(255,255,255,.06);">
      <span style="font-size:13px;color:#c9d1d9;">🔹 ${ev.name}</span>
      <span style="color:#58a6ff;font-weight:700;">@${parseFloat(ev.odds).toFixed(2)}</span>
    </div>`
  ).join('');

  const card = document.createElement('div');
  card.id = 'public-ticket-overlay';
  card.innerHTML = `
    <div style="position:fixed;inset:0;background:rgba(0,0,0,.92);z-index:999999;
                display:flex;align-items:center;justify-content:center;padding:20px;">
      <div style="background:#161b22;border:1px solid #30363d;border-radius:20px;
                  padding:24px;max-width:380px;width:100%;
                  box-shadow:0 20px 60px rgba(0,0,0,.8);">

        <div style="text-align:center;margin-bottom:16px;">
          <div style="font-family:Syncopate,sans-serif;font-size:10px;color:#8b949e;
                      letter-spacing:2px;margin-bottom:4px;">🎫 BILET PARTAJAT</div>
          <div style="font-size:17px;font-weight:700;color:#fff;">${bet.title || bet.name}</div>
          <div style="margin-top:6px;">${stars}</div>
        </div>

        <div style="background:rgba(0,0,0,.3);border-radius:12px;padding:12px;margin-bottom:12px;">
          ${eventsHtml || '<div style="color:#8b949e;text-align:center;font-size:13px;">Niciun eveniment</div>'}
        </div>

        <div style="display:flex;justify-content:space-between;align-items:center;
                    padding:10px 14px;background:rgba(0,0,0,.3);border-radius:10px;margin-bottom:8px;">
          <span style="color:#8b949e;font-size:13px;">Cotă totală</span>
          <span style="color:#58a6ff;font-weight:700;font-size:16px;">@${parseFloat(bet.odds||1).toFixed(2)}</span>
        </div>

        <div style="display:flex;justify-content:space-between;align-items:center;
                    padding:10px 14px;background:rgba(0,0,0,.3);border-radius:10px;margin-bottom:16px;">
          <span style="color:#8b949e;font-size:13px;">Status</span>
          <span style="color:${statusColor};font-weight:700;font-size:13px;letter-spacing:1px;">
            ${(bet.status||'PENDING').toUpperCase()}
          </span>
        </div>

        <div style="text-align:center;font-size:11px;color:#8b949e;margin-bottom:14px;">
          Partajat de <strong style="color:#58a6ff;">${bet.sharedBy || 'utilizator rGdbet'}</strong>
        </div>

        <a href="${window.location.href.split('?')[0]}"
           style="display:block;text-align:center;background:linear-gradient(135deg,#0088ff,#00ccff);
                  color:#fff;padding:12px;border-radius:12px;font-family:Syncopate,sans-serif;
                  font-size:10px;font-weight:700;letter-spacing:1px;text-decoration:none;">
          🚀 DESCHIDE rGdbet
        </a>
      </div>
    </div>
  `;
  document.body.appendChild(card);
}

/* ══════════════════════════════════════════════════════════════
   10. BUTOANE SHARE PE REȚELE SOCIALE
══════════════════════════════════════════════════════════════ */
function fbShowShareButtons(url, bet) {
  const container = document.getElementById('share-social-btns');
  if (!container) return;

  const encoded  = encodeURIComponent(url);
  const text     = encodeURIComponent(`🎫 Bilet: ${bet.name} @${parseFloat(bet.odds).toFixed(2)} — rGdbet`);

  container.innerHTML = `
    <a class="share-social-btn share-whatsapp"
       href="https://wa.me/?text=${text}%20${encoded}"
       target="_blank" rel="noopener">
      <i class="fa-brands fa-whatsapp"></i> WhatsApp
    </a>
    <a class="share-social-btn share-facebook"
       href="https://www.facebook.com/sharer/sharer.php?u=${encoded}"
       target="_blank" rel="noopener">
      <i class="fa-brands fa-facebook"></i> Facebook
    </a>
    <a class="share-social-btn share-twitter"
       href="https://twitter.com/intent/tweet?text=${text}&url=${encoded}"
       target="_blank" rel="noopener">
      <i class="fa-brands fa-x-twitter"></i> X / Twitter
    </a>
    <a class="share-social-btn share-telegram"
       href="https://t.me/share/url?url=${encoded}&text=${text}"
       target="_blank" rel="noopener">
      <i class="fa-brands fa-telegram"></i> Telegram
    </a>
    <button class="share-social-btn share-copy" onclick="fbCopyShareUrl()">
      <i class="fa-solid fa-copy"></i> Copiază
    </button>
  `;
}

window.fbCopyShareUrl = function () {
  const inp = document.getElementById('share-url-input');
  if (!inp) return;
  navigator.clipboard.writeText(inp.value).then(() => {
    const btn = document.querySelector('.share-copy');
    if (btn) { btn.innerHTML = '<i class="fa-solid fa-check"></i> Copiat!'; btn.style.background = '#00ff88'; btn.style.color = '#000'; setTimeout(() => { btn.innerHTML = '<i class="fa-solid fa-copy"></i> Copiază'; btn.style.background = ''; btn.style.color = ''; }, 2000); }
  });
};

/* ══════════════════════════════════════════════════════════════
   11. PRE-SHARE AUTH (dacă nu e logat)
══════════════════════════════════════════════════════════════ */
function fbShowPreShareAuth(betId) {
  const modal = document.getElementById('share-modal');
  if (!modal) return;
  modal.classList.add('open');
  const body = document.getElementById('share-modal-body');
  if (body) body.innerHTML = `
    <div style="text-align:center;padding:8px 0 16px;">
      <div style="font-size:32px;margin-bottom:10px;">🔐</div>
      <div style="font-family:Rajdhani,sans-serif;color:#c9d1d9;font-size:14px;margin-bottom:16px;">
        Trebuie să fii autentificat pentru a partaja bilete.
      </div>
      <button class="auth-oauth-btn google" onclick="fbSignInGoogle();closeShareModal();"
              style="width:100%;margin-bottom:8px;">
        <img src="https://www.google.com/favicon.ico" width="16" height="16" style="border-radius:2px;"> Continuă cu Google
      </button>
      <button class="auth-oauth-btn facebook" onclick="fbSignInFacebook();closeShareModal();"
              style="width:100%;">
        <i class="fa-brands fa-facebook"></i> Continuă cu Facebook
      </button>
    </div>
  `;
}

/* ══════════════════════════════════════════════════════════════
   12. GHID SETUP (când config-ul nu e completat)
══════════════════════════════════════════════════════════════ */
function fbShowSetupGuide() {
  const existing = document.getElementById('fb-setup-guide');
  if (existing) return;

  const guide = document.createElement('div');
  guide.id = 'fb-setup-guide';
  guide.innerHTML = `
    <div style="position:fixed;bottom:80px;left:50%;transform:translateX(-50%);
                background:#161b22;border:1px solid #f0883e;border-radius:16px;
                padding:16px 20px;max-width:340px;width:calc(100% - 32px);
                z-index:9600;box-shadow:0 8px 30px rgba(0,0,0,.6);">
      <div style="font-family:Syncopate,sans-serif;font-size:9px;color:#f0883e;
                  letter-spacing:2px;margin-bottom:8px;">⚙️ SETUP FIREBASE</div>
      <div style="font-family:Rajdhani,sans-serif;font-size:13px;color:#c9d1d9;line-height:1.5;">
        Pentru a activa loginul cu Google/Facebook:<br>
        1. Mergi la <a href="https://console.firebase.google.com" target="_blank"
                       style="color:#58a6ff;">console.firebase.google.com</a><br>
        2. Creează un proiect → Authentication → Sign-in method<br>
        3. Copiază config-ul în <code style="color:#79c0ff;">FIREBASE_CONFIG</code> din
           <code style="color:#79c0ff;">firebase-auth.js</code>
      </div>
      <button onclick="this.parentElement.parentElement.remove()"
              style="margin-top:12px;background:rgba(255,255,255,.08);border:none;
                     border-radius:8px;color:#8b949e;padding:6px 14px;
                     font-size:12px;cursor:pointer;width:100%;">Închide</button>
    </div>
  `;
  document.body.appendChild(guide);
  setTimeout(() => guide.remove(), 12000);
}

/* ══════════════════════════════════════════════════════════════
   13. ERORI OAUTH
══════════════════════════════════════════════════════════════ */
function fbHandleOAuthError(err, provider) {
  const codes = {
    'auth/popup-closed-by-user':   'Fereastra de login a fost închisă.',
    'auth/cancelled-popup-request':'O altă fereastră de login e deschisă.',
    'auth/popup-blocked':          'Browser-ul a blocat fereastra popup. Permite popup-urile pentru acest site.',
    'auth/account-exists-with-different-credential':
      'Există deja un cont cu acest email. Încearcă cu alt provider.',
    'auth/network-request-failed': 'Eroare de rețea. Verifică conexiunea.',
  };
  const msg = codes[err.code] || `Eroare ${provider}: ${err.message}`;
  if (typeof authShowError === 'function') authShowError(msg);
  else alert(msg);
}

function fbSetOAuthLoading(provider, loading) {
  const btn = document.querySelector(`.auth-oauth-btn.${provider}`);
  if (!btn) return;
  btn.disabled = loading;
  btn.style.opacity = loading ? '0.6' : '1';
  if (loading) btn.dataset.origHtml = btn.innerHTML;
  btn.innerHTML = loading
    ? `<span style="display:inline-block;width:14px;height:14px;border:2px solid rgba(255,255,255,.3);
                   border-top-color:#fff;border-radius:50%;animation:fbSpin .7s linear infinite;
                   margin-right:8px;vertical-align:middle;"></span> Se conectează...`
    : (btn.dataset.origHtml || btn.innerHTML);
}

/* ══════════════════════════════════════════════════════════════
   14. MODAL SHARE — open/close
══════════════════════════════════════════════════════════════ */
window.openShareModal = function (betId) {
  const modal = document.getElementById('share-modal');
  if (modal) {
    modal.classList.add('open');
    // Reset conținut
    const status = document.getElementById('share-status');
    const inp    = document.getElementById('share-url-input');
    const btns   = document.getElementById('share-social-btns');
    const body   = document.getElementById('share-modal-body');
    if (status) status.textContent = '';
    if (inp)    inp.value = '';
    if (btns)   btns.innerHTML = '';
    if (body)   body.innerHTML = `
      <div style="text-align:center;padding:8px 0 4px;">
        <div class="auth-error" id="share-status" style="display:block;background:rgba(0,200,255,.08);
             border-color:rgba(0,200,255,.2);color:var(--nb);">⏳ Se generează linkul...</div>
      </div>
      <div style="margin:12px 0;">
        <div style="font-family:Syncopate,sans-serif;font-size:8px;color:var(--text2);
                    letter-spacing:1px;margin-bottom:6px;">LINK PUBLIC</div>
        <div style="display:flex;gap:6px;">
          <input id="share-url-input" type="text" readonly
                 style="flex:1;background:rgba(0,0,0,.4);border:1px solid var(--border);
                        border-radius:10px;padding:10px 12px;color:var(--text);
                        font-family:Rajdhani,sans-serif;font-size:12px;outline:none;"
                 placeholder="linkul se generează..."/>
          <button onclick="fbCopyShareUrl()"
                  style="background:var(--nb);border:none;border-radius:10px;
                         padding:0 14px;color:#000;font-size:14px;cursor:pointer;">
            <i class="fa-solid fa-copy"></i>
          </button>
        </div>
      </div>
      <div id="share-social-btns" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:4px;"></div>
    `;
  }
  shareTicket(betId);
};

window.closeShareModal = function () {
  const modal = document.getElementById('share-modal');
  if (modal) modal.classList.remove('open');
};

/* ══════════════════════════════════════════════════════════════
   15. INIT — verifică shared ticket la pornire
══════════════════════════════════════════════════════════════ */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', fbCheckSharedTicket);
} else {
  fbCheckSharedTicket();
}

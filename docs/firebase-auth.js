/* ═══════════════════════════════════════════════════════════════
   firebase-auth.js
   Sistem Core Firebase & Cloud Connection
   v15.3 Sovereign Cleanup
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

window.fbLoadSDK = function() {
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
};

// NOTE: Functiile de Sharing au fost mutate in social.js (v11.0 Unification)

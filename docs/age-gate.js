/* ═══════════════════════════════════════════════════════════════
   age-gate.js — Verificare vârstă +18
   Prima deschidere: overlay obligatoriu
   Confirmare salvată în localStorage
   Refuz: redirectare la google.com
═══════════════════════════════════════════════════════════════ */
'use strict';

const AG_KEY  = 'rgb_age_verified';  // localStorage key
const AG_VER  = '1';                 // incrementează dacă vrei să re-afișezi

window.ageGateConfirm = function (confirmed) {
  if (!confirmed) {
    // Minorul este redirectionat
    try { window.location.replace('https://www.google.com'); } catch {}
    return;
  }

  // Salvăm confirmarea
  localStorage.setItem(AG_KEY, AG_VER);

  // Animăm dispariția
  const overlay = document.getElementById('age-gate');
  if (!overlay) return;
  overlay.classList.add('hiding');
  setTimeout(() => {
    overlay.style.display = 'none';
    overlay.remove();
    // Pornim aplicația
    if (typeof window._appReady === 'function') window._appReady();
  }, 420);
};

// Modal helpers
window.showTerms = function () {
  const m = document.getElementById('terms-modal');
  if (m) m.style.display = 'flex';
};
window.showPrivacy = function () {
  const m = document.getElementById('privacy-modal');
  if (m) m.style.display = 'flex';
};
window.closeModal = function (id) {
  const m = document.getElementById(id);
  if (m) m.style.display = 'none';
};

// Închide modal dacă click pe overlay
document.addEventListener('click', function (e) {
  ['terms-modal','privacy-modal'].forEach(id => {
    const m = document.getElementById(id);
    if (m && m.style.display === 'flex' && e.target === m) {
      m.style.display = 'none';
    }
  });
});

// ── Verificare la pornire ──
(function checkAgeGate() {
  const overlay = document.getElementById('age-gate');
  if (!overlay) return;

  const verified = localStorage.getItem(AG_KEY);
  if (verified === AG_VER) {
    // Deja confirmat — ascundem imediat fără animație
    overlay.style.display = 'none';
    if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
  }
  // Dacă nu e verificat, overlay-ul rămâne vizibil (default din HTML)
})();

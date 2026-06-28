/* ═══════════════════════════════════════════════════════════════
   premium.js — Subscription system + Premium locks
   Tiers: 'free' | 'premium'
   Premium features: LAB (Laborator Statistic), SIM (Simulare DSS)
═══════════════════════════════════════════════════════════════ */
'use strict';

/* ─── Helpers pentru tier ─── */
function premiumGetTier() {
  const session = typeof authGetSession === 'function' ? authGetSession() : null;
  if (!session) return 'free';
  const users = typeof authGetUsers === 'function' ? authGetUsers() : {};
  const user  = users[(session.username || '').toLowerCase()];
  return (user && user.tier === 'premium') ? 'premium' : 'free';
}

function premiumSetTier(tier) {
  const session = typeof authGetSession === 'function' ? authGetSession() : null;
  if (!session) return;
  const users = typeof authGetUsers === 'function' ? authGetUsers() : {};
  const key   = (session.username || '').toLowerCase();
  if (users[key]) {
    users[key].tier = tier;
    if (typeof authSaveUsers === 'function') authSaveUsers(users);
  }
}

window.premiumGetTier = premiumGetTier;
window.premiumSetTier = premiumSetTier;

/* ─── Inject lock overlay pe o pagina ─── */
function premiumInjectLock(pageId, featureName) {
  const page = document.getElementById(pageId);
  if (!page) return;

  // Wrapuim continutul existent
  const wrap = document.createElement('div');
  wrap.className = 'locked-page-wrap';
  wrap.style.cssText = 'position:relative;min-height:60vh;';

  // Blur pe continut
  const inner = document.createElement('div');
  inner.style.cssText = 'filter:blur(6px) brightness(0.4);pointer-events:none;';
  while (page.firstChild) inner.appendChild(page.firstChild);
  wrap.appendChild(inner);

  // Overlay lock
  const overlay = document.createElement('div');
  overlay.className = 'premium-lock-overlay';
  overlay.innerHTML = `
    <div class="lock-icon"><i class="fa-solid fa-lock"></i></div>
    <div class="lock-title">FUNCȚIE PREMIUM</div>
    <div class="lock-sub">
      ${featureName} este disponibil exclusiv utilizatorilor
      cu abonament <strong style="color:var(--gold);">Premium</strong>.
    </div>
    <button class="lock-upgrade-btn" onclick="navigateTo('profil',document.querySelector('.nav-btn[data-page=profil]'));premiumScrollToPlans()">
      ⚡ UPGRADE TO PREMIUM
    </button>
    <div style="margin-top:12px;font-family:Rajdhani,sans-serif;font-size:12px;color:rgba(255,255,255,.3);">
      De la 4.99 RON / lună
    </div>
  `;
  wrap.appendChild(overlay);
  page.appendChild(wrap);
}

/* ─── Verificare si aplicare lock-uri ─── */
function premiumApplyLocks() {
  const tier = premiumGetTier();
  if (tier === 'premium') {
    // Curata orice lock existent
    document.querySelectorAll('.premium-lock-overlay').forEach(el => {
      const wrap = el.closest('.locked-page-wrap');
      if (wrap) {
        const page = wrap.parentElement;
        const inner = wrap.querySelector('div');
        if (inner) {
          inner.style.filter = '';
          inner.style.pointerEvents = '';
          while (inner.firstChild) page.appendChild(inner.firstChild);
        }
        wrap.remove();
      }
    });
    return;
  }
  // Free: lock LAB si SIM
  const labPage   = document.getElementById('page-lab');
  const matchPage = document.getElementById('page-match');
  if (labPage   && labPage.children.length   > 0 && !labPage.querySelector('.premium-lock-overlay'))
    premiumInjectLock('page-lab',   'Laboratorul Statistic (Dixon-Coles, Monte Carlo, EV)');
  if (matchPage && matchPage.children.length > 0 && !matchPage.querySelector('.premium-lock-overlay'))
    premiumInjectLock('page-match', 'Simulatorul de Meci DSS (Motor Stocastic Avansat)');
}

/* ─── Scroll catre planuri in pagina Profil ─── */
window.premiumScrollToPlans = function () {
  setTimeout(() => {
    const el = document.getElementById('premium-plans-section');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 400);
};

/* ─── Simulare activare abonament ─── */
window.premiumActivate = function (plan) {
  // In productie: integreaza Stripe / RevenueCat / Google Pay
  // Deocamdata: simulare locala cu confirmare
  const prices = { monthly: '4.99 RON', yearly: '39.99 RON' };
  const msg = `🔓 Activezi abonamentul PREMIUM (${prices[plan] || plan})?\n\nÎn producție, vei fi redirecționat spre pagina de plată securizată.`;
  if (!confirm(msg)) return;

  premiumSetTier('premium');

  // Feedback vizual
  const btn = document.querySelector(`[data-plan="${plan}"]`);
  if (btn) {
    btn.innerHTML = '<i class="fa-solid fa-check"></i> ACTIVAT!';
    btn.style.background = 'linear-gradient(135deg,#00ff88,#00cc66)';
    btn.style.color = '#000';
  }

  // Rebuld profil si aplica unlock
  const session = typeof authGetSession === 'function' ? authGetSession() : null;
  if (session) {
    const users = typeof authGetUsers === 'function' ? authGetUsers() : {};
    const user  = users[(session.username || '').toLowerCase()];
    if (user) {
      buildProfileUI(user);
      premiumApplyLocks();
    }
  }

  // Confetti gold
  if (typeof window.confetti === 'function') {
    window.confetti({ particleCount: 120, spread: 100, colors: ['#ffcc00','#ff9900','#fff700','#ffffff'], origin: { y: 0.5 } });
  }

  alert('🎉 Felicitări! Contul tău Premium este acum activ. Ai acces la toate funcțiile avansate!');
};

/* ─── Hook pe buildLabUI / buildMatchUI pentru a aplica lock-urile dupa build ─── */
function premiumHookBuilders() {
  const origLab   = window.buildLabUI;
  const origMatch = window.buildMatchUI;

  if (typeof origLab === 'function' && !origLab._premiumHooked) {
    window.buildLabUI = function () {
      origLab.apply(this, arguments);
      setTimeout(() => premiumApplyLocks(), 50);
    };
    window.buildLabUI._premiumHooked = true;
  }
  if (typeof origMatch === 'function' && !origMatch._premiumHooked) {
    window.buildMatchUI = function () {
      origMatch.apply(this, arguments);
      setTimeout(() => premiumApplyLocks(), 50);
    };
    window.buildMatchUI._premiumHooked = true;
  }
}

/* ─── Injectare sectiune planuri in pagina Profil ─── */
function premiumBuildPlansSection(tier) {
  return `
    <div id="premium-plans-section" class="profile-section" style="margin-bottom:0;">
      <div class="profile-section-title">ABONAMENT</div>
      <div class="premium-upgrade-card">
        <div class="premium-card-title">
          ${tier === 'premium' ? '⚡ CONT PREMIUM ACTIV' : '⚡ UPGRADE TO PREMIUM'}
        </div>
        <div class="premium-card-sub">
          ${tier === 'premium'
            ? 'Ai acces complet la toate funcțiile avansate rGdbet.'
            : 'Deblochează analizele avansate, simulatorul DSS și multe altele.'}
        </div>
        <div class="premium-features">
          <div class="premium-feature"><i class="fa-solid fa-check-circle"></i> Laborator Statistic (Dixon-Coles + Monte Carlo)</div>
          <div class="premium-feature"><i class="fa-solid fa-check-circle"></i> Simulator de Meci DSS Avansat</div>
          <div class="premium-feature"><i class="fa-solid fa-check-circle"></i> Analiză EV + Kelly Fraction</div>
          <div class="premium-feature"><i class="fa-solid fa-check-circle"></i> Share bilete cu link public</div>
          <div class="premium-feature"><i class="fa-solid fa-check-circle"></i> Statistici nelimitate</div>
        </div>
        ${tier === 'premium' ? `
          <div style="text-align:center;padding:8px 0;">
            <span style="font-family:Syncopate,sans-serif;font-size:9px;color:var(--gold);letter-spacing:1px;">
              ✓ PREMIUM ACTIV
            </span>
          </div>
        ` : `
          <div class="premium-plans">
            <div class="premium-plan" data-plan="monthly" onclick="premiumActivate('monthly')">
              <div class="premium-plan-name">LUNAR</div>
              <div class="premium-plan-price">4.99</div>
              <div class="premium-plan-period">RON / lună</div>
            </div>
            <div class="premium-plan recommended" data-plan="yearly" onclick="premiumActivate('yearly')">
              <div class="premium-plan-name">ANUAL</div>
              <div class="premium-plan-price">39.99</div>
              <div class="premium-plan-period">RON / an</div>
              <div class="premium-plan-badge">-33% SAVE</div>
            </div>
          </div>
        `}
      </div>
    </div>
  `;
}
window.premiumBuildPlansSection = premiumBuildPlansSection;

/* ─── INIT ─── */
function premiumInit() {
  // Hook pe builderi (poate nu sunt inca disponibili)
  let attempts = 0;
  const iv = setInterval(() => {
    attempts++;
    premiumHookBuilders();
    if ((window.buildLabUI && window.buildLabUI._premiumHooked) &&
        (window.buildMatchUI && window.buildMatchUI._premiumHooked)) {
      clearInterval(iv);
    }
    if (attempts > 30) clearInterval(iv);
  }, 300);

  // Apply locks after initial build
  setTimeout(premiumApplyLocks, 1200);
}

if (document.readyState === 'loading')
  document.addEventListener('DOMContentLoaded', premiumInit);
else
  premiumInit();

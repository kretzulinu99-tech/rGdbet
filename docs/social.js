/* ═══════════════════════════════════════════════════════════════
   social.js — Modulul Social Betting Network
   Versiune: v3.0
   Conține:
     • authModule   — Auth local cu T&C, Google stub
     • profileModule— Pagina Profil completă
     • socialModule — Feed social + Follow system
     • shareModule  — Share modal avansat
     • gamblingTest — Test responsabilitate
═══════════════════════════════════════════════════════════════ */
'use strict';

/* ═══════════════════════════════════════════════════════════════
   STORAGE KEYS
═══════════════════════════════════════════════════════════════ */
const SK = {
  user:    'rgb_user',        // utilizatorul curent {username,email,avatar,privacy,...}
  users:   'rgb_users_db',   // toți utilizatorii înregistrați
  posts:   'rgb_social_feed',// postări în feed
  follows: 'rgb_follows',    // {username: [followedUsername,...]}
  gamb:    'rgb_gamb_test',  // rezultat test gambling
};

/* ═══════════════════════════════════════════════════════════════
   HELPER: hash simplu pentru parolă (local-first)
═══════════════════════════════════════════════════════════════ */
function hashStr(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h) ^ s.charCodeAt(i);
  return (h >>> 0).toString(16);
}

function getUsers()       { try { return JSON.parse(localStorage.getItem(SK.users) || '{}'); } catch { return {}; } }
window.getUsers = getUsers;
function saveUsers(u)     { localStorage.setItem(SK.users, JSON.stringify(u)); }
window.saveUsers = saveUsers;
function getCurrentUser() { try { return JSON.parse(localStorage.getItem(SK.user) || 'null'); } catch { return null; } }
window.getCurrentUser = getCurrentUser;
function saveCurrentUser(u){ localStorage.setItem(SK.user, JSON.stringify(u)); }
window.saveCurrentUser = saveCurrentUser;
function getPosts()       { try { return JSON.parse(localStorage.getItem(SK.posts) || '[]'); } catch { return []; } }
window.getPosts = getPosts;
function savePosts(p)     { localStorage.setItem(SK.posts, JSON.stringify(p)); }
window.savePosts = savePosts;
function getFollows()     { try { return JSON.parse(localStorage.getItem(SK.follows) || '{}'); } catch { return {}; } }
window.getFollows = getFollows;
function saveFollows(f)   { localStorage.setItem(SK.follows, JSON.stringify(f)); }
window.saveFollows = saveFollows;

/* ═══════════════════════════════════════════════════════════════
   MODUL AUTH
═══════════════════════════════════════════════════════════════ */

/* -- Activare/dezactivare butoane în funcție de T&C checkbox -- */
window.authUpdateBtn = function(tab) {
  const id  = tab === 'login' ? 'login-tc' : 'reg-tc';
  const btn = tab === 'login' ? 'btn-login' : 'btn-register';
  const checked = document.getElementById(id)?.checked;
  const btnEl   = document.getElementById(btn);
  if (btnEl) btnEl.disabled = !checked;
};

/* -- Puterea parolei -- */
window.authPwStrength = function(pw) {
  const fill = document.getElementById('pw-strength-fill');
  if (!fill) return;
  let score = 0;
  if (pw.length >= 6)  score++;
  if (pw.length >= 10) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const pct   = (score / 5) * 100;
  const color = score <= 1 ? '#ff3366' : score <= 3 ? '#ffcc00' : '#00ff88';
  fill.style.width = pct + '%';
  fill.style.background = color;
};

/* -- Switch tabs -- */
window.authSwitchTab = function(tab) {
  document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.auth-panel').forEach(p => p.classList.remove('active'));
  document.getElementById('tab-' + tab)?.classList.add('active');
  document.getElementById('panel-' + tab)?.classList.add('active');
  authShowError('');
};

function authShowError(msg) {
  const el = document.getElementById('auth-error');
  if (!el) return;
  el.textContent = msg;
  el.className   = 'auth-error' + (msg ? ' show' : '');
}

/* -- Login -- */
window.authLogin = function() {
  const raw  = (document.getElementById('login-user')?.value || '').trim().toLowerCase();
  const pass = (document.getElementById('login-pass')?.value || '');
  const tc   = document.getElementById('login-tc')?.checked;

  if (!tc)   return authShowError('Trebuie să accepți Termenii și Condițiile.');
  if (!raw)  return authShowError('Introdu username-ul sau email-ul.');
  if (!pass) return authShowError('Introdu parola.');

  const users = getUsers();
  const user  = users[raw] || Object.values(users).find(u => u.email?.toLowerCase() === raw);

  if (!user)                             return authShowError('Utilizatorul nu există.');
  if (user.passwordHash !== hashStr(pass)) return authShowError('Parolă incorectă.');

  authOnSuccess(user);
};

/* -- Register -- */
window.authRegister = function() {
  const username = (document.getElementById('reg-username')?.value || '').trim();
  const email    = (document.getElementById('reg-email')?.value    || '').trim().toLowerCase();
  const pass     = (document.getElementById('reg-pass')?.value     || '');
  const tc       = document.getElementById('reg-tc')?.checked;

  if (!tc)                        return authShowError('Trebuie să accepți Termenii și Condițiile.');
  if (username.length < 3)        return authShowError('Username-ul trebuie să aibă minim 3 caractere.');
  if (!/^[a-zA-Z0-9_.-]+$/.test(username)) return authShowError('Username invalid. Folosește doar litere, cifre, _ . -');
  if (!email.includes('@'))       return authShowError('Email invalid.');
  if (pass.length < 6)            return authShowError('Parola trebuie să aibă minim 6 caractere.');

  const users = getUsers();
  const key   = username.toLowerCase();

  /* Verificăm unicitatea numelui (Username / Nickname) */
  if (users[key] || Object.values(users).some(u => (u.displayName||'').toLowerCase() === key)) {
    return authShowError('Acest nume este deja folosit de altcineva.');
  }

  if (Object.values(users).some(u => u.email === email)) return authShowError('Email-ul este deja înregistrat.');

  const newUser = {
    username,
    displayName:  username, // Nickname inițial identic cu username
    email,
    passwordHash: hashStr(pass),
    avatar:       'default',
    privacy:      'public',   // public | private | followers
    joinedAt:     new Date().toISOString(),
    theme:        'neon',
  };
  users[key] = newUser;
  saveUsers(users);
  authOnSuccess(newUser);
};

/* -- Google Login (stub — necesită Firebase în producție) -- */
window.authGoogleLogin = function() {
  authShowError('Conectare Google necesită configurare Firebase. Folosește login clasic.');
};

/* -- Continuare fără cont -- */
window.authSkip = function() {
  authHideScreen();
};

/* -- Callback după login cu succes -- */
function authOnSuccess(user) {
  saveCurrentUser(user);
  authHideScreen();
  authUpdateTopBar(user);
  // Rebuild profil dacă e deschis
  /* Daca panoul de profil e deschis, il rebuilduim */
  const profilePanel = document.getElementById('profile-panel');
  if (profilePanel && profilePanel.classList.contains('open')) buildProfilePage(true);
}

function authHideScreen() {
  const screen = document.getElementById('auth-screen');
  if (!screen) return;
  screen.classList.add('hiding');
  setTimeout(() => { screen.style.display = 'none'; screen.classList.remove('hiding'); }, 400);
}

function authShowScreen() {
  const screen = document.getElementById('auth-screen');
  if (!screen) return;
  screen.style.display = 'flex';
}

function authUpdateTopBar(user) {
  const btn       = document.getElementById('topUserBtn');
  const av        = document.getElementById('topAvatar');
  const uname     = document.getElementById('topUsername');
  const notifBtn  = document.getElementById('topNotifBtn');

  if (!btn) return;
  if (user) {
    btn.style.display = 'flex';
    if (notifBtn) notifBtn.style.display = 'flex';

    if (av) {
      if (user.avatar && (user.avatar.startsWith('data:') || user.avatar.startsWith('http'))) {
        av.innerHTML = `<img src="${user.avatar}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" />`;
      } else if (user.avatar && user.avatar !== 'default' && user.avatar !== '👤') {
        av.textContent = user.avatar;
      } else {
        av.textContent = user.username.charAt(0).toUpperCase();
      }
    }

    if (uname) uname.textContent = user.username.toUpperCase().substring(0, 12);
    // Navicon profil (nu mai exista, dar pastram pentru siguranta)
    const icon = document.getElementById('navProfileIcon');
    if (icon) icon.className = 'fa-solid fa-circle-user';
  } else {
    btn.style.display = 'none';
    if (notifBtn) notifBtn.style.display = 'none';
    if (d4Btn)    d4Btn.style.display    = 'none';
  }
}

/* -- Logout -- */
window.authLogout = function() {
  // Clearing all potential session keys
  localStorage.removeItem(SK.user); // rgb_user
  localStorage.removeItem('rgd_session');
  localStorage.removeItem('rgb_session');
  localStorage.removeItem('rgb_user');

  if (window.Android && typeof window.Android.logout === 'function') {
    window.Android.logout();
    return;
  }

  authUpdateTopBar(null);
  authShowScreen();
  // Reset profil page
  const pp = document.getElementById('page-profile');
  if (pp) { pp.innerHTML = ''; pp._built = false; }
  navigateTo('home', document.querySelector('.nav-btn[data-page="home"]'));
};

/* ═══════════════════════════════════════════════════════════════
   MODUL PROFIL
═══════════════════════════════════════════════════════════════ */
const AVATARS = ['👤','⚽','🏆','👑','🔥','💎','🦁','🐉','🌟','🎯','💥','🏅'];

window.buildProfilePage = function(force = false) {
  const page = document.getElementById('page-profile');
  if (!page) return;
  if (page._built && !force) return;
  page._built = true;

  const user = getCurrentUser();

  if (!user) {
    /* Utilizator nelogat — afișează prompt de login */
    page.innerHTML = `
      <div class="prof-login-prompt">
        <div class="prof-login-icon">👤</div>
        <div class="prof-login-title">PROFIL PERSONAL</div>
        <div class="prof-login-sub">Creează un cont sau loghează-te pentru a-ți accesa profilul și statisticile.</div>
        <button class="prof-action-btn" onclick="authShowScreen()">
          <i class="fa-solid fa-right-to-bracket"></i> INTRĂ / ÎNREGISTRARE
        </button>
      </div>`;
    return;
  }

  /* Calculăm statisticile din biletele reale */
  const stats = calcUserStats();

  // Helper pentru afișare avatar (Emoji sau Imagine)
  const renderAvatarContent = (av) => {
    if (!av || av === 'default' || av === '👤') return '👤';
    if (av.startsWith('data:') || av.startsWith('http')) {
      return `<img src="${av}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" />`;
    }
    return av;
  };

  const avatarDisplay = renderAvatarContent(user.avatar);
  const joinDate = new Date(user.joinedAt || Date.now()).toLocaleDateString('ro-RO', { year:'numeric', month:'long' });

  page.innerHTML = `
    <div class="side-panel-close-btn">
      <button onclick="navigateTo('home', null)"><i class="fa-solid fa-xmark"></i></button>
      <span>PROFIL</span>
    </div>
    <div class="page-top-title" style="display:none;">
      <i class="fa-solid fa-circle-user" style="color:var(--nb)"></i>
      <span>PROFIL</span>
    </div>

    <!-- ══ HERO AVATAR ══ -->
    <div class="prof-hero">
      <div class="prof-avatar-wrap" onclick="profOpenAvatarPicker()" title="Schimbă Avatar">
        <div class="prof-avatar" id="profAvatarDisplay">${avatarDisplay}</div>
        <div class="prof-avatar-edit"><i class="fa-solid fa-camera"></i></div>
      </div>
      <div class="prof-username" id="profDisplayNameDisplay">
        ${user.displayName || user.username}
        ${typeof getVerificationBadge === 'function' ? getVerificationBadge(user.username) : ''}
      </div>
      ${typeof calculateLevel === 'function' ? `<div class="xp-badge"><i class="fa-solid fa-star"></i> ${calculateLevel(user.xp || 0).name}</div>` : ''}
      <div style="font-family:Rajdhani,sans-serif;font-size:13px;color:var(--nb);margin-top:2px;">@${user.username}</div>
      <div class="prof-email">${user.email || 'fără email'}</div>

      <div class="prof-joined">Membru din ${joinDate}</div>
      <div class="prof-privacy-badge privacy-${user.privacy || 'public'}">
        ${privacyIcon(user.privacy)} ${privacyLabel(user.privacy)}
      </div>
    </div>

    <!-- ══ STATISTICI LIVE ══ -->
    <div class="prof-stats-grid">
      <div class="prof-stat-card">
        <div class="prof-stat-val ${stats.profit >= 0 ? 'pos' : 'neg'}" id="profStatProfit">
          ${stats.profit >= 0 ? '+' : ''}${stats.profit.toFixed(2)}
        </div>
        <div class="prof-stat-lbl">Profit Net (RON)</div>
      </div>
      <div class="prof-stat-card">
        <div class="prof-wr-wrap">
          <svg class="prof-wr-svg" viewBox="0 0 44 44">
            <defs>
              <linearGradient id="wrGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stop-color="var(--ng)"/>
                <stop offset="100%" stop-color="var(--nb)"/>
              </linearGradient>
            </defs>
            <circle cx="22" cy="22" r="18" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="5"/>
            <circle cx="22" cy="22" r="18" fill="none" stroke="url(#wrGrad)" stroke-width="5"
              stroke-linecap="round" stroke-dasharray="113"
              stroke-dashoffset="${113 - (stats.wr / 100) * 113}"
              transform="rotate(-90 22 22)"
              style="transition:stroke-dashoffset 1.2s cubic-bezier(.4,0,.2,1);filter:drop-shadow(0 0 6px var(--ng))"/>
            <text x="22" y="26" text-anchor="middle" fill="white"
              font-family="Syncopate,sans-serif" font-size="9" font-weight="700">${stats.wr}%</text>
          </svg>
        </div>
        <div class="prof-stat-lbl">Win Rate</div>
      </div>
      <div class="prof-stat-card">
        <div class="prof-stat-val" id="profStatTickets">${stats.total}</div>
        <div class="prof-stat-lbl">Bilete Plasate</div>
      </div>
    </div>

    <!-- ══ SECȚIUNE: PREFERINȚE ══ -->
    <div class="prof-section">
      <div class="prof-section-title">PREFERINȚE</div>

      <div class="prof-row" onclick="profOpenEdit('currency')">
        <div class="prof-row-left">
          <div class="prof-row-icon gold"><i class="fa-solid fa-coins"></i></div>
          <div class="prof-row-text">
            <span class="prof-row-label">Monedă Afișată</span>
            <span class="prof-row-sub">${getCurrency()}</span>
          </div>
        </div>
        <div class="prof-row-arrow"><i class="fa-solid fa-chevron-right"></i></div>
      </div>

      <div class="prof-row" onclick="profOpenEdit('displayName')">
        <div class="prof-row-left">
          <div class="prof-row-icon blue"><i class="fa-solid fa-id-card"></i></div>
          <div class="prof-row-text">
            <span class="prof-row-label">Nickname (Nume afișat)</span>
            <span class="prof-row-sub">${user.displayName || user.username}</span>
          </div>
        </div>
        <i class="fa-solid fa-pen prof-row-arrow" style="font-size:10px;"></i>
      </div>

      <div class="prof-row" onclick="profOpenEdit('email')">
        <div class="prof-row-left">
          <div class="prof-row-icon blue"><i class="fa-solid fa-envelope"></i></div>
          <div class="prof-row-text">
            <span class="prof-row-label">Schimbă Email</span>
            <span class="prof-row-sub">${user.email || 'nesetat'}</span>
          </div>
        </div>
        <i class="fa-solid fa-chevron-right prof-row-arrow"></i>
      </div>

      <div class="prof-row" onclick="profOpenEdit('password')">
        <div class="prof-row-left">
          <div class="prof-row-icon purple"><i class="fa-solid fa-lock"></i></div>
          <div class="prof-row-text">
            <span class="prof-row-label">Schimbă Parola</span>
            <span class="prof-row-sub">••••••••</span>
          </div>
        </div>
        <i class="fa-solid fa-chevron-right prof-row-arrow"></i>
      </div>
    </div>

    <!-- ══ SECȚIUNE: PERSONALIZARE ══ -->
    <div class="prof-section">
      <div class="prof-section-title">PERSONALIZARE</div>

      <div class="prof-row" onclick="profOpenAvatarPicker()">
        <div class="prof-row-left">
          <div class="prof-row-icon gold"><i class="fa-solid fa-face-smile"></i></div>
          <div class="prof-row-text">
            <span class="prof-row-label">Avatar</span>
            <span class="prof-row-sub">Alege un avatar</span>
          </div>
        </div>
        <span style="font-size:22px;">${avatarDisplay}</span>
      </div>

      <!-- Selector teme integrat -->
      <div class="prof-theme-row">
        <div class="prof-row-left" style="pointer-events:none;">
          <div class="prof-row-icon blue"><i class="fa-solid fa-palette"></i></div>
          <div class="prof-row-text">
            <span class="prof-row-label">Temă Vizuală</span>
          </div>
        </div>
        <div class="prof-theme-chips" id="profThemeChips"></div>
      </div>
    </div>

    <!-- ══ SECȚIUNE: CONFIDENȚIALITATE ══ -->
    <div class="prof-section">
      <div class="prof-section-title">CONFIDENȚIALITATE PROFIL</div>
      <div class="prof-privacy-selector">
        ${['public','followers','private'].map(p => `
          <button class="prof-privacy-btn ${(user.privacy||'public')===p?'active':''}"
                  data-privacy="${p}" onclick="profSetPrivacy('${p}')">
            ${privacyIcon(p)} <span>${privacyLabel(p)}</span>
          </button>`).join('')}
      </div>
      <div class="prof-privacy-desc" id="profPrivacyDesc">${privacyDesc(user.privacy)}</div>
    </div>

    <!-- ══ SECȚIUNE: JOC RESPONSABIL ══ -->
    <div class="prof-section">
      <div class="prof-section-title">JOC RESPONSABIL</div>
      <div class="prof-row" onclick="openGamblingTest()">
        <div class="prof-row-left">
          <div class="prof-row-icon red"><i class="fa-solid fa-brain"></i></div>
          <div class="prof-row-text">
            <span class="prof-row-label">Test Dependență Jocuri de Noroc</span>
            <span class="prof-row-sub">Evaluare în 5 întrebări • ${gambTestDoneLabel()}</span>
          </div>
        </div>
        <i class="fa-solid fa-chevron-right prof-row-arrow"></i>
      </div>
      <div class="prof-row" onclick="window.open('https://jocresponsabil.ro','_blank')">
        <div class="prof-row-left">
          <div class="prof-row-icon green"><i class="fa-solid fa-heart-pulse"></i></div>
          <div class="prof-row-text">
            <span class="prof-row-label">jocresponsabil.ro</span>
            <span class="prof-row-sub">Resurse de ajutor și suport</span>
          </div>
        </div>
        <i class="fa-solid fa-arrow-up-right-from-square prof-row-arrow"></i>
      </div>
    </div>

    <!-- ══ SECȚIUNE: DATE ══ -->
    <div class="prof-section">
      <div class="prof-section-title">DATE</div>
      <div class="prof-row" onclick="exportAccountData()">
        <div class="prof-row-left">
          <div class="prof-row-icon green"><i class="fa-solid fa-file-export"></i></div>
          <div class="prof-row-text">
            <span class="prof-row-label">Exportă Datele</span>
            <span class="prof-row-sub">Salvează biletele și portofoliile într-un fișier</span>
          </div>
        </div>
        <i class="fa-solid fa-chevron-right prof-row-arrow"></i>
      </div>
      <div class="prof-row" onclick="document.getElementById('import-data-input').click()">
        <div class="prof-row-left">
          <div class="prof-row-icon blue"><i class="fa-solid fa-file-import"></i></div>
          <div class="prof-row-text">
            <span class="prof-row-label">Importă Datele</span>
            <span class="prof-row-sub">Restaurează dintr-un fișier exportat anterior</span>
          </div>
        </div>
        <i class="fa-solid fa-chevron-right prof-row-arrow"></i>
      </div>
      <input type="file" id="import-data-input" accept="application/json" style="display:none;" onchange="importAccountData(event)"/>
    </div>

    <!-- ══ SECȚIUNE: TERMENI ══ -->
    <div class="prof-section">
      <div class="prof-section-title">JURIDIC</div>
      <div class="prof-row" onclick="showAbout()">
        <div class="prof-row-left">
          <div class="prof-row-icon gold"><i class="fa-solid fa-circle-info"></i></div>
          <div class="prof-row-text"><span class="prof-row-label">Despre rGdbet</span></div>
        </div>
        <i class="fa-solid fa-chevron-right prof-row-arrow"></i>
      </div>
      <div class="prof-row" onclick="showTerms()">
        <div class="prof-row-left">
          <div class="prof-row-icon blue"><i class="fa-solid fa-file-contract"></i></div>
          <div class="prof-row-text"><span class="prof-row-label">Termeni și Condiții</span></div>
        </div>
        <i class="fa-solid fa-chevron-right prof-row-arrow"></i>
      </div>
      <div class="prof-row" onclick="showPrivacy()">
        <div class="prof-row-left">
          <div class="prof-row-icon purple"><i class="fa-solid fa-shield-halved"></i></div>
          <div class="prof-row-text"><span class="prof-row-label">Politica de Confidențialitate</span></div>
        </div>
        <i class="fa-solid fa-chevron-right prof-row-arrow"></i>
      </div>
    </div>

    <!-- ══ LOGOUT ══ -->
    <button class="prof-logout-btn" onclick="authLogout()">
      <i class="fa-solid fa-right-from-bracket"></i> DECONECTARE
    </button>

    <!-- ══ EDIT MODAL ══ -->
    <div class="prof-edit-modal" id="profEditModal">
      <div class="prof-edit-box">
        <div class="prof-edit-title" id="profEditTitle">EDITARE</div>
        <div class="auth-error" id="prof-edit-error"></div>
        <div id="profEditBody"></div>
        <div class="prof-edit-actions">
          <button class="prof-edit-cancel" onclick="profCloseEdit()">ANULEAZĂ</button>
          <button class="prof-edit-save"   onclick="profSaveEdit()">SALVEAZĂ</button>
        </div>
      </div>
    </div>

    <div class="prof-avatar-modal" id="profAvatarModal">
      <div class="prof-avatar-box">
        <div class="prof-edit-title">ALEGE AVATAR</div>

        <button class="prof-action-btn" style="width:100%; margin-bottom: 16px; font-size: 11px;" onclick="document.getElementById('profAvatarInput').click()">
          <i class="fa-solid fa-upload"></i> ÎNCARCĂ DIN TELEFON
        </button>
        <input type="file" id="profAvatarInput" accept="image/*" style="display:none" onchange="profHandleFileUpload(event)"/>

        <div class="prof-avatar-grid">
          ${AVATARS.map(a => `
            <button class="prof-av-option ${a === avatarDisplay ? 'selected' : ''}"
                    onclick="profSelectAvatar('${a}')">${a}</button>`).join('')}
        </div>
        <button class="prof-edit-cancel" style="width:100%;margin-top:12px" onclick="profCloseAvatarPicker()">ÎNCHIDE</button>
      </div>
    </div>
  `;

  /* Injectăm chipurile de temă */
  profBuildThemeChips();
};

/* -- Statistici utilizator din biletele locale -- */
function calcUserStats() {
  let bets = [];
  try { bets = JSON.parse(localStorage.getItem('rgb_bets') || '[]'); } catch {}
  const settled = bets.filter(b => b.status === 'win' || b.status === 'loss' || b.status === 'cashout');
  let wins = 0, profit = 0;
  settled.forEach(b => {
    const stake = parseFloat(b.stake || 0);
    const odds  = parseFloat(b.totalOdds || b.odds || 1);
    if (b.status === 'win')  { wins++; profit += stake * (odds - 1); }
    if (b.status === 'loss') { profit -= stake; }
  });
  return {
    total:  bets.length,
    settled: settled.length,
    wins,
    wr:     settled.length ? Math.round((wins / settled.length) * 100) : 0,
    profit: parseFloat(profit.toFixed(2)),
  };
}

/* -- Privacy helpers -- */
function privacyIcon(p)  { return p === 'public' ? '🌐' : p === 'followers' ? '👥' : '🔒'; }
function privacyLabel(p) { return p === 'public' ? 'Public' : p === 'followers' ? 'Doar Urmăritori' : 'Privat'; }
function privacyDesc(p) {
  if (p === 'public')    return 'Toată lumea îți poate vedea profilul și biletele din feed.';
  if (p === 'followers') return 'Doar persoanele care te urmăresc îți pot vedea biletele.';
  return 'Nimeni nu îți poate vedea statisticile sau postările.';
}

window.profSetPrivacy = function(p) {
  const user = getCurrentUser();
  if (!user) return;
  user.privacy = p;
  saveCurrentUser(user);
  const users = getUsers();
  if (users[user.username.toLowerCase()]) { users[user.username.toLowerCase()].privacy = p; saveUsers(users); }
  // Update UI
  document.querySelectorAll('.prof-privacy-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.privacy === p);
  });
  const desc = document.getElementById('profPrivacyDesc');
  if (desc) desc.textContent = privacyDesc(p);
  const badge = document.querySelector('.prof-privacy-badge');
  if (badge) { badge.className = `prof-privacy-badge privacy-${p}`; badge.innerHTML = `${privacyIcon(p)} ${privacyLabel(p)}`; }
};

/* -- Teme în profil -- */
function profBuildThemeChips() {
  const wrap = document.getElementById('profThemeChips');
  if (!wrap || typeof window.THEMES === 'undefined') return;
  wrap.innerHTML = window.THEMES.map(t => `
    <button class="prof-theme-chip" data-theme="${t.id}"
            style="border-color:${t.vars['--accent1']||t.vars['--nb']||'#00c8ff'}"
            onclick="profApplyTheme('${t.id}')">
      <span>${t.icon}</span>
      <span style="font-size:7px;font-family:Syncopate,sans-serif;">${t.label}</span>
    </button>`).join('');
}

window.profApplyTheme = function(themeId) {
  if (typeof window.THEMES === 'undefined') return;
  const t = window.THEMES.find(x => x.id === themeId);
  if (t && typeof window.applyTheme === 'function') window.applyTheme(t);
  // Salvează în profil
  const user = getCurrentUser();
  if (user) { user.theme = themeId; saveCurrentUser(user); }
};

/* -- Avatar picker -- */
window.profOpenAvatarPicker = function() {
  const m = document.getElementById('profAvatarModal');
  if (m) m.classList.add('open');
};
window.profCloseAvatarPicker = function() {
  const m = document.getElementById('profAvatarModal');
  if (m) m.classList.remove('open');
};
window.profSelectAvatar = function(emoji) {
  const user = getCurrentUser();
  if (!user) return;
  user.avatar = emoji;
  saveCurrentUser(user);
  const users = getUsers();
  if (users[user.username.toLowerCase()]) { users[user.username.toLowerCase()].avatar = emoji; saveUsers(users); }

  // Update UI
  const display = document.getElementById('profAvatarDisplay');
  if (display) {
    if (emoji.startsWith('data:') || emoji.startsWith('http')) {
      display.innerHTML = `<img src="${emoji}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" />`;
    } else {
      display.textContent = emoji;
    }
  }

  authUpdateTopBar(user);
  document.querySelectorAll('.prof-av-option').forEach(b => b.classList.toggle('selected', b.textContent === emoji));
  profCloseAvatarPicker();
};

window.profHandleFileUpload = function(event) {
  const file = event.target.files[0];
  if (!file) return;

  // Verificare mărime (ex: max 2MB pentru Base64 în localStorage)
  if (file.size > 2 * 1024 * 1024) {
    alert('Imaginea este prea mare. Te rugăm să alegi o imagine sub 2MB.');
    return;
  }

  const reader = new FileReader();
  reader.onload = function(e) {
    const base64 = e.target.result;
    profSelectAvatar(base64);
  };
  reader.readAsDataURL(file);
};

/* -- Edit email / parolă -- */
let _currentEditType = null;
window.profOpenEdit = function(type) {
  _currentEditType = type;
  const modal = document.getElementById('profEditModal');
  const title = document.getElementById('profEditTitle');
  const body  = document.getElementById('profEditBody');
  const err   = document.getElementById('prof-edit-error');
  if (!modal) return;
  if (err) { err.textContent = ''; err.className = 'auth-error'; }

  const inputStyle = 'class="auth-input" style="padding-left:14px;"';
  if (type === 'email') {
    if (title) title.textContent = 'SCHIMBĂ EMAIL';
    if (body) body.innerHTML = `
      <div class="auth-field" style="margin-bottom:12px;">
        <label>EMAIL NOU</label>
        <input id="edit-email-new" type="email" ${inputStyle} placeholder="email@nou.com"/>
      </div>`;
  } else if (type === 'displayName') {
    if (title) title.textContent = 'SETEAZĂ NICKNAME';
    if (body) body.innerHTML = `
      <div class="auth-field" style="margin-bottom:12px;">
        <label>NICKNAME NOU (Ex: Popescu Ion)</label>
        <input id="edit-displayname-new" type="text" ${inputStyle} placeholder="Introdu un nume..." maxlength="30"/>
        <p style="font-family:Rajdhani,sans-serif;font-size:11px;color:var(--text2);margin-top:6px;">
          Acest nume va apărea în feed-ul social și la căutări.
        </p>
      </div>`;
  } else if (type === 'currency') {
    const current = getCurrency();
    const isManual = !!localStorage.getItem('rgb_manual_currency');

    if (title) title.textContent = 'MONEDĂ AFIȘATĂ';
    if (body) body.innerHTML = `
      <div class="auth-field" style="margin-bottom:12px;">
        <label>ALEGE MONEDA</label>
        <select id="edit-currency-select" class="auth-input" style="padding-left:14px; background:var(--bg2);">
          <option value="auto" ${!isManual ? 'selected' : ''}>Auto (După limbă)</option>
          <option value="RON" ${isManual && current === 'RON' ? 'selected' : ''}>RON (Leu Românesc)</option>
          <option value="EUR" ${isManual && current === 'EUR' ? 'selected' : ''}>EUR (Euro)</option>
          <option value="USD" ${isManual && current === 'USD' ? 'selected' : ''}>USD (Dolar American)</option>
          <option value="GBP" ${isManual && current === 'GBP' ? 'selected' : ''}>GBP (Liră Sterlină)</option>
          <option value="TRY" ${isManual && current === 'TRY' ? 'selected' : ''}>TRY (Liră Turcească)</option>
          <option value="BGN" ${isManual && current === 'BGN' ? 'selected' : ''}>BGN (Leva Bulgară)</option>
          <option value="CZK" ${isManual && current === 'CZK' ? 'selected' : ''}>CZK (Coroană Cehă)</option>
          <option value="RUB" ${isManual && current === 'RUB' ? 'selected' : ''}>RUB (Rublă)</option>
          <option value="CNY" ${isManual && current === 'CNY' ? 'selected' : ''}>CNY (Yuan Chinezesc)</option>
        </select>
        <p style="font-family:Rajdhani,sans-serif;font-size:11px;color:var(--text2);margin-top:8px;">
          Dacă alegi 'Auto', moneda se va schimba automat când schimbi limba aplicației.
        </p>
      </div>`;
  } else if (type === 'password') {
    if (title) title.textContent = 'SCHIMBĂ PAROLA';
    if (body) body.innerHTML = `
      <div class="auth-field" style="margin-bottom:10px;">
        <label>PAROLA ACTUALĂ</label>
        <input id="edit-pass-old" type="password" ${inputStyle} placeholder="••••••••"/>
      </div>
      <div class="auth-field" style="margin-bottom:10px;">
        <label>PAROLA NOUĂ</label>
        <input id="edit-pass-new" type="password" ${inputStyle} placeholder="min. 6 caractere"/>
      </div>`;
  }
  modal.classList.add('open');
};
window.profCloseEdit = function() {
  const m = document.getElementById('profEditModal');
  if (m) m.classList.remove('open');
};
window.profSaveEdit = function() {
  const user  = getCurrentUser();
  const users = getUsers();
  const key   = user?.username.toLowerCase();
  const err   = document.getElementById('prof-edit-error');
  function showErr(m) { if (err) { err.textContent = m; err.className = 'auth-error show'; } }

  if (_currentEditType === 'email') {
    const ne = (document.getElementById('edit-email-new')?.value || '').trim().toLowerCase();
    if (!ne.includes('@')) return showErr('Email invalid.');
    if (Object.values(users).some(u => u.email === ne && u.username !== user.username))
      return showErr('Email-ul este deja folosit.');
    user.email = ne;
    if (users[key]) users[key].email = ne;
  } else if (_currentEditType === 'displayName') {
    const nd = (document.getElementById('edit-displayname-new')?.value || '').trim();
    if (nd.length < 2) return showErr('Nickname-ul trebuie să aibă minim 2 caractere.');

    /* Verificăm unicitatea Nickname-ului față de ceilalți utilizatori */
    const isTaken = Object.values(users).some(u =>
      (u.username.toLowerCase() !== key) &&
      ((u.displayName || '').toLowerCase() === nd.toLowerCase() || u.username.toLowerCase() === nd.toLowerCase())
    );

    if (isTaken) return showErr('Acest nickname este deja folosit de altcineva.');

    user.displayName = nd;
    if (users[key]) users[key].displayName = nd;
  } else if (_currentEditType === 'password') {
    const old = document.getElementById('edit-pass-old')?.value || '';
    const nw  = document.getElementById('edit-pass-new')?.value || '';
    if (hashStr(old) !== user.passwordHash) return showErr('Parola actuală este incorectă.');
    if (nw.length < 6) return showErr('Parola nouă trebuie să aibă minim 6 caractere.');
    user.passwordHash = hashStr(nw);
    if (users[key]) users[key].passwordHash = hashStr(nw);
  } else if (_currentEditType === 'currency') {
    const nc = document.getElementById('edit-currency-select')?.value || 'auto';
    setManualCurrency(nc);
    // Nu salvăm moneda pe obiectul 'user' de server momentan, doar local
    profCloseEdit();
    return; // setManualCurrency face deja rebuild
  }
  saveCurrentUser(user);
  saveUsers(users);
  profCloseEdit();
  buildProfilePage(true); // rebuild
};

function gambTestDoneLabel() {
  const r = localStorage.getItem(SK.gamb);
  if (!r) return 'Nu a fost efectuat';
  try {
    const d = JSON.parse(r);
    return `Scor: ${d.score}/10 • ${d.date}`;
  } catch { return 'Efectuat'; }
}

/* ═══════════════════════════════════════════════════════════════
   TEST RESPONSABILITATE JOC DE NOROC
═══════════════════════════════════════════════════════════════ */
const GAMB_QUESTIONS = [
  { q: 'Ai pariat mai mult decât îți puteai permite să pierzi?',        opts: ['Niciodată','Câteodată','Des','Foarte des'] },
  { q: 'Ai simțit nevoia de a paria sume tot mai mari pentru aceeași emoție?', opts: ['Niciodată','Câteodată','Des','Foarte des'] },
  { q: 'Ai ascuns pariurile față de familie sau prieteni?',              opts: ['Niciodată','Câteodată','Des','Foarte des'] },
  { q: 'Ai revenit a doua zi să recuperezi banii pierduți?',            opts: ['Niciodată','Câteodată','Des','Foarte des'] },
  { q: 'Pariatul a afectat relațiile tale personale sau munca?',         opts: ['Niciodată','Câteodată','Des','Foarte des'] },
];
let _gambAnswers = [];

window.openGamblingTest = function() {
  _gambAnswers = [];
  const body = document.getElementById('gamb-test-body');
  if (!body) return;
  renderGambQuestion(0, body);
  document.getElementById('gamb-test-modal').style.display = 'flex';
};

function renderGambQuestion(idx, body) {
  if (idx >= GAMB_QUESTIONS.length) {
    // Calculează scor
    const score = _gambAnswers.reduce((s, a) => s + a, 0);
    const max   = (GAMB_QUESTIONS.length - 1) * 3;
    const pct   = Math.round((score / max) * 10);
    let msg, color, reco;
    if (pct <= 3)      { msg = '✅ Risc Scăzut'; color = '#00ff88'; reco = 'Continuă să pariezi responsabil!'; }
    else if (pct <= 6) { msg = '⚠️ Risc Mediu';  color = '#ffcc00'; reco = 'Fii atent la obiceiurile tale de pariere. Stabilește-ți limite clare.'; }
    else               { msg = '🚨 Risc Ridicat'; color = '#ff3366'; reco = 'Recomandăm să iei o pauză și să contactezi jocresponsabil.ro pentru sprijin.'; }

    localStorage.setItem(SK.gamb, JSON.stringify({ score: pct, date: new Date().toLocaleDateString('ro-RO') }));

    body.innerHTML = `
      <div style="text-align:center;padding:16px 8px;">
        <div style="font-size:48px;margin-bottom:10px;">${pct <= 3 ? '😊' : pct <= 6 ? '😟' : '😰'}</div>
        <div style="font-family:Syncopate,sans-serif;font-size:16px;color:${color};margin-bottom:8px;">${msg}</div>
        <div style="font-size:28px;font-family:Syncopate,sans-serif;color:white;font-weight:700;">${pct}/10</div>
        <div style="font-family:Rajdhani,sans-serif;font-size:14px;color:rgba(255,255,255,.6);margin:14px 0;line-height:1.5;">${reco}</div>
        ${pct >= 7 ? `<a href="https://jocresponsabil.ro" target="_blank" class="prof-action-btn" style="display:inline-flex;text-decoration:none;">
          <i class="fa-solid fa-phone"></i> Obține Ajutor
        </a>` : ''}
        <button class="prof-edit-cancel" style="width:100%;margin-top:12px;" onclick="closeModal('gamb-test-modal');buildProfilePage(true)">ÎNCHIDE</button>
      </div>`;
    return;
  }

  const q = GAMB_QUESTIONS[idx];
  body.innerHTML = `
    <div class="gamb-q-wrap">
      <div class="gamb-progress">
        <div class="gamb-prog-bar" style="width:${(idx/GAMB_QUESTIONS.length)*100}%"></div>
      </div>
      <div class="gamb-q-num">${idx + 1} / ${GAMB_QUESTIONS.length}</div>
      <div class="gamb-q-text">${q.q}</div>
      <div class="gamb-options">
        ${q.opts.map((opt, i) => `
          <button class="gamb-opt" onclick="gambAnswer(${idx},${i})">
            ${opt}
          </button>`).join('')}
      </div>
    </div>`;
}

window.gambAnswer = function(qIdx, aIdx) {
  _gambAnswers[qIdx] = aIdx; // 0-3
  const body = document.getElementById('gamb-test-body');
  if (body) renderGambQuestion(qIdx + 1, body);
};

/* ═══════════════════════════════════════════════════════════════
   MODUL SOCIAL — Feed & Follow System
═══════════════════════════════════════════════════════════════ */

window.buildSocialPage = function() {
  const page = document.getElementById('page-social');
  if (!page) return;
  const user = getCurrentUser();

  page.innerHTML = `
    <div class="page-top-title">
      <i class="fa-solid fa-users" style="color:var(--ng)"></i>
      <span>SOCIAL FEED</span>
    </div>

    <!-- Bară acțiuni -->
    <div class="soc-action-bar">
      <button class="soc-tab active" id="soc-tab-feed"   onclick="socSwitchTab('feed')">
        <i class="fa-solid fa-fire"></i> FEED
      </button>
      <button class="soc-tab" id="soc-tab-rank"   onclick="socSwitchTab('rank')">
        <i class="fa-solid fa-trophy"></i> RANK
      </button>
      <button class="soc-tab" id="soc-tab-search" onclick="socSwitchTab('search')">
        <i class="fa-solid fa-magnifying-glass"></i> CAUTĂ
      </button>
      <button class="soc-tab" id="soc-tab-my"     onclick="socSwitchTab('my')">
        <i class="fa-solid fa-user"></i> POSTĂRILE MELE
      </button>
    </div>

    <!-- Panel Feed -->
    <div id="soc-panel-feed" class="soc-panel active">
      <div id="soc-feed-list"></div>
    </div>

    <!-- Panel Clasament (NEW ELITE FEATURE) -->
    <div id="soc-panel-rank" class="soc-panel">
      <div id="soc-rank-list"></div>
    </div>

    <!-- Panel Căutare / Follow -->
    <div id="soc-panel-search" class="soc-panel">
      <div class="soc-search-wrap">
        <div class="auth-input-wrap" style="margin-bottom:10px;">
          <i class="fa-solid fa-magnifying-glass auth-field-icon"></i>
          <input class="auth-input" id="soc-search-inp" type="text" placeholder="Caută după username..." oninput="socSearch(this.value)" style="padding-left:38px;"/>
        </div>
      </div>
      <div id="soc-search-results"></div>
    </div>

    <!-- Panel Postările mele -->
    <div id="soc-panel-my" class="soc-panel">
      <div id="soc-my-list"></div>
    </div>

    <!-- Buton postează bilet -->
    ${user ? `<div style="padding:0 16px 12px;">
      <button class="soc-post-btn" onclick="socOpenPostPicker()">
        <i class="fa-solid fa-share-from-square"></i> POSTEAZĂ UN BILET ÎN COMUNITATE
      </button>
    </div>` : `<div class="soc-login-prompt">
      <div style="font-size:32px;margin-bottom:8px;">👥</div>
      <div style="font-family:Syncopate,sans-serif;font-size:11px;color:rgba(255,255,255,.6);margin-bottom:12px;">LOGHEAZĂ-TE PENTRU A INTERACȚIONA</div>
      <button class="prof-action-btn" onclick="authShowScreen()">INTRĂ ÎN CONT</button>
    </div>`}

    <!-- Post Picker Modal -->
    <div class="soc-pick-modal" id="socPickModal">
      <div class="soc-pick-box">
        <div class="prof-edit-title">ALEGE BILETUL DE POSTAT</div>
        <div id="socPickList"></div>
        <button class="prof-edit-cancel" style="width:100%;margin-top:10px" onclick="socClosePostPicker()">ANULEAZĂ</button>
      </div>
    </div>
  `;

  socRenderFeed();
};

function socSwitchTab(tab) {
  document.querySelectorAll('.soc-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.soc-panel').forEach(p => p.classList.remove('active'));
  document.getElementById('soc-tab-' + tab)?.classList.add('active');
  document.getElementById('panel-' + tab)?.classList.add('active'); // legacy support
  document.getElementById('soc-panel-' + tab)?.classList.add('active');
  if (tab === 'feed')   socRenderFeed();
  if (tab === 'my')     socRenderMyPosts();
  if (tab === 'rank')   socRenderLeaderboard();
}

/* ── Render Leaderboard ── */
function socRenderLeaderboard() {
  const list = document.getElementById('soc-rank-list');
  if (!list) return;

  const users = getUsers();
  const allPosts = getPosts();

  // Calculăm statisticile pentru fiecare utilizator care a postat minim 3 bilete
  const rankings = Object.values(users).map(u => {
    const userPosts = allPosts.filter(p => p.author?.toLowerCase() === u.username.toLowerCase());
    const settled = userPosts.filter(p => p.status === 'win' || p.status === 'loss');
    const wins = settled.filter(p => p.status === 'win').length;
    const wr = settled.length >= 3 ? Math.round((wins / settled.length) * 100) : 0;

    const profit = userPosts.reduce((acc, p) => {
      const stake = parseFloat(p.stake || 0);
      const odds = parseFloat(p.odds || 1);
      if (p.status === 'win') return acc + (stake * (odds - 1));
      if (p.status === 'loss') return acc - stake;
      return acc;
    }, 0);

    return {
      username: u.username,
      avatar: u.avatar,
      total: settled.length,
      wins: wins,
      wr: wr,
      profit: profit,
      score: (wr * 0.6) + (profit * 0.2) + (settled.length * 0.2) // Elite Algorithm
    };
  }).filter(r => r.total >= 3)
    .sort((a, b) => b.score - a.score);

  if (!rankings.length) {
    list.innerHTML = `<div class="soc-empty"><div style="font-family:Rajdhani,sans-serif;color:rgba(255,255,255,.4);">Clasamentul se va genera după ce utilizatorii postează minim 3 bilete.</div></div>`;
    return;
  }

  const currency = typeof getCurrency === 'function' ? getCurrency() : 'RON';

  list.innerHTML = `
    <div style="padding: 10px 16px; font-family: 'Syncopate', sans-serif; font-size: 8px; color: var(--nb); letter-spacing: 2px; text-align: center; margin-bottom: 10px;">
      ELITE GLOBAL RANKINGS (WINRATE + PROFIT)
    </div>
    ${rankings.map((r, index) => {
      const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '';
      const profitClass = r.profit >= 0 ? 'pos' : 'neg';

      return `
      <div class="soc-user-card" onclick="viewUserProfile('${r.username}')" style="border-left: 3px solid ${index === 0 ? 'var(--gold)' : index === 1 ? '#C0C0C0' : index === 2 ? '#CD7F32' : 'transparent'};">
        <div style="font-family: 'Syncopate', sans-serif; font-size: 14px; font-weight: 700; width: 28px; color: ${index < 3 ? 'var(--gold)' : 'var(--text3)'}; text-align: center;">
          ${medal || (index + 1)}
        </div>
        <div class="soc-post-avatar">${renderAvatarContent(r.avatar)}</div>
        <div style="flex:1;">
          <div class="soc-post-author" style="font-size:15px; color:#fff;">
            @${r.username}
            ${typeof getVerificationBadge === 'function' ? getVerificationBadge(r.username) : ''}
          </div>
          <div class="soc-post-date">${r.total} bilete • <span style="${profitClass === 'pos' ? 'color:var(--ng)' : 'color:var(--danger)'}; font-weight:700;">${r.profit.toFixed(0)} ${currency}</span></div>
        </div>
        <div style="text-align: right;">
           <div style="font-family:Syncopate; font-size:11px; color:var(--nb); font-weight:900;">${r.wr}%</div>
           <div style="font-family:Rajdhani; font-size:9px; color:var(--text3); opacity:0.6;">WIN RATE</div>
        </div>
      </div>
    `}).join('')}
  `;
}

// Helper local pentru leaderboard daca cel global nu e disponibil
function renderAvatarContent(av) {
  if (!av || av === 'default' || av === '👤') return '👤';
  if (av.startsWith('data:') || av.startsWith('http')) {
    return `<img src="${av}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" />`;
  }
  return av;
}

/* ── Render feed ── */
function socRenderFeed() {
  const list = document.getElementById('soc-feed-list');
  if (!list) return;
  const user    = getCurrentUser();
  const follows = getFollows();
  const myFollows = user ? (follows[user.username.toLowerCase()] || []) : [];
  let posts = getPosts().sort((a, b) => b.postedAt - a.postedAt);

  // Filtrare după privacy
  posts = posts.filter(p => {
    if (!p.author) return true;
    const authorKey  = p.author.toLowerCase();
    const users      = getUsers();
    const authorUser = users[authorKey];
    if (!authorUser) return true; // utilizator șters — arătăm oricum
    const priv = authorUser.privacy || 'public';
    if (priv === 'private')   return false;
    if (priv === 'followers') return myFollows.includes(authorKey);
    return true; // public
  });

  if (!posts.length) {
    list.innerHTML = `<div class="soc-empty">
      <div style="font-size:40px;margin-bottom:10px;">📭</div>
      <div style="font-family:Syncopate,sans-serif;font-size:10px;color:rgba(255,255,255,.4);">
        FEED-UL ESTE GOL<br>
        <span style="font-size:8px;font-family:Rajdhani,sans-serif;">Fii primul care postează un bilet!</span>
      </div>
    </div>`;
    return;
  }
  list.innerHTML = posts.map(p => socRenderPost(p, user, myFollows)).join('');
}

function socRenderPost(p, currentUser, myFollows) {
  const statusColor = p.status === 'win' ? '#00ff88' : p.status === 'loss' ? '#ff3366' : '#ffcc00';
  const statusLabel = p.status === 'win' ? '✅ WIN' : p.status === 'loss' ? '❌ LOSS' : '⏳ PENDING';
  const users  = getUsers();
  const author = users[p.author?.toLowerCase()];
  const displayName = author?.displayName || p.author || 'anonim';

  // Helper pentru afișare avatar (Emoji sau Imagine)
  const renderAvatarContent = (av) => {
    if (!av || av === 'default' || av === '👤') return '👤';
    if (av.startsWith('data:') || av.startsWith('http')) {
      return `<img src="${av}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" />`;
    }
    return av;
  };

  const avDisplay = renderAvatarContent(author?.avatar);
  const isOwn  = currentUser && currentUser.username.toLowerCase() === p.author?.toLowerCase();
  const authorFollowed = myFollows?.includes(p.author?.toLowerCase());
  const amIFriend = typeof window.isFriend === 'function' ? window.isFriend(p.author) : false;
  const dateStr = new Date(p.postedAt).toLocaleDateString('ro-RO', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' });

  return `
    <div class="soc-post-card" onclick="if(typeof viewUserProfile==='function') viewUserProfile('${p.author}')">
      <div class="soc-post-header">
        <div class="soc-post-avatar" data-user="${p.author}">${avDisplay}</div>
        <div class="soc-post-meta">
          <div class="soc-post-author" onclick="event.stopPropagation(); viewUserProfile('${p.author}')">
            ${displayName}
            ${typeof getVerificationBadge === 'function' ? getVerificationBadge(p.author) : ''}
            <span style="font-size:10px; color:rgba(255,255,255,0.4); font-weight:normal; margin-left:4px;">@${p.author}</span>
          </div>
          <div class="soc-post-date">${dateStr}</div>
        </div>
        <div class="soc-post-status" style="color:${statusColor}">${statusLabel}</div>
        ${!isOwn && currentUser ? `
          <div class="soc-user-actions" onclick="event.stopPropagation()" style="gap:5px;">
            <button class="soc-follow-btn ${authorFollowed ? 'following' : ''}"
                    onclick="socToggleFollow('${p.author}',this)">
              ${authorFollowed ? '✓' : '+ Follow'}
            </button>
            <button class="soc-msg-btn" style="padding:6px 10px;"
                    onclick="socMsgOrAdd('${p.author}',${amIFriend})">
              <i class="fa-solid fa-${amIFriend ? 'comment' : 'user-plus'}"></i>
            </button>
          </div>` : ''}
      </div>
      <div class="soc-post-title">${p.name || 'Bilet'}</div>
      <div class="soc-post-events">
        ${(p.events || []).slice(0, 3).map(ev => `
          <div class="soc-post-event">
            <span>${ev.name}</span>
            <span class="soc-post-odds">@${parseFloat(ev.odds).toFixed(2)}</span>
          </div>`).join('')}
        ${p.events?.length > 3 ? `<div class="soc-post-more">+${p.events.length - 3} mai multe</div>` : ''}
      </div>
      <div class="soc-post-footer">
        <div class="soc-post-total">
          <span style="color:rgba(255,255,255,.4);font-size:11px;">COTĂ TOTALĂ</span>
          <span style="color:var(--nb);font-weight:700;font-size:16px;">@${parseFloat(p.totalOdds||p.odds||1).toFixed(2)}</span>
        </div>
        <div class="soc-post-actions">
          <button class="soc-action-ico" onclick="socialShareBet(${JSON.stringify(p).replace(/'/g,'&#39;').replace(/"/g,'&quot;')})" title="Share">
            <i class="fa-solid fa-share-nodes"></i>
          </button>
          ${isOwn ? `<button class="soc-action-ico danger" onclick="socDeletePost('${p.id}')" title="Șterge">
            <i class="fa-solid fa-trash"></i>
          </button>` : ''}
        </div>
      </div>
    </div>`;
}

/* ── Follow / Unfollow ── */
window.socToggleFollow = function(authorUsername, btn) {
  const user = getCurrentUser();
  if (!user) return authShowScreen();
  const follows = getFollows();
  const myKey   = user.username.toLowerCase();
  const authKey = authorUsername?.toLowerCase();
  if (!authKey) return;
  if (!follows[myKey]) follows[myKey] = [];
  const idx = follows[myKey].indexOf(authKey);

  if (idx >= 0) {
    follows[myKey].splice(idx, 1);
    if (btn) { btn.textContent = '+ Follow'; btn.classList.remove('following'); }
  } else {
    follows[myKey].push(authKey);
    if (btn) { btn.textContent = 'Urmărești'; btn.classList.add('following'); }

    /* Notificare în mesagerie pentru cel urmărit */
    if (typeof sendMessage === 'function') {
       const msg = `🚀 @${user.username} a început să îți urmărească activitatea!`;
       sendMessage(authorUsername, msg, true); // true = system notification
    }
  }
  saveFollows(follows);
};

/* ── Search utilizatori ── */
window.socSearch = function(query) {
  const res = document.getElementById('soc-search-results');
  if (!res) return;

  /* Permitem căutarea de la 1 caracter pentru a găsi pe toată lumea imediat */
  if (!query || query.trim().length < 1) { res.innerHTML = ''; return; }

  const users   = getUsers();
  const current = getCurrentUser();
  const follows = getFollows();
  const myFollows = current ? (follows[current.username.toLowerCase()] || []) : [];

  /* Căutare case-insensitive pe username, email sau displayName (Nickname) */
  const q = query.toLowerCase().trim();
  const matches = Object.values(users).filter(u =>
    (u.username && u.username.toLowerCase().includes(q)) ||
    (u.email && u.email.toLowerCase().includes(q)) ||
    (u.displayName && u.displayName.toLowerCase().includes(q))
  );

  if (!matches.length) {
    res.innerHTML = `<div class="soc-empty" style="padding:20px 16px;"><div style="font-family:Rajdhani,sans-serif;color:rgba(255,255,255,.4);">Niciun utilizator găsit.</div></div>`;
    return;
  }
  res.innerHTML = matches.map(u => {
    // Helper pentru afișare avatar (Emoji sau Imagine)
    const renderAvatarContent = (av) => {
      if (!av || av === 'default' || av === '👤') return '👤';
      if (av.startsWith('data:') || av.startsWith('http')) {
        return `<img src="${av}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" />`;
      }
      return av;
    };
    const avD = renderAvatarContent(u.avatar);
    const isMe = current && current.username.toLowerCase() === u.username.toLowerCase();
    const followed = myFollows.includes(u.username.toLowerCase());
    const userPosts = getPosts().filter(p => p.author?.toLowerCase() === u.username.toLowerCase()).length;
    return `
      <div class="soc-user-card" onclick="if(typeof viewUserProfile==='function') viewUserProfile('${u.username}')">
        <div class="soc-post-avatar">${avD}</div>
        <div style="flex:1;">
          <div class="soc-post-author" style="font-size:15px; color:#fff;">${u.displayName || u.username}</div>
          <div style="font-family:Rajdhani,sans-serif;font-size:11px;color:var(--nb);margin-top:-2px;">@${u.username}</div>
          <div class="soc-post-date">${userPosts} bilete postate • ${privacyIcon(u.privacy)} ${privacyLabel(u.privacy)}</div>
        </div>
        ${!isMe && current ? `
          <button class="soc-follow-btn ${followed ? 'following' : ''}"
                  onclick="socToggleFollow('${u.username}',this)">
            ${followed ? 'Urmărești' : '+ Follow'}
          </button>` : isMe ? '<span style="font-size:11px;color:rgba(255,255,255,.3);">Tu</span>' : ''}
      </div>`;
  }).join('');
};

/* ── Postările mele ── */
function socRenderMyPosts() {
  const list = document.getElementById('soc-my-list');
  if (!list) return;
  const user = getCurrentUser();
  if (!user) { list.innerHTML = `<div class="soc-empty"><div style="font-family:Rajdhani,sans-serif;color:rgba(255,255,255,.4);text-align:center;padding:20px;">Trebuie să fii logat.</div></div>`; return; }
  const myPosts = getPosts().filter(p => p.author?.toLowerCase() === user.username.toLowerCase())
    .sort((a, b) => b.postedAt - a.postedAt);
  if (!myPosts.length) {
    list.innerHTML = `<div class="soc-empty" style="padding:30px 16px;text-align:center;">
      <div style="font-size:36px;margin-bottom:10px;">📤</div>
      <div style="font-family:Syncopate,sans-serif;font-size:9px;color:rgba(255,255,255,.4);">N-AI POSTAT NICIUN BILET</div>
    </div>`;
    return;
  }
  list.innerHTML = myPosts.map(p => socRenderPost(p, user, [])).join('');
}

/* ── Post picker ── */
window.socOpenPostPicker = function() {
  const user = getCurrentUser();
  if (!user) return authShowScreen();
  const modal = document.getElementById('socPickModal');
  const list  = document.getElementById('socPickList');
  if (!modal || !list) return;
  let bets = [];
  try { bets = JSON.parse(localStorage.getItem('rgb_bets') || '[]'); } catch {}
  if (!bets.length) {
    list.innerHTML = `<div style="font-family:Rajdhani,sans-serif;color:rgba(255,255,255,.4);text-align:center;padding:16px;">Nu ai bilete de postat.</div>`;
  } else {
    list.innerHTML = bets.slice(-20).reverse().map(b => `
      <button class="soc-pick-item" onclick="socPostBet(${b.id})">
        <div style="font-family:Rajdhani,sans-serif;font-weight:700;color:#fff;">${b.name || b.match || 'Bilet #'+b.id}</div>
        <div style="display:flex;gap:12px;margin-top:4px;">
          <span style="font-size:12px;color:var(--nb);">@${parseFloat(b.totalOdds||b.odds||1).toFixed(2)}</span>
          <span style="font-size:12px;color:${b.status==='win'?'#00ff88':b.status==='loss'?'#ff3366':'#ffcc00'};">
            ${b.status==='win'?'✅':b.status==='loss'?'❌':'⏳'} ${(b.status||'PENDING').toUpperCase()}
          </span>
        </div>
      </button>`).join('');
  }
  modal.classList.add('open');
};
window.socClosePostPicker = function() {
  document.getElementById('socPickModal')?.classList.remove('open');
};

window.socPostBet = function(betId) {
  const user = getCurrentUser();
  if (!user) return;
  let bets = [];
  try { bets = JSON.parse(localStorage.getItem('rgb_bets') || '[]'); } catch {}
  const bet = bets.find(b => b.id === betId);
  if (!bet) return;
  const posts = getPosts();
  // Evităm duplicate
  if (posts.find(p => p.id === 'post_' + betId + '_' + user.username)) {
    socClosePostPicker();
    return;
  }
  const post = {
    id:        'post_' + betId + '_' + user.username,
    author:    user.username,
    name:      bet.name || bet.match || 'Bilet',
    events:    bet.events || [],
    totalOdds: bet.totalOdds || bet.odds || 1,
    stake:     bet.stake,
    status:    bet.status || 'pending',
    postedAt:  Date.now(),
    betId:     betId,
  };
  posts.unshift(post);
  if (posts.length > 200) posts.splice(200);
  savePosts(posts);
  socClosePostPicker();
  socSwitchTab('feed');
};

window.socDeletePost = function(postId) {
  let posts = getPosts();
  posts = posts.filter(p => p.id !== postId);
  savePosts(posts);
  socRenderFeed();
  socRenderMyPosts();
};

/* ═══════════════════════════════════════════════════════════════
   SHARE MODAL AVANSAT
═══════════════════════════════════════════════════════════════ */
window.openShareModal = function(bet) {
  if (typeof bet === 'string') { try { bet = JSON.parse(bet); } catch { return; } }
  const modal = document.getElementById('share-modal');
  const body  = document.getElementById('share-modal-body');
  if (!modal || !body) return;

  /* Generăm un link unic local (ID + timestamp) */
  const shareId  = (bet.id || Date.now()) + '_' + Math.random().toString(36).substr(2,6);
  const shareUrl = `${window.location.href.split('?')[0]}?ticket=${shareId}`;
  const odds     = parseFloat(bet.totalOdds || bet.odds || 1).toFixed(2);
  const shareText= `🎯 Am un bilet cu cota @${odds} pe rGdbet! ${shareUrl}`;
  const textEnc  = encodeURIComponent(shareText);
  const urlEnc   = encodeURIComponent(shareUrl);

  body.innerHTML = `
    <!-- Preview bilet -->
    <div class="share-preview-card">
      <div class="share-preview-title">${bet.name || bet.match || 'Bilet rGdbet'}</div>
      <div class="share-preview-odds">
        <span style="color:rgba(255,255,255,.5);font-size:12px;">COTĂ TOTALĂ</span>
        <span style="color:var(--ng);font-size:24px;font-weight:700;font-family:Syncopate,sans-serif;">@${odds}</span>
      </div>
      <div class="share-preview-events">
        ${(bet.events || []).slice(0,3).map(e => `
          <div class="share-preview-event">
            <span>${e.name}</span>
            <span style="color:var(--nb);">@${parseFloat(e.odds).toFixed(2)}</span>
          </div>`).join('')}
      </div>
    </div>

    <!-- Link de copiat -->
    <div class="share-url-wrap">
      <div class="share-url-label">LINK PUBLIC UNIC</div>
      <div class="share-url-row">
        <input class="share-url-input" id="shareUrlInp" type="text" value="${shareUrl}" readonly/>
        <button class="share-url-copy" onclick="shareCopyLink()">
          <i class="fa-solid fa-copy" id="shareCopyIcon"></i>
        </button>
      </div>
    </div>

    <!-- Rețele sociale -->
    <div class="share-social-title">DISTRIBUIE PE</div>
    <div class="share-social-grid">
      <a class="share-soc-btn share-wa"
         href="https://wa.me/?text=${textEnc}"
         target="_blank" rel="noopener">
        <i class="fa-brands fa-whatsapp"></i> WhatsApp
      </a>
      <a class="share-soc-btn share-fb"
         href="https://www.facebook.com/sharer/sharer.php?u=${urlEnc}&quote=${textEnc}"
         target="_blank" rel="noopener">
        <i class="fa-brands fa-facebook"></i> Facebook
      </a>
      <a class="share-soc-btn share-tg"
         href="https://t.me/share/url?url=${urlEnc}&text=${textEnc}"
         target="_blank" rel="noopener">
        <i class="fa-brands fa-telegram"></i> Telegram
      </a>
      <a class="share-soc-btn share-tw"
         href="https://twitter.com/intent/tweet?text=${textEnc}"
         target="_blank" rel="noopener">
        <i class="fa-brands fa-x-twitter"></i> X / Twitter
      </a>
    </div>
  `;
  modal.style.display = 'flex';
};

window.shareCopyLink = function() {
  const inp  = document.getElementById('shareUrlInp');
  const icon = document.getElementById('shareCopyIcon');
  if (!inp) return;
  navigator.clipboard.writeText(inp.value).then(() => {
    if (icon) { icon.className = 'fa-solid fa-check'; }
    setTimeout(() => { if (icon) icon.className = 'fa-solid fa-copy'; }, 2000);
  }).catch(() => {
    inp.select();
    document.execCommand('copy');
  });
};


/* ═══════════════════════════════════════════════════════════════
   SHARE BILET — funcție unificată cu text atractiv pentru rețele
═══════════════════════════════════════════════════════════════ */
window.socialShareBet = function(bet) {
  if (typeof bet === 'string') { try { bet = JSON.parse(bet); } catch { return; } }
  if (typeof openShareModal === 'function') openShareModal(bet);
};

window.openShareModal = function(bet) {
  if (typeof bet === 'string') { try { bet = JSON.parse(bet); } catch { return; } }
  const modal = document.getElementById('share-modal');
  const body  = document.getElementById('share-modal-body');
  if (!modal || !body) return;

  const odds      = parseFloat(bet.totalOdds || bet.odds || 1).toFixed(2);
  const status    = (bet.status || 'pending').toUpperCase();
  const statusEmoji = bet.status === 'win' ? '✅' : bet.status === 'loss' ? '❌' : '⏳';
  const name      = bet.name || bet.match || 'Bilet rGdbet';
  const shareUrl  = window.location.href.split('?')[0] + '?share=' + (bet.id || Date.now()).toString(36);
  const shareText = `${statusEmoji} ${name} — Cotă @${odds} pe rGdbet 🚀 ${shareUrl}`;
  const textEnc   = encodeURIComponent(shareText);
  const urlEnc    = encodeURIComponent(shareUrl);

  body.innerHTML = `
    <div class="share-preview-card">
      <div class="share-preview-title">${escapeHtmlShare(name)}</div>
      <div class="share-preview-odds">
        <span style="color:rgba(255,255,255,.4);font-size:11px;font-family:Syncopate,sans-serif;letter-spacing:1px;">COTĂ TOTALĂ</span>
        <span style="color:var(--ng,#00ff88);font-size:26px;font-weight:700;font-family:Syncopate,sans-serif;">@${odds}</span>
        <span style="color:${bet.status==='win'?'#00ff88':bet.status==='loss'?'#ff3366':'#ffcc00'};font-family:Rajdhani,sans-serif;font-size:14px;font-weight:700;">${statusEmoji} ${status}</span>
      </div>
      ${(bet.events||[]).length > 0 ? `
      <div class="share-preview-events">
        ${(bet.events||[]).slice(0,4).map(e=>`
          <div class="share-preview-event">
            <span>${escapeHtmlShare(e.name||'')}</span>
            <span style="color:var(--nb,#00c8ff);font-weight:700;">@${parseFloat(e.odds||1).toFixed(2)}</span>
          </div>`).join('')}
        ${(bet.events||[]).length > 4 ? `<div class="soc-post-more">+${bet.events.length-4} selecții</div>`:''}
      </div>` : ''}
    </div>

    <div class="share-url-wrap">
      <div class="share-url-label">LINK PUBLIC</div>
      <div class="share-url-row">
        <input class="share-url-input" id="shareUrlInp" type="text" value="${shareUrl}" readonly/>
        <button class="share-url-copy" onclick="shareCopyLink()" id="shareCopyBtn">
          <i class="fa-solid fa-copy" id="shareCopyIcon"></i>
        </button>
      </div>
    </div>

    <div class="share-social-title">DISTRIBUIE PE REȚELE</div>
    <div class="share-social-grid">
      <a class="share-soc-btn share-wa" href="https://wa.me/?text=${textEnc}" target="_blank" rel="noopener">
        <i class="fa-brands fa-whatsapp"></i> WhatsApp
      </a>
      <a class="share-soc-btn share-fb" href="https://www.facebook.com/sharer/sharer.php?u=${urlEnc}&quote=${textEnc}" target="_blank" rel="noopener">
        <i class="fa-brands fa-facebook"></i> Facebook
      </a>
      <a class="share-soc-btn share-tg" href="https://t.me/share/url?url=${urlEnc}&text=${encodeURIComponent(shareText.split(shareUrl)[0].trim())}" target="_blank" rel="noopener">
        <i class="fa-brands fa-telegram"></i> Telegram
      </a>
      <a class="share-soc-btn share-tw" href="https://twitter.com/intent/tweet?text=${textEnc}" target="_blank" rel="noopener">
        <i class="fa-brands fa-x-twitter"></i> X / Twitter
      </a>
    </div>
  `;
  modal.style.display = 'flex';
};

window.shareCopyLink = function() {
  const inp  = document.getElementById('shareUrlInp');
  const icon = document.getElementById('shareCopyIcon');
  const btn  = document.getElementById('shareCopyBtn');
  if (!inp) return;
  navigator.clipboard.writeText(inp.value).then(() => {
    if (icon) icon.className = 'fa-solid fa-check';
    if (btn)  { btn.style.background = '#00ff88'; btn.style.color = '#000'; }
    setTimeout(() => {
      if (icon) icon.className = 'fa-solid fa-copy';
      if (btn)  { btn.style.background = ''; btn.style.color = ''; }
    }, 2200);
  }).catch(() => { inp.select(); document.execCommand('copy'); });
};

function escapeHtmlShare(str) {
  return String(str||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

/* ═══════════════════════════════════════════════════════════════
   INTEGRARE CU SCRIPT.JS — adaugă buton share la bilete
═══════════════════════════════════════════════════════════════ */
/* Interceptăm render() din script.js pentru a adăuga butonul share */
(function patchShareButtons() {
  let tries = 0;
  const iv = setInterval(() => {
    tries++;
    /* Observăm DOM-ul pentru carduri de bilete nou create */
    const container = document.getElementById('betsContainer');
    if (container && !container._shareObserved) {
      container._shareObserved = true;
      const obs = new MutationObserver(() => {
        /* Injectăm share pe .bet-item (clasa reală din script.js) */
        container.querySelectorAll('.bet-item:not([data-share-injected])').forEach(card => {
          card.setAttribute('data-share-injected', '1');
          /* Găsim id-ul din data-attribute sau din onclick existent */
          let betId = card.dataset.betId || card.dataset.id;
          if (!betId) {
            const onclickStr = card.getAttribute('onclick') || '';
            const m = onclickStr.match(/\d{10,}/);
            if (m) betId = m[0];
          }
          let bets = [];
          try { bets = JSON.parse(localStorage.getItem('rgb_bets') || '[]'); } catch {}
          const bet = betId ? bets.find(b => String(b.id) === String(betId)) : bets[bets.length - 1];
          if (!bet) return;
          const shareBtn = document.createElement('button');
          shareBtn.className = 'bet-share-inject';
          shareBtn.innerHTML = '<i class="fa-solid fa-share-nodes"></i> Share';
          shareBtn.onclick   = (e) => { e.stopPropagation(); openShareModal(bet); };
          /* Adaugă la finalul cardului */
          const footer = card.querySelector('.bet-footer, .bet-actions') || card;
          footer.appendChild(shareBtn);
        });
      });
      obs.observe(container, { childList: true, subtree: false });
    }
    if (tries > 30) clearInterval(iv);
  }, 300);
})();


/* Helper: deschide chat sau trimite cerere prietenie */
window.socMsgOrAdd = function(username, isFriend) {
  if (isFriend) {
    openMessagesPanel();
    setTimeout(() => openConversation(username.toLowerCase()), 380);
  } else {
    if (typeof sendFriendRequest === 'function') sendFriendRequest(username);
  }
};
/* ═══════════════════════════════════════════════════════════════
   INIT LA PORNIRE
═══════════════════════════════════════════════════════════════ */
(function init() {
  /* Sincronizăm bazele de date pentru a ne asigura că toți utilizatorii sunt găsiți */
  try {
    const db1 = JSON.parse(localStorage.getItem('rgd_users') || '{}');
    const db2 = JSON.parse(localStorage.getItem('rgb_users_db') || '{}');
    const merged = { ...db1, ...db2 };
    localStorage.setItem('rgb_users_db', JSON.stringify(merged));
    localStorage.setItem('rgd_users', JSON.stringify(merged));
  } catch(e) { console.error("Sync error:", e); }

  const user = getCurrentUser();
  if (user) {
    authUpdateTopBar(user);
    /* Aplică tema salvată */
    if (user.theme && typeof window.THEMES !== 'undefined') {
      const t = window.THEMES.find(x => x.id === user.theme);
      if (t && typeof window.applyTheme === 'function') window.applyTheme(t);
    }
  }

  /* Afișează auth screen la prima folosire (nu e user logat) */
  const seen = localStorage.getItem('rgb_auth_seen');
  if (!user && !seen) {
    localStorage.setItem('rgb_auth_seen', '1');
    setTimeout(() => {
      if (!getCurrentUser()) authShowScreen();
    }, 1200);
  }
})();

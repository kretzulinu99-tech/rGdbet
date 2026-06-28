/* ═══════════════════════════════════════════════════════════════
   auth.js — Sistem de autentificare + pagina Profil
   Stocare: localStorage (per browser/dispozitiv)
   Structura users: { username, email, passwordHash, createdAt, avatar }
   Structura sesiune: { username, email, loginAt }
═══════════════════════════════════════════════════════════════ */

'use strict';

/* ─────────────────────────────────────────────
   1. UTILITARE
───────────────────────────────────────────── */

// Hash simplu djb2 (nu criptografie reala — suficient pt localStorage local)
function authHash(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
    hash = hash >>> 0;
  }
  return hash.toString(16);
}

function authGetUsers() {
  try { return JSON.parse(localStorage.getItem('rgb_users_db') || '{}'); } catch { return {}; }
}
function authSaveUsers(users) {
  localStorage.setItem('rgb_users_db', JSON.stringify(users));
  localStorage.setItem('rgd_users', JSON.stringify(users)); // Sync
}

function authGetSession() {
  try { return JSON.parse(localStorage.getItem('rgd_session') || 'null'); } catch { return null; }
}
function authSaveSession(session) {
  localStorage.setItem('rgd_session', JSON.stringify(session));
}
function authClearSession() {
  localStorage.removeItem('rgd_session');
}

// Cheia de stocare a datelor (bilete, setari) per utilizator
function authUserKey(username, suffix) {
  return 'rgd_u_' + username + '_' + suffix;
}

/* ─────────────────────────────────────────────
   2. VALIDARI
───────────────────────────────────────────── */
function authShowError(msg) {
  const el = document.getElementById('auth-error');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 4000);
}
function authHideError() {
  const el = document.getElementById('auth-error');
  if (el) el.classList.remove('show');
}

function authPwStrength(pw) {
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
  fill.style.width      = pct + '%';
  fill.style.background = color;
}

/* ─────────────────────────────────────────────
   3. COMUTARE TAB LOGIN / REGISTER
───────────────────────────────────────────── */
window.authSwitchTab = function(tab) {
  authHideError();
  document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.auth-panel').forEach(p => p.classList.remove('active'));
  document.getElementById('tab-' + tab).classList.add('active');
  document.getElementById('panel-' + tab).classList.add('active');
};

/* ─────────────────────────────────────────────
   4. ÎNREGISTRARE
───────────────────────────────────────────── */
window.authRegister = function() {
  const username = (document.getElementById('reg-username').value || '').trim();
  const email    = (document.getElementById('reg-email').value    || '').trim().toLowerCase();
  const pass     = (document.getElementById('reg-pass').value     || '');
  const pass2    = (document.getElementById('reg-pass2').value    || '');

  if (username.length < 3)         return authShowError('Numele de utilizator trebuie să aibă minim 3 caractere.');
  if (!/^[a-zA-Z0-9_.-]+$/.test(username)) return authShowError('Numele poate conține doar litere, cifre, _ . -');
  if (!email.includes('@'))        return authShowError('Adresa de email nu este validă.');
  if (pass.length < 6)             return authShowError('Parola trebuie să aibă minim 6 caractere.');
  if (pass !== pass2)              return authShowError('Parolele nu coincid.');

  const users = authGetUsers();
  if (users[username.toLowerCase()]) return authShowError('Acest utilizator există deja.');
  const emailTaken = Object.values(users).some(u => u.email === email);
  if (emailTaken) return authShowError('Această adresă de email este deja înregistrată.');

  const newUser = {
    username,
    email,
    passwordHash: authHash(pass),
    createdAt:    new Date().toISOString(),
    avatar:       null,      // null = initiale generate
    theme:        'standard',
    language:     'ro',
  };
  users[username.toLowerCase()] = newUser;
  authSaveUsers(users);

  // Login automat după înregistrare
  authStartSession(newUser);
};

/* ─────────────────────────────────────────────
   5. LOGIN
───────────────────────────────────────────── */
window.authLogin = function() {
  const raw  = (document.getElementById('login-user').value || '').trim().toLowerCase();
  const pass = (document.getElementById('login-pass').value || '');

  if (!raw)  return authShowError('Introdu numele de utilizator sau email-ul.');
  if (!pass) return authShowError('Introdu parola.');

  const users = authGetUsers();
  // Cauta dupa username sau email
  let found = users[raw] || Object.values(users).find(u => u.email === raw);

  if (!found)                              return authShowError('Utilizatorul sau email-ul nu există.');
  if (found.passwordHash !== authHash(pass)) return authShowError('Parolă incorectă.');

  authStartSession(found);
};

/* ─────────────────────────────────────────────
   6. START SESIUNE → ascunde auth screen
───────────────────────────────────────────── */
function authStartSession(user) {
  const sess = { username: user.username, email: user.email, loginAt: new Date().toISOString() };
  authSaveSession(sess);
  localStorage.setItem('rgb_session', JSON.stringify(sess));
  localStorage.setItem('rgb_user', JSON.stringify(user));
  localStorage.setItem('rgd_user', JSON.stringify(user));
  authHideError();

  const screen = document.getElementById('auth-screen');
  if (screen) {
    screen.classList.add('hiding');
    setTimeout(() => { screen.style.display = 'none'; }, 400);
  }

  // Actualizeaza nav label cu username
  authUpdateNavLabel(user.username);

  // Construieste pagina Profil
  buildProfileUI(user);

  // Sincronizeaza datele utilizatorului cu app (bilete, setari etc.)
  authSyncUserData(user.username);
}

/* ─────────────────────────────────────────────
   7. LOGOUT
───────────────────────────────────────────── */
window.authLogout = function() {
  // Salveaza datele curente înainte de logout
  const session = authGetSession();
  if (session) authPersistUserData(session.username);

  // Clearing all potential session keys
  localStorage.removeItem('rgd_session');
  localStorage.removeItem('rgb_session');
  localStorage.removeItem('rgb_user');
  localStorage.removeItem('rgd_user');

  if (window.Android && typeof window.Android.logout === 'function') {
    window.Android.logout();
    return;
  }

  // Reseteaza app-ul vizual
  const screen = document.getElementById('auth-screen');
  if (screen) {
    screen.style.display = 'flex';
    screen.classList.remove('hiding');
    // Reset form
    ['login-user','login-pass','reg-username','reg-email','reg-pass','reg-pass2'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    authHideError();
    authSwitchTab('login');
  }

  // Navigheaza la home
  if (typeof navigateTo === 'function') navigateTo('home', document.querySelector('.nav-btn[data-page="home"]'));
};

/* ─────────────────────────────────────────────
   8. SINCRONIZARE DATE UTILIZATOR
   Fiecare user are propriul "namespace" în localStorage
───────────────────────────────────────────── */
function authSyncUserData(username) {
  // Incarca biletele utilizatorului (daca exista) in variabilele globale ale app-ului
  const savedBets = localStorage.getItem(authUserKey(username, 'bets'));
  if (savedBets && typeof window._setBetsFromAuth === 'function') {
    try { window._setBetsFromAuth(JSON.parse(savedBets)); } catch {}
  }
  const savedBudget = localStorage.getItem(authUserKey(username, 'budget'));
  if (savedBudget) {
    const inp = document.getElementById('budget-input');
    if (inp) { inp.value = savedBudget; if (typeof handleDeposit === 'function') handleDeposit(savedBudget); }
  }
}

function authPersistUserData(username) {
  // Salveaza biletele curente sub namespace-ul userului
  try {
    const betsKey = 'bets_' + (typeof getCurrentPortfolioId === 'function' ? getCurrentPortfolioId() : 'default');
    const bets = localStorage.getItem(betsKey);
    if (bets) localStorage.setItem(authUserKey(username, 'bets'), bets);
  } catch {}
  const inp = document.getElementById('budget-input');
  if (inp) localStorage.setItem(authUserKey(username, 'budget'), inp.value);
}

/* ─────────────────────────────────────────────
   9. ACTUALIZARE NAV LABEL
───────────────────────────────────────────── */
function authUpdateNavLabel(username) {
  const lbl = document.getElementById('nav-profil-label');
  if (lbl) lbl.textContent = username.substring(0, 6).toUpperCase();
}

/* ─────────────────────────────────────────────
   10. CONSTRUIRE PAGINA PROFIL
───────────────────────────────────────────── */
function buildProfileUI(user) {
  const container = document.getElementById('page-profil');
  if (!container) return;

  // Helper pentru afișare avatar (Emoji sau Imagine)
  const renderAvatarContent = (av, username) => {
    if (!av || av === 'default' || av === '👤') return (username || '??').substring(0, 2).toUpperCase();
    if (av.startsWith('data:') || av.startsWith('http')) {
      return `<img src="${av}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" />`;
    }
    return av;
  };

  const initials = renderAvatarContent(user.avatar, user.username);
  const joinDate  = new Date(user.createdAt).toLocaleDateString('ro-RO', { year:'numeric', month:'long', day:'numeric' });

  // Statistici din localStorage (calculate din biletele salvate)
  const stats = authComputeStats(user.username);

  container.innerHTML = `
    <div class="page-top-title">
      <i class="fa-solid fa-circle-user" style="color:var(--nb);"></i>
      <span>PROFIL</span>
    </div>

    <!-- ── HERO: Avatar + nume ── -->
    <div class="profile-hero">
      <div class="profile-avatar-wrap">
        <div class="profile-avatar" id="prof-avatar" onclick="authOpenEditModal('avatar')">
          ${initials}
        </div>
        <div class="profile-avatar-edit" onclick="authOpenEditModal('avatar')">
          <i class="fa-solid fa-pen"></i>
        </div>
      </div>
      <div class="profile-username">${user.username}</div>
      <div class="profile-email">${user.email}</div>
      <div class="profile-badge">
        <i class="fa-solid fa-crown"></i> MEMBER
      </div>
      <div class="profile-joined">Membru din ${joinDate}</div>
    </div>

    <!-- ── STATISTICI RAPIDE ── -->
    <div class="profile-stats-row">
      <div class="profile-stat-card">
        <span class="profile-stat-val" id="prof-stat-tickets">${stats.total}</span>
        <div class="profile-stat-lbl">Bilete</div>
      </div>
      <div class="profile-stat-card">
        <span class="profile-stat-val" style="color:var(--ng)" id="prof-stat-wr">${stats.wr}%</span>
        <div class="profile-stat-lbl">Win Rate</div>
      </div>
      <div class="profile-stat-card">
        <span class="profile-stat-val" style="color:${stats.profit >= 0 ? 'var(--ng)' : 'var(--danger)'}" id="prof-stat-profit">
          ${stats.profit >= 0 ? '+' : ''}${stats.profit}
        </span>
        <div class="profile-stat-lbl">Profit</div>
      </div>
    </div>

    <!-- ── SETARI CONT ── -->
    <div class="profile-section">
      <div class="profile-section-title">SETĂRI CONT</div>

      <div class="profile-row" onclick="authOpenEditModal('username')">
        <div class="profile-row-left">
          <div class="profile-row-icon blue"><i class="fa-solid fa-user"></i></div>
          <div class="profile-row-text">
            <span class="profile-row-label">Schimbă Username</span>
            <span class="profile-row-sub">${user.username}</span>
          </div>
        </div>
        <i class="fa-solid fa-chevron-right profile-row-arrow"></i>
      </div>

      <div class="profile-row" onclick="authOpenEditModal('email')">
        <div class="profile-row-left">
          <div class="profile-row-icon blue"><i class="fa-solid fa-envelope"></i></div>
          <div class="profile-row-text">
            <span class="profile-row-label">Schimbă Email</span>
            <span class="profile-row-sub">${user.email}</span>
          </div>
        </div>
        <i class="fa-solid fa-chevron-right profile-row-arrow"></i>
      </div>

      <div class="profile-row" onclick="authOpenEditModal('password')">
        <div class="profile-row-left">
          <div class="profile-row-icon purple"><i class="fa-solid fa-lock"></i></div>
          <div class="profile-row-text">
            <span class="profile-row-label">Schimbă Parola</span>
            <span class="profile-row-sub">••••••••</span>
          </div>
        </div>
        <i class="fa-solid fa-chevron-right profile-row-arrow"></i>
      </div>
    </div>

    <!-- ── PREFERINTE ── -->
    <div class="profile-section">
      <div class="profile-section-title">PREFERINȚE</div>

      <div class="profile-row" onclick="navigateTo('home', document.querySelector('.nav-btn[data-page=home]'))">
        <div class="profile-row-left">
          <div class="profile-row-icon gold"><i class="fa-solid fa-palette"></i></div>
          <div class="profile-row-text">
            <span class="profile-row-label">Temă & Aspect</span>
            <span class="profile-row-sub">Schimbă din pagina principală</span>
          </div>
        </div>
        <i class="fa-solid fa-chevron-right profile-row-arrow"></i>
      </div>

      <div class="profile-row" onclick="navigateTo('home', document.querySelector('.nav-btn[data-page=home]'))">
        <div class="profile-row-left">
          <div class="profile-row-icon green"><i class="fa-solid fa-globe"></i></div>
          <div class="profile-row-text">
            <span class="profile-row-label">Limbă</span>
            <span class="profile-row-sub">Schimbă din pagina principală</span>
          </div>
        </div>
        <i class="fa-solid fa-chevron-right profile-row-arrow"></i>
      </div>
    </div>

    <!-- ── DATE & SECURITATE ── -->
    <div class="profile-section">
      <div class="profile-section-title">DATE & SECURITATE</div>

      <div class="profile-row" onclick="authExportData()">
        <div class="profile-row-left">
          <div class="profile-row-icon green"><i class="fa-solid fa-file-export"></i></div>
          <div class="profile-row-text">
            <span class="profile-row-label">Exportă Datele</span>
            <span class="profile-row-sub">Descarcă biletele în format JSON</span>
          </div>
        </div>
        <i class="fa-solid fa-chevron-right profile-row-arrow"></i>
      </div>

      <div class="profile-row" onclick="authConfirmDeleteAccount()" style="border-color:rgba(255,51,102,.2);">
        <div class="profile-row-left">
          <div class="profile-row-icon red"><i class="fa-solid fa-trash-can"></i></div>
          <div class="profile-row-text">
            <span class="profile-row-label" style="color:var(--danger);">Șterge Contul</span>
            <span class="profile-row-sub">Acțiune ireversibilă</span>
          </div>
        </div>
        <i class="fa-solid fa-chevron-right profile-row-arrow" style="color:var(--danger);"></i>
      </div>
    </div>

    <!-- ── DESPRE APLICATIE ── -->
    <div class="profile-section">
      <div class="profile-section-title">DESPRE</div>
      <div class="profile-row" style="cursor:default;">
        <div class="profile-row-left">
          <div class="profile-row-icon gold"><i class="fa-solid fa-crown"></i></div>
          <div class="profile-row-text">
            <span class="profile-row-label">rGdbet</span>
            <span class="profile-row-sub">Sports Analytics Platform v1.0</span>
          </div>
        </div>
      </div>
    </div>

    <!-- ── BUTON DECONECTARE ── -->
    <button class="profile-logout-btn" onclick="authLogout()">
      <i class="fa-solid fa-right-from-bracket"></i>
      DECONECTARE
    </button>

    <!-- ── MODAL EDITARE ── -->
    <div class="profile-edit-modal" id="profile-edit-modal">
      <div class="profile-edit-box">
        <div class="profile-edit-title" id="edit-modal-title">EDITARE</div>
        <div class="auth-error" id="edit-error" style="margin-bottom:12px;"></div>
        <div id="edit-modal-body"></div>
        <div style="display:flex;gap:8px;margin-top:16px;">
          <button class="auth-btn" style="background:rgba(255,255,255,.08);color:var(--text2);box-shadow:none;flex:1;" onclick="authCloseEditModal()">ANULEAZĂ</button>
          <button class="auth-btn" style="flex:2;" id="edit-save-btn" onclick="authSaveEdit()">SALVEAZĂ</button>
        </div>
      </div>
    </div>
  `;
}

/* ─────────────────────────────────────────────
   11. CALCULARE STATISTICI PROFIL
───────────────────────────────────────────── */
function authComputeStats(username) {
  let total = 0, wins = 0, profit = 0;
  try {
    // Incarca din toate portofoliile posibile
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      // Chei de tip: bets_port_X sau bets_default sau rgd_u_username_bets
      if (key.startsWith('bets_') || key === authUserKey(username, 'bets')) {
        const data = JSON.parse(localStorage.getItem(key) || '[]');
        if (!Array.isArray(data)) continue;
        data.forEach(b => {
          if (b.status === 'win' || b.status === 'loss') {
            total++;
            if (b.status === 'win') {
              wins++;
              profit += parseFloat(b.stake || 0) * (parseFloat(b.totalOdds || 1) - 1);
            } else {
              profit -= parseFloat(b.stake || 0);
            }
          }
        });
      }
    }
  } catch {}
  return {
    total,
    wr:     total > 0 ? Math.round((wins / total) * 100) : 0,
    profit: profit.toFixed(2),
  };
}

/* ─────────────────────────────────────────────
   12. MODAL EDITARE PROFIL
───────────────────────────────────────────── */
let _currentEditType = null;

window.authOpenEditModal = function(type) {
  _currentEditType = type;
  const modal    = document.getElementById('profile-edit-modal');
  const titleEl  = document.getElementById('edit-modal-title');
  const bodyEl   = document.getElementById('edit-modal-body');
  const errorEl  = document.getElementById('edit-error');
  if (!modal || !bodyEl) return;
  if (errorEl) errorEl.classList.remove('show');

  const session = authGetSession();
  const users   = authGetUsers();
  const user    = session ? users[session.username.toLowerCase()] : null;
  if (!user) return;

  const inputStyle = `style="width:100%;background:rgba(255,255,255,.05);border:1px solid var(--border);border-radius:12px;padding:11px 14px;font-family:'Rajdhani',sans-serif;font-size:15px;color:var(--text);outline:none;box-sizing:border-box;"`;

  if (type === 'username') {
    titleEl.textContent = 'SCHIMBĂ USERNAME';
    bodyEl.innerHTML = `
      <div class="auth-field">
        <label style="font-family:'Syncopate',sans-serif;font-size:8px;color:var(--text2);letter-spacing:1.5px;display:block;margin-bottom:6px;">NOU USERNAME</label>
        <input id="edit-input-1" type="text" value="${user.username}" ${inputStyle} placeholder="min. 3 caractere"/>
      </div>`;
  } else if (type === 'email') {
    titleEl.textContent = 'SCHIMBĂ EMAIL';
    bodyEl.innerHTML = `
      <div class="auth-field">
        <label style="font-family:'Syncopate',sans-serif;font-size:8px;color:var(--text2);letter-spacing:1.5px;display:block;margin-bottom:6px;">NOU EMAIL</label>
        <input id="edit-input-1" type="email" value="${user.email}" ${inputStyle} placeholder="adresa@email.com"/>
      </div>`;
  } else if (type === 'password') {
    titleEl.textContent = 'SCHIMBĂ PAROLA';
    bodyEl.innerHTML = `
      <div class="auth-field" style="margin-bottom:10px;">
        <label style="font-family:'Syncopate',sans-serif;font-size:8px;color:var(--text2);letter-spacing:1.5px;display:block;margin-bottom:6px;">PAROLA ACTUALĂ</label>
        <input id="edit-input-0" type="password" ${inputStyle} placeholder="••••••••"/>
      </div>
      <div class="auth-field" style="margin-bottom:10px;">
        <label style="font-family:'Syncopate',sans-serif;font-size:8px;color:var(--text2);letter-spacing:1.5px;display:block;margin-bottom:6px;">PAROLA NOUĂ</label>
        <input id="edit-input-1" type="password" ${inputStyle} placeholder="min. 6 caractere"/>
      </div>
      <div class="auth-field">
        <label style="font-family:'Syncopate',sans-serif;font-size:8px;color:var(--text2);letter-spacing:1.5px;display:block;margin-bottom:6px;">CONFIRMĂ PAROLA NOUĂ</label>
        <input id="edit-input-2" type="password" ${inputStyle} placeholder="repetă parola"/>
      </div>`;
  } else if (type === 'avatar') {
    titleEl.textContent = 'AVATAR';
    bodyEl.innerHTML = `
      <p style="font-family:'Rajdhani',sans-serif;color:var(--text2);font-size:13px;text-align:center;margin-bottom:14px;">
        Avatarul este generat automat din inițialele numelui tău.<br>
        <span style="color:var(--text2);font-size:11px;">Suport pentru avatare personalizate — în curând.</span>
      </p>
      <div style="display:flex;justify-content:center;">
        <div style="width:72px;height:72px;border-radius:50%;background:linear-gradient(135deg,var(--nb),var(--np));display:flex;align-items:center;justify-content:center;font-size:28px;font-weight:700;color:#fff;font-family:'Syncopate',sans-serif;">
          ${user.username.substring(0,2).toUpperCase()}
        </div>
      </div>`;
    document.getElementById('edit-save-btn').style.display = 'none';
    modal.classList.add('open');
    return;
  }

  document.getElementById('edit-save-btn').style.display = '';
  modal.classList.add('open');
  setTimeout(() => { const inp = document.getElementById('edit-input-1'); if (inp) inp.focus(); }, 200);
};

window.authCloseEditModal = function() {
  const modal = document.getElementById('profile-edit-modal');
  if (modal) modal.classList.remove('open');
  _currentEditType = null;
};

window.authSaveEdit = function() {
  const session = authGetSession();
  if (!session) return;
  const users = authGetUsers();
  const userKey = session.username.toLowerCase();
  const user  = users[userKey];
  if (!user) return;

  const showEditError = (msg) => {
    const el = document.getElementById('edit-error');
    if (el) { el.textContent = msg; el.classList.add('show'); }
  };

  if (_currentEditType === 'username') {
    const newName = (document.getElementById('edit-input-1')?.value || '').trim();
    if (newName.length < 3)                    return showEditError('Minim 3 caractere.');
    if (!/^[a-zA-Z0-9_.-]+$/.test(newName))   return showEditError('Caractere invalide.');
    if (newName.toLowerCase() !== userKey && users[newName.toLowerCase()]) return showEditError('Username deja folosit.');

    // Muta datele sub noul key
    user.username = newName;
    if (newName.toLowerCase() !== userKey) {
      users[newName.toLowerCase()] = user;
      delete users[userKey];
    }
    authSaveUsers(users);
    authSaveSession({ ...session, username: newName });
    authUpdateNavLabel(newName);
    buildProfileUI(user);
    authCloseEditModal();

  } else if (_currentEditType === 'email') {
    const newEmail = (document.getElementById('edit-input-1')?.value || '').trim().toLowerCase();
    if (!newEmail.includes('@'))              return showEditError('Email invalid.');
    const taken = Object.entries(users).some(([k, u]) => u.email === newEmail && k !== userKey);
    if (taken)                               return showEditError('Email deja înregistrat.');
    user.email = newEmail;
    users[userKey] = user;
    authSaveUsers(users);
    authSaveSession({ ...session, email: newEmail });
    buildProfileUI(user);
    authCloseEditModal();

  } else if (_currentEditType === 'password') {
    const oldPass  = document.getElementById('edit-input-0')?.value || '';
    const newPass  = document.getElementById('edit-input-1')?.value || '';
    const newPass2 = document.getElementById('edit-input-2')?.value || '';
    if (authHash(oldPass) !== user.passwordHash) return showEditError('Parola actuală este incorectă.');
    if (newPass.length < 6)                      return showEditError('Parola nouă — minim 6 caractere.');
    if (newPass !== newPass2)                    return showEditError('Parolele noi nu coincid.');
    user.passwordHash = authHash(newPass);
    users[userKey] = user;
    authSaveUsers(users);
    authCloseEditModal();
    // Feedback vizual
    const btn = document.getElementById('edit-save-btn');
    if (btn) { btn.textContent = '✅ SALVAT'; setTimeout(() => authCloseEditModal(), 800); }
  }
};

/* ─────────────────────────────────────────────
   13. EXPORT DATE
───────────────────────────────────────────── */
window.authExportData = function() {
  const session = authGetSession();
  if (!session) return;
  const exportData = {
    exportedAt: new Date().toISOString(),
    username:   session.username,
    bets:       [],
  };
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('bets_')) {
      try {
        const data = JSON.parse(localStorage.getItem(key));
        if (Array.isArray(data)) exportData.bets.push(...data);
      } catch {}
    }
  }
  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `rGdbet_${session.username}_${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
};

/* ─────────────────────────────────────────────
   14. STERGERE CONT
───────────────────────────────────────────── */
window.authConfirmDeleteAccount = function() {
  const session = authGetSession();
  if (!session) return;
  const confirmed = window.confirm(
    `Ești sigur că vrei să ștergi contul "${session.username}"?\n\nAceastă acțiune este ireversibilă și va șterge toate datele tale.`
  );
  if (!confirmed) return;
  const users = authGetUsers();
  delete users[session.username.toLowerCase()];
  authSaveUsers(users);
  // Sterge datele userului
  const keysToDelete = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (key.startsWith('rgd_u_' + session.username) || key.startsWith('bets_'))) {
      keysToDelete.push(key);
    }
  }
  keysToDelete.forEach(k => localStorage.removeItem(k));
  authLogout();
};

/* ─────────────────────────────────────────────
   15. INIT — verifica sesiune la pornire
───────────────────────────────────────────── */
(function authInit() {
  const session = authGetSession();
  if (session) {
    const users = authGetUsers();
    const user  = users[session.username.toLowerCase()];
    if (user) {
      // Sesiune valida → ascunde auth screen imediat
      const screen = document.getElementById('auth-screen');
      if (screen) screen.style.display = 'none';
      authUpdateNavLabel(user.username);
      buildProfileUI(user);
      authSyncUserData(user.username);
      return;
    }
  }
  // Nicio sesiune → auth screen ramane vizibil (default din HTML)
})();

/* ═══════════════════════════════════════════════════════════════
   auth.js — Sistem de autentificare + pagina Profil
   Stocare: localStorage (per browser/dispozitiv)
   Structura users: { username, email, passwordHash, createdAt, avatar }
   Structura sesiune: { username, email, loginAt }
═══════════════════════════════════════════════════════════════ */

'use strict';

/* ─────────────────────────────────────────────
   1. UTILITARE (Unified in utils.js v18.0)
───────────────────────────────────────────── */

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
    passwordHash: hashStr(pass),
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
  if (found.passwordHash !== hashStr(pass)) return authShowError('Parolă incorectă.');

  authStartSession(found);
};

/* ─────────────────────────────────────────────
   6. START SESIUNE → ascunde auth screen
───────────────────────────────────────────── */
function authStartSession(user) {
  const sess = { username: user.username, email: user.email, loginAt: new Date().toISOString() };

  // RESTAURARE AVATAR PERSISTENT INAINTE DE SALVARE
  const persistentKey = 'rgd_persistent_avatar_' + user.username.toLowerCase();
  const globalKey = 'rgb_global_persistent_avatar';
  const savedAvatar = localStorage.getItem(persistentKey) || localStorage.getItem(globalKey);
  if (savedAvatar && (!user.avatar || user.avatar === '👤' || user.avatar === 'default')) {
    user.avatar = savedAvatar;
  }

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
   7. LOGOUT — UNIFIED ASYNC (v13.0 Apex Sovereign)
───────────────────────────────────────────── */
window.authLogout = async function() {
  log('[Auth] Inițiere proces deconectare hibridă (Local + Cloud)...');

  // 1. Salvează datele curente înainte de logout
  const session = authGetSession();
  if (session) {
    try {
      authPersistUserData(session.username);
      // Dacă avem sistem de cloud sync, îl forțăm o ultimă dată pentru a nu pierde progresul
      if (typeof window.cloudPushData === 'function') {
        log('[Auth] Push final de date către cloud...');
        await window.cloudPushData();
      }
    } catch(e) {
      console.warn('[Auth] Eroare la salvarea datelor înainte de logout:', e);
    }
  }

  // 2. Firebase SignOut (Dacă SDK-ul e prezent și utilizatorul e logat în cloud)
  if (typeof fbAuth !== 'undefined' && fbAuth) {
    try {
      await fbAuth.signOut();
      log('[Auth] Sesiune Cloud (Firebase) închisă cu succes.');
    } catch(e) {
      console.error('[Auth] Eroare la deconectarea Firebase:', e);
    }
  }

  // 3. Android Native Logout (Bridge)
  if (window.Android && typeof window.Android.logout === 'function') {
    window.Android.logout();
    return;
  }

  // 4. Curățare sesiune și utilizator local (LocalStorage + SessionStorage)
  localStorage.removeItem('rgd_session');
  localStorage.removeItem('rgb_session');
  localStorage.removeItem('rgb_user');
  localStorage.removeItem('rgd_user');
  sessionStorage.removeItem('rgb_user');
  sessionStorage.removeItem('rgd_user');

  // 5. Reset Vizual Interfață
  const screen = document.getElementById('auth-screen');
  if (screen) {
    screen.style.display = 'flex';
    screen.classList.remove('hiding');
    // Reset formulare
    ['login-user','login-pass','reg-username','reg-email','reg-pass','reg-pass2'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    authHideError();
    authSwitchTab('login');
  }

  // 6. Redirecționare finală
  if (typeof navigateTo === 'function') {
    navigateTo('home', document.querySelector('.nav-btn[data-page="home"]'));
  } else {
    window.location.reload();
  }
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
  if (typeof buildProfilePage === 'function') {
    buildProfilePage(true);
  }
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
    if (hashStr(oldPass) !== user.passwordHash) return showEditError('Parola actuală este incorectă.');
    if (newPass.length < 6)                      return showEditError('Parola nouă — minim 6 caractere.');
    if (newPass !== newPass2)                    return showEditError('Parolele noi nu coincid.');
    user.passwordHash = hashStr(newPass);
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

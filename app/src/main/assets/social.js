/* ═══════════════════════════════════════════════════════════════
   social.js — Modulul Social Betting Network
   Versiune: v8.2 Elite Evolution
   Conține: Auth, Profile, Social Feed, XP Integration
═══════════════════════════════════════════════════════════════ */
'use strict';

const SK = {
  user:    'rgb_user',
  users:   'rgb_users_db',
  posts:   'rgb_social_feed',
  follows: 'rgb_follows',
  gamb:    'rgb_gamb_test',
};

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
window.authUpdateBtn = function(tab) {
  const id  = tab === 'login' ? 'login-tc' : 'reg-tc';
  const btn = tab === 'login' ? 'btn-login' : 'btn-register';
  const checked = document.getElementById(id)?.checked;
  const btnEl   = document.getElementById(btn);
  if (btnEl) btnEl.disabled = !checked;
};

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

window.authRegister = function() {
  const username = (document.getElementById('reg-username')?.value || '').trim();
  const email    = (document.getElementById('reg-email')?.value    || '').trim().toLowerCase();
  const pass     = (document.getElementById('reg-pass')?.value     || '');
  const tc       = document.getElementById('reg-tc')?.checked;
  if (!tc)                        return authShowError('Trebuie să accepți Termenii și Condițiile.');
  if (username.length < 3)        return authShowError('Username-ul trebuie să aibă minim 3 caractere.');
  const users = getUsers();
  const key   = username.toLowerCase();
  if (users[key]) return authShowError('Nume deja folosit.');
  const newUser = {
    username, displayName: username, email,
    passwordHash: hashStr(pass), avatar: 'default',
    privacy: 'public', joinedAt: new Date().toISOString(), xp: 0
  };
  users[key] = newUser;
  saveUsers(users);
  authOnSuccess(newUser);
};

window.authSkip = function() { authHideScreen(); };

function authOnSuccess(user) {
  saveCurrentUser(user);
  authHideScreen();
  authUpdateTopBar(user);
  if (typeof buildProfilePage === 'function') buildProfilePage(true);
}

function authHideScreen() {
  const screen = document.getElementById('auth-screen');
  if (screen) {
    screen.classList.add('hiding');
    setTimeout(() => { screen.style.display = 'none'; screen.classList.remove('hiding'); }, 400);
  }
}

function authShowScreen() {
  const screen = document.getElementById('auth-screen');
  if (screen) screen.style.display = 'flex';
}

function authUpdateTopBar(user) {
  const btn = document.getElementById('topUserBtn');
  const av = document.getElementById('topAvatar');
  const uname = document.getElementById('topUsername');
  if (!btn) return;
  if (user) {
    btn.style.display = 'flex';
    if (av) av.innerHTML = renderAvatarContent(user.avatar);
    if (uname) uname.textContent = user.username.toUpperCase().substring(0, 12);
  } else {
    btn.style.display = 'none';
  }
}

window.authLogout = function() {
  localStorage.removeItem(SK.user);
  authUpdateTopBar(null);
  authShowScreen();
  navigateTo('home', document.querySelector('.nav-btn[data-page="home"]'));
};

/* ═══════════════════════════════════════════════════════════════
   MODUL PROFIL — RE-BUILD (v8.2)
═══════════════════════════════════════════════════════════════ */
const AVATARS = ['👤','⚽','🏆','👑','🔥','💎','🦁','🐉','🌟','🎯','💥','🏅'];

window.renderAvatarContent = function(av) {
  if (!av || av === 'default' || av === '👤') return '👤';
  if (av.startsWith('data:') || av.startsWith('http')) {
    return `<img src="${av}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" />`;
  }
  return av;
};

window.buildProfilePage = function(force = false) {
  const page = document.getElementById('page-profile');
  if (!page) return;
  if (page._built && !force) return;
  page._built = true;

  const user = getCurrentUser();
  if (!user) {
    page.innerHTML = `<div class="prof-login-prompt"><div class="prof-login-icon">👤</div><div class="prof-login-title">PROFIL PERSONAL</div><button class="prof-action-btn" onclick="authShowScreen()">INTRĂ ÎN CONT</button></div>`;
    return;
  }

  const stats = calcUserStats();
  const avatarDisplay = renderAvatarContent(user.avatar);
  const joinDate = new Date(user.joinedAt || Date.now()).toLocaleDateString('ro-RO', { year:'numeric', month:'long' });
  const lvl = typeof getUserLevelData === 'function' ? getUserLevelData() : { level:1, xp:0, progressPct:0, progressXP:0, requiredXP:100 };

  page.innerHTML = `
    <div class="side-panel-close-btn" style="background: rgba(2,4,8,0.6); border:none;">
      <button onclick="navigateTo('home', null)"><i class="fa-solid fa-arrow-left"></i></button>
      <span style="font-family:'Cinzel'; letter-spacing:4px;">ACCOUNT ELITE</span>
    </div>

    <div class="prof-hero-modern">
      <div class="prof-avatar" id="profAvatarDisplay" onclick="profOpenAvatarPicker()">${avatarDisplay}</div>
      <div class="prof-name-container">
        <div class="prof-display-name">${user.displayName || user.username} ${typeof getVerificationBadge === 'function' ? getVerificationBadge(user.username) : ''}</div>
        <div class="prof-user-tag">@${user.username}</div>
      </div>

      <div class="xp-container" style="margin: 0 16px;">
        <div class="xp-header"><div class="xp-level-badge">LEVEL ${lvl.level}</div><div class="xp-total-text">${lvl.xp.toLocaleString()} XP</div></div>
        <div class="xp-bar-outer"><div class="xp-bar-inner" style="width: ${lvl.progressPct}%"></div></div>
        <div class="xp-footer"><span>RANK PROGRESSION</span><span>${lvl.progressXP} / ${lvl.requiredXP} XP</span></div>
      </div>
    </div>

    <div class="prof-stats-grid">
      <div class="prof-stat-card"><div class="prof-stat-val ${stats.profit >= 0 ? 'pos' : 'neg'}">${stats.profit >= 0 ? '+' : ''}${stats.profit.toFixed(0)}</div><div class="prof-stat-lbl">PROFIT (${typeof getCurrency === 'function' ? getCurrency() : 'RON'})</div></div>
      <div class="prof-stat-card"><div class="prof-stat-val" style="color:var(--nb)">${stats.wr}%</div><div class="prof-stat-lbl">WIN RATE</div></div>
      <div class="prof-stat-card"><div class="prof-stat-val">${stats.total}</div><div class="prof-stat-lbl">TICKETS</div></div>
    </div>

    <div class="prof-section-card">
      <div class="prof-section-title">CONFIGURATION</div>
      <div class="prof-row" onclick="profOpenEdit('currency')"><div class="prof-row-left"><div class="prof-row-icon gold"><i class="fa-solid fa-coins"></i></div><div class="prof-row-text"><span class="prof-row-label">Currency</span><span class="prof-row-sub">${typeof getCurrency === 'function' ? getCurrency() : 'RON'}</span></div></div><i class="fa-solid fa-chevron-right prof-row-arrow"></i></div>
      <div class="prof-row" onclick="profOpenEdit('displayName')"><div class="prof-row-left"><div class="prof-row-icon blue"><i class="fa-solid fa-id-card"></i></div><div class="prof-row-text"><span class="prof-row-label">Nickname</span><span class="prof-row-sub">${user.displayName || user.username}</span></div></div><i class="fa-solid fa-pen prof-row-arrow"></i></div>
      <div class="prof-row" onclick="profOpenEdit('password')"><div class="prof-row-left"><div class="prof-row-icon purple"><i class="fa-solid fa-shield-halved"></i></div><div class="prof-row-text"><span class="prof-row-label">Security</span><span class="prof-row-sub">Update Password</span></div></div><i class="fa-solid fa-chevron-right prof-row-arrow"></i></div>
    </div>

    <div class="prof-section-card">
      <div class="prof-section-title">CUSTOMIZATION</div>
      <div class="prof-row" onclick="profOpenAvatarPicker()"><div class="prof-row-left"><div class="prof-row-icon gold"><i class="fa-solid fa-wand-magic-sparkles"></i></div><div class="prof-row-text"><span class="prof-row-label">Profile Identity</span></div></div><span style="font-size:24px;">${avatarDisplay}</span></div>
      <div class="prof-theme-chips" id="profThemeChips" style="display:flex; justify-content:center; gap:8px; padding-top:10px;"></div>
    </div>

    <div class="prof-section-card">
      <div class="prof-section-title">SYSTEM & DATA</div>
      <div class="prof-row" onclick="exportAccountData()"><div class="prof-row-left"><div class="prof-row-icon green"><i class="fa-solid fa-cloud-arrow-up"></i></div><div class="prof-row-text"><span class="prof-row-label">Export Backup</span></div></div></div>
      <div class="prof-row" onclick="document.getElementById('import-data-input').click()"><div class="prof-row-left"><div class="prof-row-icon blue"><i class="fa-solid fa-cloud-arrow-down"></i></div><div class="prof-row-text"><span class="prof-row-label">Restore Data</span></div></div></div>
      <input type="file" id="import-data-input" accept="application/json" style="display:none;" onchange="importAccountData(event)"/>
    </div>

    <button class="prof-logout-btn" onclick="authLogout()"><i class="fa-solid fa-power-off"></i> TERMINATE SESSION</button>

    <!-- MODALS -->
    <div class="prof-edit-modal" id="profEditModal"><div class="prof-edit-box"><div class="prof-edit-title" id="profEditTitle">EDITARE</div><div class="auth-error" id="prof-edit-error"></div><div id="profEditBody"></div><div class="prof-edit-actions"><button class="prof-edit-cancel" onclick="profCloseEdit()">ANULEAZĂ</button><button class="prof-edit-save" onclick="profSaveEdit()">SALVEAZĂ</button></div></div></div>
    <div class="prof-avatar-modal" id="profAvatarModal"><div class="prof-avatar-box"><div class="prof-edit-title">ALEGE AVATAR</div><button class="prof-action-btn" style="width:100%; margin-bottom: 16px; font-size: 11px;" onclick="document.getElementById('profAvatarInput').click()"><i class="fa-solid fa-upload"></i> ÎNCARCĂ FOTO</button><input type="file" id="profAvatarInput" accept="image/*" style="display:none" onchange="profHandleFileUpload(event)"/><div class="prof-avatar-grid">${AVATARS.map(a => `<button class="prof-av-option" onclick="profSelectAvatar('${a}')">${a}</button>`).join('')}</div><button class="prof-edit-cancel" style="width:100%;margin-top:12px" onclick="profCloseAvatarPicker()">ÎNCHIDE</button></div></div>
  `;
  profBuildThemeChips();
};

function calcUserStats() {
  let bets = [];
  try { bets = JSON.parse(localStorage.getItem('rgb_bets') || '[]'); } catch {}
  const settled = bets.filter(b => b.status === 'win' || b.status === 'loss' || b.status === 'cashout');
  let wins = 0, profit = 0;
  settled.forEach(b => {
    const s = parseFloat(b.stake || 0), o = parseFloat(b.totalOdds || b.odds || 1);
    if (b.status === 'win') { wins++; profit += s * (o - 1); }
    if (b.status === 'loss') profit -= s;
    if (b.status === 'cashout') profit += (b.cashoutAmount - s);
  });
  return { total: bets.length, settled: settled.length, wins, wr: settled.length ? Math.round((wins / settled.length) * 100) : 0, profit };
}

function profBuildThemeChips() {
  const wrap = document.getElementById('profThemeChips');
  if (!wrap || typeof window.THEMES === 'undefined') return;
  wrap.innerHTML = window.THEMES.map(t => `<button class="prof-theme-chip" style="width:40px;height:40px;border-radius:10px;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.05);color:#fff;" onclick="profApplyTheme('${t.id}')">${t.icon}</button>`).join('');
}

window.profApplyTheme = function(id) {
  const t = window.THEMES.find(x => x.id === id);
  if (t && typeof applyTheme === 'function') applyTheme(t);
};

/* -- EDIT LOGIC -- */
window.profOpenEdit = function(type) {
  window._currentEditType = type;
  const modal = document.getElementById('profEditModal');
  const body = document.getElementById('profEditBody');
  const title = document.getElementById('profEditTitle');
  if (!modal || !body) return;

  if (type === 'displayName') {
    title.textContent = 'SET NICKNAME';
    body.innerHTML = `<input id="edit-displayname-new" type="text" class="auth-input" style="padding-left:15px;" placeholder="Nume nou..."/>`;
  } else if (type === 'currency') {
    title.textContent = 'CURRENCY';
    body.innerHTML = `<select id="edit-currency-select" class="auth-input" style="padding-left:15px; background:#0d1117;"><option value="auto">Auto</option><option value="RON">RON</option><option value="EUR">EUR</option><option value="USD">USD</option></select>`;
  } else if (type === 'password') {
    title.textContent = 'PASSWORD';
    body.innerHTML = `<input id="edit-pass-old" type="password" class="auth-input" style="padding-left:15px; margin-bottom:10px;" placeholder="Parola veche"/><input id="edit-pass-new" type="password" class="auth-input" style="padding-left:15px;" placeholder="Parola noua"/>`;
  }
  modal.classList.add('open');
};
window.profCloseEdit = function() { document.getElementById('profEditModal')?.classList.remove('open'); };
window.profSaveEdit = function() {
  const user = getCurrentUser();
  if (!user) return;
  if (window._currentEditType === 'displayName') {
    user.displayName = document.getElementById('edit-displayname-new').value;
  } else if (window._currentEditType === 'currency') {
    if (typeof setManualCurrency === 'function') setManualCurrency(document.getElementById('edit-currency-select').value);
  }
  saveCurrentUser(user);
  profCloseEdit();
  buildProfilePage(true);
};

window.profOpenAvatarPicker = function() { document.getElementById('profAvatarModal')?.classList.add('open'); };
window.profCloseAvatarPicker = function() { document.getElementById('profAvatarModal')?.classList.remove('open'); };
window.profSelectAvatar = function(av) {
  const user = getCurrentUser();
  if (user) { user.avatar = av; saveCurrentUser(user); buildProfilePage(true); authUpdateTopBar(user); }
  profCloseAvatarPicker();
};
window.profHandleFileUpload = function(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => profSelectAvatar(ev.target.result);
  reader.readAsDataURL(file);
};

/* ═══════════════════════════════════════════════════════════════
   MODUL SOCIAL — Feed & Rank
═══════════════════════════════════════════════════════════════ */
window.buildSocialPage = function() {
  const page = document.getElementById('page-social');
  if (!page) return;
  page.innerHTML = `
    <div class="page-top-title"><i class="fa-solid fa-users" style="color:var(--ng)"></i><span>SOCIAL FEED</span></div>
    <div class="soc-action-bar">
      <button class="soc-tab active" id="soc-tab-feed" onclick="socSwitchTab('feed')"><i class="fa-solid fa-fire"></i> FEED</button>
      <button class="soc-tab" id="soc-tab-rank" onclick="socSwitchTab('rank')"><i class="fa-solid fa-trophy"></i> RANK</button>
      <button class="soc-tab" id="soc-tab-search" onclick="socSwitchTab('search')"><i class="fa-solid fa-magnifying-glass"></i> CAUTĂ</button>
    </div>
    <div id="soc-panel-feed" class="soc-panel active"><div id="soc-feed-list"></div></div>
    <div id="soc-panel-rank" class="soc-panel"><div id="soc-rank-list"></div></div>
    <div id="soc-panel-search" class="soc-panel"><div class="soc-search-wrap"><input class="auth-input" id="soc-search-inp" type="text" placeholder="Caută utilizatori..." oninput="socSearch(this.value)" style="padding-left:15px;"/></div><div id="soc-search-results"></div></div>
  `;
  socRenderFeed();
};

window.socSwitchTab = function(tab) {
  document.querySelectorAll('.soc-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.soc-panel').forEach(p => p.classList.remove('active'));
  document.getElementById('soc-tab-' + tab).classList.add('active');
  document.getElementById('soc-panel-' + tab).classList.add('active');
  if (tab === 'rank') socRenderLeaderboard();
};

function socRenderLeaderboard() {
  const list = document.getElementById('soc-rank-list');
  if (!list) return;
  const users = getUsers();
  const allPosts = getPosts();
  const rankings = Object.values(users).map(u => {
    const userPosts = allPosts.filter(p => p.author?.toLowerCase() === u.username.toLowerCase());
    const settled = userPosts.filter(p => p.status === 'win' || p.status === 'loss');
    const wins = settled.filter(p => p.status === 'win').length;
    const wr = settled.length >= 3 ? Math.round((wins / settled.length) * 100) : 0;
    let profit = 0;
    settled.forEach(p => { const s = parseFloat(p.stake||0), o = parseFloat(p.odds||1); if (p.status === 'win') profit += s*(o-1); else profit -= s; });
    return { username: u.username, avatar: u.avatar, wr, profit, total: settled.length, score: (wr * 0.6) + (profit * 0.2) + (settled.length * 0.2) };
  }).filter(r => r.total >= 3).sort((a,b) => b.score - a.score);

  if (!rankings.length) { list.innerHTML = `<div class="soc-empty">Minim 3 bilete necesare pentru rank.</div>`; return; }
  const curr = typeof getCurrency === 'function' ? getCurrency() : 'RON';
  list.innerHTML = rankings.map((r, i) => `
    <div class="soc-user-card" onclick="viewUserProfile('${r.username}')">
      <div style="font-weight:700; width:20px;">${i+1}</div>
      <div class="soc-post-avatar">${renderAvatarContent(r.avatar)}</div>
      <div style="flex:1;">
        <div class="soc-post-author">@${r.username} ${typeof getVerificationBadge === 'function' ? getVerificationBadge(r.username) : ''}</div>
        <div class="soc-post-date">${r.wr}% WR • ${r.profit.toFixed(0)} ${curr}</div>
      </div>
    </div>`).join('');
}

function socRenderFeed() {
  const list = document.getElementById('soc-feed-list');
  if (!list) return;
  const posts = getPosts().sort((a,b) => b.postedAt - a.postedAt);
  if (!posts.length) { list.innerHTML = `<div class="soc-empty">Feed-ul este gol.</div>`; return; }
  list.innerHTML = posts.map(p => `
    <div class="soc-post-card">
      <div class="soc-post-header">
        <div class="soc-post-avatar">${renderAvatarContent(getUsers()[p.author?.toLowerCase()]?.avatar)}</div>
        <div class="soc-post-meta"><div class="soc-post-author">@${p.author}</div><div class="soc-post-date">${new Date(p.postedAt).toLocaleTimeString()}</div></div>
        <div class="soc-post-status">${p.status.toUpperCase()}</div>
      </div>
      <div class="soc-post-title">${p.name}</div>
      <div class="soc-post-footer"><div>@${parseFloat(p.totalOdds).toFixed(2)}</div></div>
    </div>`).join('');
}

window.socSearch = function(q) {
  const res = document.getElementById('soc-search-results');
  if (!res || !q) { if(res) res.innerHTML = ''; return; }
  const matches = Object.values(getUsers()).filter(u => u.username.toLowerCase().includes(q.toLowerCase()));
  res.innerHTML = matches.map(u => `<div class="soc-user-card" onclick="viewUserProfile('${u.username}')"><div class="soc-post-avatar">${renderAvatarContent(u.avatar)}</div><div>@${u.username}</div></div>`).join('');
};

/* ── PRIVACY HELPERS (Keep for logic) ── */
function privacyIcon(p) { return '🌐'; }
function privacyLabel(p) { return 'Public'; }
function privacyDesc(p) { return ''; }

(function init() {
  const user = getCurrentUser();
  if (user) authUpdateTopBar(user);
})();

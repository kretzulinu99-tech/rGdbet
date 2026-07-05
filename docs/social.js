/* ═══════════════════════════════════════════════════════════════
   social.js — Modulul Social Betting Network
   Versiune: v8.5 Elite Evolution
   Conține: Auth, Profile Modern, Social Feed, Rank System
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

/* ── AUTH HELPERS ── */
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
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  const pct   = (score / 3) * 100;
  fill.style.width = pct + '%';
  fill.style.background = score <= 1 ? '#ff3366' : score <= 2 ? '#ffcc00' : '#00ff88';
};

window.authSwitchTab = function(tab) {
  document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.auth-panel').forEach(p => p.classList.remove('active'));
  document.getElementById('tab-' + tab)?.classList.add('active');
  document.getElementById('panel-' + tab)?.classList.add('active');
};

function authShowError(msg) {
  const el = document.getElementById('auth-error');
  if (el) { el.textContent = msg; el.className = 'auth-error' + (msg ? ' show' : ''); }
}

window.authLogin = function() {
  const raw  = (document.getElementById('login-user')?.value || '').trim().toLowerCase();
  const pass = (document.getElementById('login-pass')?.value || '');
  const users = getUsers();
  const user  = users[raw] || Object.values(users).find(u => u.email?.toLowerCase() === raw);
  if (!user || user.passwordHash !== hashStr(pass)) return authShowError('Date incorecte.');
  authOnSuccess(user);
};

window.authRegister = function() {
  const username = (document.getElementById('reg-username')?.value || '').trim();
  const email    = (document.getElementById('reg-email')?.value    || '').trim().toLowerCase();
  const pass     = (document.getElementById('reg-pass')?.value     || '');
  const users = getUsers();
  if (users[username.toLowerCase()]) return authShowError('Utilizator existent.');
  const newUser = {
    username, displayName: username, email,
    passwordHash: hashStr(pass), avatar: '👤',
    privacy: 'public', joinedAt: new Date().toISOString(), xp: 0
  };
  users[username.toLowerCase()] = newUser;
  saveUsers(users);
  authOnSuccess(newUser);
};

window.authSkip = function() { authHideScreen(); };

function authOnSuccess(user) {
  saveCurrentUser(user);
  authHideScreen();
  authUpdateTopBar(user);
  buildProfilePage(true);
}

function authHideScreen() {
  const s = document.getElementById('auth-screen');
  if (s) { s.classList.add('hiding'); setTimeout(() => { s.style.display = 'none'; s.classList.remove('hiding'); }, 400); }
}

function authShowScreen() {
  const s = document.getElementById('auth-screen');
  if (s) s.style.display = 'flex';
}

function authUpdateTopBar(user) {
  const btn = document.getElementById('topUserBtn');
  const uname = document.getElementById('topUsername');
  const av = document.getElementById('topAvatar');
  if (!btn) return;
  if (user) {
    btn.style.display = 'flex';
    if (uname) uname.textContent = (user.displayName || user.username).toUpperCase();
    if (av) av.innerHTML = renderAvatarContent(user.avatar);
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

/* ── MODUL PROFIL MODERN (v8.5) ── */
const AVATARS = ['👤','⚽','🏆','👑','🔥','💎','🦁','🐉','🌟','🎯','💥','🏅'];

window.renderAvatarContent = function(av) {
  if (!av || av === 'default' || av === '👤') return '👤';
  if (av.startsWith('data:') || av.startsWith('http')) return `<img src="${av}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" />`;
  return av;
};

window.buildProfilePage = function(force = false) {
  const page = document.getElementById('page-profile');
  if (!page) return;

  const user = getCurrentUser();
  if (!user) {
    page.innerHTML = `<div class="prof-login-prompt"><div class="prof-login-icon">👤</div><div class="prof-login-title">LOGIN REQUIRED</div><button class="prof-action-btn" onclick="authShowScreen()">INTRĂ ÎN CONT</button></div>`;
    page._built = false;
    return;
  }

  // Dacă pagina este deja construită, actualizăm doar datele dinamice și ieșim (pentru viteză/animatii)
  if (page._built && !force) {
    updateXPUI();
    updateProfileStatsUI();
    return;
  }

  page._built = true;
  const stats = calcUserStats();

  // Asigurăm că tragem XP-ul corect (prioritate cheia dedicată pentru persistență)
  const savedXp = parseInt(localStorage.getItem('rgb_xp')) || user.xp || 0;
  const lvl = typeof getUserLevelData === 'function' ? getUserLevelData(savedXp) : { level:1, xp:0, progressPct:0, progressXP:0, requiredXP:100 };

  const avDisplay = renderAvatarContent(user.avatar);

  page.innerHTML = `
    <div class="side-panel-close-btn" style="background:rgba(2,4,8,0.5); border:none;">
      <button onclick="navigateTo('home', null)"><i class="fa-solid fa-arrow-left"></i></button>
      <span style="font-family:'Cinzel'; letter-spacing:3px;">ELITE ACCOUNT</span>
    </div>

    <div class="prof-hero-modern">
      <div class="prof-avatar-modern" id="profAvatarDisplay" onclick="profOpenAvatarPicker()">${avDisplay}</div>
      <div class="prof-name-container">
        <div class="prof-display-name" id="profDisplayNameUI">${user.displayName || user.username} ${typeof getVerificationBadge === 'function' ? getVerificationBadge(user.username) : ''}</div>
        <div class="prof-user-tag">@${user.username}</div>
      </div>

      <!-- XP BAR (RANK PROGRESS) -->
      <div class="xp-container" id="xpContainerUI">
        <div class="xp-header">
          <div class="xp-level-badge" id="xpLevelBadgeUI">LVL ${lvl.level}</div>
          <div class="xp-total-text" id="xpTotalTextUI">${savedXp.toLocaleString()} XP</div>
        </div>
        <div class="xp-bar-outer">
          <div class="xp-bar-inner" id="xpBarInnerUI" style="width:${lvl.progressPct}%"></div>
        </div>
        <div class="xp-footer">
          <span>RANK PROGRESS</span>
          <span id="xpProgressTextUI">${lvl.progressXP} / ${lvl.requiredXP} XP</span>
        </div>
      </div>
    </div>

    <div class="prof-stats-grid" id="profStatsGridUI">
      <div class="prof-stat-card"><div class="prof-stat-val ${stats.profit >= 0 ? 'pos' : 'neg'}" id="profStatProfitUI">${stats.profit >= 0 ? '+' : ''}${stats.profit.toFixed(0)}</div><div class="prof-stat-lbl">PROFIT</div></div>
      <div class="prof-stat-card"><div class="prof-stat-val" style="color:var(--nb)" id="profStatWRUI">${stats.wr}%</div><div class="prof-stat-lbl">WR</div></div>
      <div class="prof-stat-card"><div class="prof-stat-val" id="profStatTotalUI">${stats.total}</div><div class="prof-stat-lbl">TICKETS</div></div>
    </div>

    <div class="prof-section-card">
      <div class="prof-section-title">CONFIG</div>
      <div class="prof-row" onclick="profOpenEdit('currency')"><div class="prof-row-left"><div class="prof-row-icon gold"><i class="fa-solid fa-coins"></i></div><div class="prof-row-text"><span class="prof-row-label">Currency</span><span class="prof-row-sub" id="profCurrencySubUI">${typeof getCurrency === 'function' ? getCurrency() : 'RON'}</span></div></div><i class="fa-solid fa-chevron-right prof-row-arrow"></i></div>
      <div class="prof-row" onclick="profOpenEdit('displayName')"><div class="prof-row-left"><div class="prof-row-icon blue"><i class="fa-solid fa-id-card"></i></div><div class="prof-row-text"><span class="prof-row-label">Nickname</span><span class="prof-row-sub" id="profNicknameSubUI">${user.displayName || user.username}</span></div></div><i class="fa-solid fa-pen prof-row-arrow"></i></div>
    </div>

    <div class="prof-section-card">
      <div class="prof-section-title">SECURITY & DATA</div>
      <div class="prof-row" onclick="exportAccountData()"><div class="prof-row-left"><div class="prof-row-icon green"><i class="fa-solid fa-cloud-arrow-up"></i></div><div class="prof-row-text"><span class="prof-row-label">Cloud Backup</span></div></div></div>
      <div class="prof-row" onclick="authLogout()"><div class="prof-row-left"><div class="prof-row-icon red"><i class="fa-solid fa-power-off"></i></div><div class="prof-row-text"><span class="prof-row-label">Log Out</span></div></div></div>
    </div>

    <!-- MODALS -->
    <div class="prof-edit-modal" id="profEditModal"><div class="prof-edit-box"><div class="prof-edit-title" id="profEditTitle">EDIT</div><div class="auth-error" id="prof-edit-error"></div><div id="profEditBody"></div><div class="prof-edit-actions"><button class="prof-edit-cancel" onclick="profCloseEdit()">CANCEL</button><button class="prof-edit-save" onclick="profSaveEdit()">SAVE</button></div></div></div>
    <div class="prof-avatar-modal" id="profAvatarModal"><div class="prof-avatar-box"><div class="prof-edit-title">AVATAR</div><div class="prof-avatar-grid">${AVATARS.map(a => `<button class="prof-av-option" onclick="profSelectAvatar('${a}')">${a}</button>`).join('')}</div><button class="prof-edit-cancel" style="width:100%" onclick="profCloseAvatarPicker()">CLOSE</button></div></div>
  `;
};

function calcUserStats() {
  const bets = JSON.parse(localStorage.getItem('rgb_bets') || '[]');
  const settled = bets.filter(b => b.status === 'win' || b.status === 'loss' || b.status === 'cashout');
  let wins = 0, profit = 0;
  settled.forEach(b => {
    const s = parseFloat(b.stake || 0), o = parseFloat(b.totalOdds || b.odds || 1);
    if (b.status === 'win') { wins++; profit += s * (o - 1); }
    else if (b.status === 'loss') profit -= s;
    else if (b.status === 'cashout') profit += (b.cashoutAmount - s);
  });
  return { total: bets.length, settled: settled.length, wins, wr: settled.length ? Math.round((wins / settled.length) * 100) : 0, profit };
}

/**
 * Actualizează doar valorile de stats din UI (fără re-render)
 */
function updateProfileStatsUI() {
  const stats = calcUserStats();
  const profitEl = document.getElementById('profStatProfitUI');
  const wrEl = document.getElementById('profStatWRUI');
  const totalEl = document.getElementById('profStatTotalUI');

  if (profitEl) {
    const val = (stats.profit >= 0 ? '+' : '') + stats.profit.toFixed(0);
    profitEl.textContent = val;
    profitEl.className = 'prof-stat-val ' + (stats.profit >= 0 ? 'pos' : 'neg');

    // Scalare dinamică font (v9.0)
    let fs = 16; // base prof
    if (val.length > 8)  fs = 14;
    if (val.length > 10) fs = 12;
    if (val.length > 13) fs = 10;
    profitEl.style.fontSize = fs + 'px';
  }
  if (wrEl) wrEl.textContent = stats.wr + '%';
  if (totalEl) totalEl.textContent = stats.total;

  const currSub = document.getElementById('profCurrencySubUI');
  if (currSub && typeof getCurrency === 'function') currSub.textContent = getCurrency();

  const nickSub = document.getElementById('profNicknameSubUI');
  const user = getCurrentUser();
  if (nickSub && user) nickSub.textContent = user.displayName || user.username;
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

/**
 * Actualizează instantaneu bara de XP din UI fără a re-randa toată pagina.
 * Apelat din gamification.js
 */
window.updateXPUI = function() {
  const user = getCurrentUser();
  if (!user) return;

  const savedXp = parseInt(localStorage.getItem('rgb_xp')) || user.xp || 0;
  if (typeof getUserLevelData !== 'function') return;

  const lvl = getUserLevelData(savedXp);

  const badge = document.getElementById('xpLevelBadgeUI');
  const totalText = document.getElementById('xpTotalTextUI');
  const barInner = document.getElementById('xpBarInnerUI');
  const progressText = document.getElementById('xpProgressTextUI');

  if (badge) badge.textContent = `LVL ${lvl.level}`;
  if (totalText) totalText.textContent = `${savedXp.toLocaleString()} XP`;
  if (barInner) barInner.style.width = `${lvl.progressPct}%`;
  if (progressText) progressText.textContent = `${lvl.progressXP} / ${lvl.requiredXP} XP`;
};

/* -- EDIT LOGIC -- */
window.profOpenEdit = function(type) {
  window._currentEditType = type;
  const modal = document.getElementById('profEditModal');
  const body = document.getElementById('profEditBody');
  const title = document.getElementById('profEditTitle');
  if (!modal || !body) return;
  if (type === 'displayName') { title.textContent = 'SET NICKNAME'; body.innerHTML = `<input id="edit-displayname-new" type="text" class="auth-input" style="padding-left:15px;" placeholder="New name..."/>`; }
  else if (type === 'currency') { title.textContent = 'CURRENCY'; body.innerHTML = `<select id="edit-currency-select" class="auth-input" style="padding-left:15px; background:#0d1117;"><option value="auto">Auto</option><option value="RON">RON</option><option value="EUR">EUR</option><option value="USD">USD</option></select>`; }
  modal.classList.add('open');
};
window.profCloseEdit = function() { document.getElementById('profEditModal')?.classList.remove('open'); };
window.profSaveEdit = function() {
  const user = getCurrentUser();
  if (!user) return;
  if (window._currentEditType === 'displayName') user.displayName = document.getElementById('edit-displayname-new').value;
  else if (window._currentEditType === 'currency') if (typeof setManualCurrency === 'function') setManualCurrency(document.getElementById('edit-currency-select').value);
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

/* ── SOCIAL FEED & RANK (simplified) ── */
window.buildSocialPage = function() {
  const page = document.getElementById('page-social');
  if (!page) return;
  page.innerHTML = `<div class="page-top-title"><i class="fa-solid fa-users" style="color:var(--ng)"></i><span>SOCIAL FEED</span></div><div class="soc-action-bar"><button class="soc-tab active" id="soc-tab-feed" onclick="socSwitchTab('feed')"><i class="fa-solid fa-fire"></i> FEED</button><button class="soc-tab" id="soc-tab-rank" onclick="socSwitchTab('rank')"><i class="fa-solid fa-trophy"></i> RANK</button></div><div id="soc-panel-feed" class="soc-panel active"><div id="soc-feed-list"></div></div><div id="soc-panel-rank" class="soc-panel"><div id="soc-rank-list"></div></div>`;
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
    return { username: u.username, avatar: u.avatar, wr, total: settled.length, score: (wr * 0.7) + (settled.length * 0.3) };
  }).filter(r => r.total >= 3).sort((a,b) => b.score - a.score);
  if (!rankings.length) { list.innerHTML = `<div class="soc-empty">Minimum 3 tickets needed for rank.</div>`; return; }
  list.innerHTML = rankings.map((r, i) => `<div class="soc-user-card"><div style="font-weight:700; width:20px;">${i+1}</div><div class="soc-post-avatar">${renderAvatarContent(r.avatar)}</div><div style="flex:1;"><div class="soc-post-author">@${r.username} ${typeof getVerificationBadge === 'function' ? getVerificationBadge(r.username) : ''}</div><div class="soc-post-date">${r.wr}% WR • ${r.total} tickets</div></div></div>`).join('');
}

function socRenderFeed() {
  const list = document.getElementById('soc-feed-list');
  if (!list) return;
  const posts = getPosts().sort((a,b) => b.postedAt - a.postedAt);
  if (!posts.length) { list.innerHTML = `<div class="soc-empty">Feed is empty.</div>`; return; }
  list.innerHTML = posts.map(p => `<div class="soc-post-card"><div class="soc-post-header"><div class="soc-post-avatar">${renderAvatarContent(getUsers()[p.author?.toLowerCase()]?.avatar)}</div><div class="soc-post-meta"><div class="soc-post-author">@${p.author}</div><div class="soc-post-date">${new Date(p.postedAt).toLocaleTimeString()}</div></div></div><div class="soc-post-title">${p.name}</div></div>`).join('');
}

window.socSearch = function(q) {
  const res = document.getElementById('soc-search-results');
  if (!res || !q) return;
  const matches = Object.values(getUsers()).filter(u => u.username.toLowerCase().includes(q.toLowerCase()));
  res.innerHTML = matches.map(u => `<div class="soc-user-card"><div class="soc-post-avatar">${renderAvatarContent(u.avatar)}</div><div>@${u.username}</div></div>`).join('');
};

/* ── PRIVACY & VERIFICATION (legacy) ── */
window.getVerificationBadge = function(username) {
  const posts = getPosts().filter(p => p.author?.toLowerCase() === username.toLowerCase());
  const wins = posts.filter(p => p.status === 'win').length;
  if (posts.length >= 5 && (wins/posts.length) > 0.5) return `<i class="fa-solid fa-circle-check" style="color:var(--nb); font-size:10px; margin-left:4px;"></i>`;
  return '';
};
function privacyIcon(p) { return '🌐'; }
function privacyLabel(p) { return 'Public'; }
function privacyDesc(p) { return ''; }

(function init() {
  const user = getCurrentUser();
  if (user) authUpdateTopBar(user);
})();

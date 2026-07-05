/* ═══════════════════════════════════════════════════════════════
   social.js — Modulul Social Betting Network
   Versiune: v10.0 Sovereign Edition
   Conține: Auth, Profile, Social Feed, Rank, Highlights, Fix Logout
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

/**
 * 🛠️ DECONECTARE SECURIZATĂ (HARD RESET)
 * Șterge toate cheile de sesiune și forțează reîncărcarea aplicației
 * pentru a preveni auto-login-ul din cloud-sync sau firebase.
 */
window.authLogout = function() {
  console.log('[Auth] Inițiere deconectare completă...');

  // 1. Ștergem toate urmele locale ale sesiunii
  localStorage.removeItem(SK.user);
  localStorage.removeItem('rgb_auth_seen');
  localStorage.removeItem('rgd_session');
  localStorage.removeItem('rgb_session');

  // 2. Resetăm vizual interfața (fallback dacă redirect-ul întârzie)
  authUpdateTopBar(null);

  // 3. Forțăm afișarea ecranului de login imediat
  authShowScreen();

  // 4. Navigăm la pagina principală
  if (typeof navigateTo === 'function') {
    navigateTo('home', document.querySelector('.nav-btn[data-page="home"]'));
  }

  // 5. Dacă există Firebase, declanșăm signOut (va fi captat de firebase-auth.js)
  // Folosim un delay mic pentru a permite executarea altor hook-uri de logout
  setTimeout(() => {
    // REÎNCĂRCARE PAGINĂ (Hard Reset): Singura metodă sigură de a curăța starea JS a aplicației
    location.reload();
  }, 100);
};

/* ── MODUL PROFIL MODERN ── */
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

  if (page._built && !force) {
    updateXPUI();
    updateProfileStatsUI();
    return;
  }

  page._built = true;
  const stats = calcUserStats();
  const savedXp = parseInt(localStorage.getItem('rgb_xp')) || user.xp || 0;
  const lvl = typeof getUserLevelData === 'function' ? getUserLevelData(savedXp) : { level:1, xp:0, progressPct:0, progressXP:0, requiredXP:100 };
  const avDisplay = renderAvatarContent(user.avatar);
  const globalRankData = calcGlobalRank(user.username, savedXp, stats);

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
        <div style="margin-top:8px;">
          <span class="xp-level-badge" style="background:linear-gradient(135deg, var(--gold), #aa771c); box-shadow:0 0 15px rgba(255,204,0,0.3);">
            <i class="fa-solid fa-earth-europe"></i> RANK #${globalRankData.rank} / ${globalRankData.total}
          </span>
        </div>
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

      <!-- DEVELOPER TESTING BUTTON -->
      <div class="prof-row" onclick="devGrantMaxXP()" style="border-color:var(--gold); background:rgba(255,204,0,0.05);">
        <div class="prof-row-left">
          <div class="prof-row-icon gold"><i class="fa-solid fa-code"></i></div>
          <div class="prof-row-text"><span class="prof-row-label" style="color:var(--gold);">ELITE DEV MODE</span><span class="prof-row-sub">Deblochează Nivelul 120 (Test)</span></div>
        </div>
      </div>

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

function updateProfileStatsUI() {
  const stats = calcUserStats();
  const profitEl = document.getElementById('profStatProfitUI');
  const wrEl = document.getElementById('profStatWRUI');
  const totalEl = document.getElementById('profStatTotalUI');
  if (profitEl) {
    const val = (stats.profit >= 0 ? '+' : '') + stats.profit.toFixed(0);
    profitEl.textContent = val;
    profitEl.className = 'prof-stat-val ' + (stats.profit >= 0 ? 'pos' : 'neg');
    let fs = 15; const len = val.length;
    if (len > 6) fs = 13; if (len > 8) fs = 11; if (len > 10) fs = 9; if (len > 12) fs = 8;
    profitEl.style.fontSize = fs + 'px';
    profitEl.style.whiteSpace = 'nowrap'; profitEl.style.overflow = 'hidden';
  }
  if (wrEl) wrEl.textContent = stats.wr + '%';
  if (totalEl) totalEl.textContent = stats.total;
  const currSub = document.getElementById('profCurrencySubUI');
  if (currSub && typeof getCurrency === 'function') currSub.textContent = getCurrency();
  const nickSub = document.getElementById('profNicknameSubUI');
  const user = getCurrentUser();
  if (nickSub && user) nickSub.textContent = user.displayName || user.username;
}

function calcGlobalRank(currentUsername, currentXP, currentStats) {
  const users = getUsers();
  const allPosts = getPosts();
  const leaderboard = Object.values(users).map(u => {
    if (u.username.toLowerCase() === currentUsername.toLowerCase()) {
      return { username: u.username, score: (currentXP * 0.5) + (currentStats.wr * 10) + (currentStats.profit * 0.1) };
    }
    const uPosts = allPosts.filter(p => p.author?.toLowerCase() === u.username.toLowerCase());
    const uSettled = uPosts.filter(p => p.status === 'win' || p.status === 'loss' || p.status === 'cashout');
    const uWins = uSettled.filter(p => p.status === 'win').length;
    const uWR = uSettled.length ? (uWins / uSettled.length) * 100 : 0;
    let uProfit = 0;
    uSettled.forEach(p => {
      const s = parseFloat(p.stake || 10), o = parseFloat(p.totalOdds || p.odds || 1);
      if (p.status === 'win') uProfit += s * (o - 1);
      else if (p.status === 'loss') uProfit -= s;
      else if (p.status === 'cashout') uProfit += (p.cashoutAmount - s);
    });
    return { username: u.username, score: ((u.xp || 0) * 0.5) + (uWR * 10) + (uProfit * 0.1) };
  });
  leaderboard.sort((a, b) => b.score - a.score);
  const rankIndex = leaderboard.findIndex(u => u.username.toLowerCase() === currentUsername.toLowerCase());
  return { rank: rankIndex !== -1 ? rankIndex + 1 : leaderboard.length, total: leaderboard.length };
}

window.updateXPUI = function() {
  const user = getCurrentUser(); if (!user) return;
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
  const user = getCurrentUser(); if (!user) return;
  if (window._currentEditType === 'displayName') user.displayName = document.getElementById('edit-displayname-new').value;
  else if (window._currentEditType === 'currency') if (typeof setManualCurrency === 'function') setManualCurrency(document.getElementById('edit-currency-select').value);
  saveCurrentUser(user); profCloseEdit(); buildProfilePage(true);
};

window.profOpenAvatarPicker = function() { document.getElementById('profAvatarModal')?.classList.add('open'); };
window.profCloseAvatarPicker = function() { document.getElementById('profAvatarModal')?.classList.remove('open'); };
window.profSelectAvatar = function(av) {
  const user = getCurrentUser();
  if (user) { user.avatar = av; saveCurrentUser(user); buildProfilePage(true); authUpdateTopBar(user); }
  profCloseAvatarPicker();
};

/* ── SOCIAL FEED & RANK ── */
window.buildSocialPage = function() {
  const page = document.getElementById('page-social'); if (!page) return;
  const user = getCurrentUser();
  page.innerHTML = `
    <div class="page-top-title"><i class="fa-solid fa-users" style="color:var(--ng)"></i><span>SOCIAL FEED</span></div>
    <div class="soc-action-bar">
      <button class="soc-tab active" id="soc-tab-feed" onclick="socSwitchTab('feed')"><i class="fa-solid fa-fire"></i> FEED</button>
      <button class="soc-tab" id="soc-tab-rank" onclick="socSwitchTab('rank')"><i class="fa-solid fa-trophy"></i> RANK</button>
      <button class="soc-tab" id="soc-tab-search" onclick="socSwitchTab('search')"><i class="fa-solid fa-magnifying-glass"></i> CAUTĂ</button>
    </div>
    ${user ? `<div style="padding:10px 16px 0;"><button class="soc-post-btn" onclick="socOpenPostPicker()"><i class="fa-solid fa-share-from-square"></i> POSTEAZĂ BILETE</button></div>` : ''}
    <div id="soc-panel-feed" class="soc-panel active"><div id="soc-feed-list"></div></div>
    <div id="soc-panel-rank" class="soc-panel"><div id="soc-rank-list"></div></div>
    <div id="soc-panel-search" class="soc-panel"><div class="soc-search-wrap"><input class="auth-input" id="soc-search-inp" type="text" placeholder="Caută utilizatori..." oninput="socSearch(this.value)" style="padding-left:15px;"/></div><div id="soc-search-results"></div></div>
    <div class="prof-avatar-modal" id="socPickModal"><div class="prof-avatar-box" style="max-width:440px;"><div class="prof-edit-title">ALEGE BILETELE</div><div id="socPickList" style="max-height:300px; overflow-y:auto; display:flex; flex-direction:column; gap:8px; margin:15px 0;"></div><div class="prof-edit-actions"><button class="prof-edit-cancel" onclick="socClosePostPicker()">ANULEAZĂ</button><button class="prof-edit-save" onclick="socConfirmPost()">POSTEAZĂ SELECȚIA</button></div></div></div>
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

window.socToggleFollow = function(targetUsername, btn) {
  const user = getCurrentUser(); if (!user) return authShowScreen();
  const follows = getFollows();
  const myKey = user.username.toLowerCase();
  const targetKey = targetUsername.toLowerCase();
  if (!follows[myKey]) follows[myKey] = [];
  const idx = follows[myKey].indexOf(targetKey);
  if (idx >= 0) { follows[myKey].splice(idx, 1); if(btn) btn.innerHTML = '<i class="fa-solid fa-user-plus"></i> Urmărește'; }
  else {
    follows[myKey].push(targetKey); if(btn) btn.innerHTML = '<i class="fa-solid fa-user-check"></i> Urmărești';
    if (typeof window.notifyFollow === 'function') window.notifyFollow(user.username);
  }
  saveFollows(follows);
};

function socRenderLeaderboard() {
  const list = document.getElementById('soc-rank-list'); if (!list) return;
  const users = getUsers(); const allPosts = getPosts();
  const rankings = Object.values(users).map(u => {
    const userPosts = allPosts.filter(p => p.author?.toLowerCase() === u.username.toLowerCase());
    const settled = userPosts.filter(p => p.status === 'win' || p.status === 'loss' || p.status === 'cashout');
    const wins = settled.filter(p => p.status === 'win').length;
    const wr = settled.length >= 3 ? Math.round((wins / settled.length) * 100) : 0;
    return { username: u.username, avatar: u.avatar, xp: u.xp || 0, wr, total: settled.length, score: (wr * 0.7) + (settled.length * 0.3) };
  }).filter(r => r.total >= 3).sort((a,b) => b.score - a.score);

  if (!rankings.length) { list.innerHTML = `<div class="soc-empty">Minimum 3 tickets needed for rank.</div>`; return; }

  list.innerHTML = rankings.map((r, i) => {
    const lvl = typeof getUserLevelData === 'function' ? getUserLevelData(r.xp) : { level:1 };
    const vBadgeHtml = typeof getVerificationBadge === 'function' ? getVerificationBadge(r.username) : '';
    const isElite = lvl.level >= 80 || vBadgeHtml.includes('fb-verified-wrap');

    return `
    <div class="soc-user-card" onclick="viewUserProfile('${r.username}')">
      <div style="font-weight:700; width:20px;">${i+1}</div>
      <div class="soc-post-avatar">${renderAvatarContent(r.avatar)}</div>
      <div style="flex:1;">
        <div class="soc-post-author ${isElite ? 'elite-nickname-platinum' : ''}">@${r.username} ${vBadgeHtml}</div>
        <div class="soc-post-date">${r.wr}% WR • ${r.total} bilete</div>
      </div>
    </div>`;
  }).join('');
}

window.socConfirmPost = function() {
  const user = getCurrentUser(); if (!user) return;
  const selectedCheckboxes = document.querySelectorAll('.soc-pick-check:checked');
  if (selectedCheckboxes.length === 0) { alert('Selectează minim un bilet.'); return; }
  const bets = JSON.parse(localStorage.getItem('rgb_bets') || '[]');
  const selectedBets = Array.from(selectedCheckboxes).map(cb => { return bets.find(b => b.id === parseInt(cb.value)); }).filter(b => b);
  const posts = getPosts();
  const post = { id: 'post_' + Date.now() + '_' + user.username, author: user.username, postedAt: Date.now(), tickets: selectedBets.map(b => ({ name: b.name, odds: b.odds, status: b.status, events: b.events || [] })) };
  posts.unshift(post); savePosts(posts);
  const maxOdds = Math.max(...selectedBets.map(b => b.odds || 1));
  if (maxOdds >= 10 && typeof window.notifySpectacularPost === 'function') window.notifySpectacularPost(user.username, maxOdds);
  socClosePostPicker(); socRenderFeed();
};

window.socOpenPostPicker = function() {
  const modal = document.getElementById('socPickModal'); const list = document.getElementById('socPickList'); if (!modal || !list) return;
  const bets = JSON.parse(localStorage.getItem('rgb_bets') || '[]').reverse();
  if (bets.length === 0) list.innerHTML = `<div class="soc-empty" style="padding:10px;">Nu ai bilete plasate.</div>`;
  else list.innerHTML = bets.slice(0, 20).map(b => `<label class="soc-pick-item" style="display:flex; align-items:center; gap:12px; cursor:pointer;"><input type="checkbox" class="soc-pick-check" value="${b.id}" style="width:20px; height:20px; accent-color:var(--nb);"/><div style="flex:1;"><div style="font-weight:700; font-size:13px;">${b.name}</div><div style="font-size:11px; color:var(--nb);">@${parseFloat(b.odds).toFixed(2)} • ${b.status.toUpperCase()}</div></div></label>`).join('');
  modal.classList.add('open');
};

window.socClosePostPicker = function() { document.getElementById('socPickModal')?.classList.remove('open'); };

function socRenderFeed() {
  const list = document.getElementById('soc-feed-list'); if (!list) return;
  const posts = getPosts().sort((a,b) => b.postedAt - a.postedAt);
  if (!posts.length) { list.innerHTML = `<div class="soc-empty">Feed-ul este gol.</div>`; return; }

  const allUsers = getUsers();

  list.innerHTML = posts.map(p => {
    const authorUser = allUsers[p.author?.toLowerCase()];
    const tickets = p.tickets || [{ name: p.name, odds: p.totalOdds || p.odds, status: p.status, events: p.events || [] }];

    const xp = authorUser?.xp || 0;
    const lvl = typeof getUserLevelData === 'function' ? getUserLevelData(xp) : { level:1 };
    const vBadgeHtml = typeof getVerificationBadge === 'function' ? getVerificationBadge(p.author) : '';
    const isElite = lvl.level >= 80 || vBadgeHtml.includes('fb-verified-wrap');

    return `
    <div class="soc-post-card ${isElite ? 'elite-aura' : ''}">
      <div class="soc-post-header">
        <div class="soc-post-avatar" onclick="viewUserProfile('${p.author}')" style="cursor:pointer;">${renderAvatarContent(authorUser?.avatar)}</div>
        <div class="soc-post-meta">
          <div class="soc-post-author ${isElite ? 'elite-nickname-platinum' : ''}" onclick="viewUserProfile('${p.author}')" style="cursor:pointer;">@${p.author}</div>
          <div class="soc-post-date">${new Date(p.postedAt).toLocaleDateString()} ${new Date(p.postedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} ${vBadgeHtml}</div>
        </div>
      </div>
      <div class="soc-post-tickets-wrap" style="display:flex; flex-direction:column; gap:10px; margin-top:8px;">
        ${tickets.map(t => `
          <div class="soc-ticket-mini" style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.05); border-radius:12px; padding:10px;"><div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;"><div style="font-weight:700; font-size:14px; color:#fff;">${t.name}</div><div style="font-family:'Syncopate'; font-size:12px; color:var(--nb);">@${parseFloat(t.odds).toFixed(2)}</div></div><div style="font-size:11px; font-weight:700; color:${t.status === 'win' ? 'var(--ng)' : t.status === 'loss' ? 'var(--danger)' : 'var(--gold)'}; text-transform:uppercase;">${t.status}</div>${t.events && t.events.length > 0 ? `<div style="margin-top:6px; padding-top:6px; border-top:1px dashed rgba(255,255,255,0.1); display:flex; flex-direction:column; gap:3px;">${t.events.slice(0, 3).map(ev => `<div style="display:flex; justify-content:space-between; font-size:11px; color:rgba(255,255,255,0.6);"><span>${ev.name}</span><span style="color:var(--nb);">@${parseFloat(ev.odds).toFixed(2)}</span></div>`).join('')}${t.events.length > 3 ? `<div style="font-size:10px; color:rgba(255,255,255,0.3); text-align:right;">+ încă ${t.events.length - 3}</div>` : ''}</div>` : ''}</div>`).join('')}
      </div>
    </div>`;
  }).join('');
}

window.socSearch = function(q) {
  const res = document.getElementById('soc-search-results'); if (!res || !q) { if(res) res.innerHTML = ''; return; }
  const allUsers = getUsers();
  const matches = Object.values(allUsers).filter(u => u.username.toLowerCase().includes(q.toLowerCase()) || (u.displayName && u.displayName.toLowerCase().includes(q.toLowerCase())));
  res.innerHTML = matches.map(u => {
    const xp = u.xp || 0; const lvl = typeof getUserLevelData === 'function' ? getUserLevelData(xp) : { level:1 };
    const vBadgeHtml = typeof getVerificationBadge === 'function' ? getVerificationBadge(u.username) : '';
    const isElite = lvl.level >= 80 || vBadgeHtml.includes('fb-verified-wrap');
    return `<div class="soc-user-card" onclick="viewUserProfile('${u.username}')"><div class="soc-post-avatar">${renderAvatarContent(u.avatar)}</div><div style="flex:1;"><div class="soc-post-author ${isElite ? 'elite-nickname-platinum' : ''}">@${u.username} ${vBadgeHtml}</div><div class="soc-post-date">${u.displayName || 'Utilizator Elite'}</div></div><i class="fa-solid fa-chevron-right" style="opacity:0.3; font-size:10px;"></i></div>`;
  }).join('');
};

window.devGrantMaxXP = function() {
  const user = getCurrentUser(); if (!user) return;
  if (confirm("Activezi modul Elite Developer? Contul va fi promovat la Nivelul Maxim (120).")) {
    if (typeof addXP === 'function') { addXP(1000000 - (user.xp || 0)); buildProfilePage(true); }
  }
};

/* ── SISTEM VERIFIED TIPSTER (v9.5 Elite) ── */
window.getVerificationBadge = function(username) {
  if (!username) return '';
  const allPosts = getPosts(); const userPosts = allPosts.filter(p => p.author?.toLowerCase() === username.toLowerCase());
  if (userPosts.length < 10) return '';
  const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
  const recentPosts = userPosts.filter(p => p.postedAt >= thirtyDaysAgo);
  let recentProfit = 0;
  recentPosts.forEach(p => {
    const tickets = p.tickets || [{ status: p.status, stake: p.stake || 10, odds: p.totalOdds || p.odds || 1 }];
    tickets.forEach(t => {
      const s = parseFloat(t.stake || 10), o = parseFloat(t.odds || 1);
      if (t.status === 'win') recentProfit += s * (o - 1);
      else if (t.status === 'loss') recentProfit -= s;
      else if (t.status === 'cashout') recentProfit += (t.cashoutAmount - s);
    });
  });
  if (recentProfit > 0) return `<span class="fb-verified-wrap" title="Verified Tipster (30D Profit: +${recentProfit.toFixed(0)})"><i class="fa-solid fa-certificate fb-verified-bg"></i><i class="fa-solid fa-check fb-verified-check"></i></span>`;
  return '';
};

(function init() {
  const user = getCurrentUser(); if (user) authUpdateTopBar(user);
})();

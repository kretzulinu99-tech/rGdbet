/* ═══════════════════════════════════════════════════════════════
   social.js — Modulul Social Betting Network
   Versiune: v15.1 Apex Elite Sovereign (FULL SOCIAL CONTROL)
   Conține: Auth, Profile, Multi-Post Engine, Delete System, Bottom Share
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
function getCurrentUser() { try { return JSON.parse(sessionStorage.getItem(SK.user) || 'null') || JSON.parse(localStorage.getItem(SK.user) || 'null'); } catch { return null; } }
window.getCurrentUser = getCurrentUser;
function saveCurrentUser(u){
  sessionStorage.setItem(SK.user, JSON.stringify(u));
  localStorage.setItem(SK.user, JSON.stringify(u));
}
window.saveCurrentUser = saveCurrentUser;
function getPosts()       { try { return JSON.parse(localStorage.getItem(SK.posts) || '[]'); } catch { return []; } }
window.getPosts = getPosts;
function savePosts(p)     { localStorage.setItem(SK.posts, JSON.stringify(p)); }
window.savePosts = savePosts;

/* ── NATIVE INITIALIZATION ── */
window.nativeInitSession = function(uid, email, name) {
  console.log('[Native] Apex Session Init:', name);
  if (typeof window.cloudPullData === 'function') {
    window.cloudPullData(uid).then(() => {
      if (!getCurrentUser()) {
        const newUser = { username: name, email, uid, passwordHash: "firebase_auth", createdAt: Date.now(), avatar: "👤", theme: "neon" };
        saveCurrentUser(newUser);
      }
      const auth = document.getElementById('auth-screen'); if (auth) auth.style.display = 'none';
      const age = document.getElementById('age-gate'); if (age) age.style.display = 'none';
      if (typeof buildProfilePage === 'function') buildProfilePage(true);
    });
  }
};

/* ── AUTH HELPERS ── */
window.authUpdateBtn = function(tab) {
  const checked = document.getElementById(tab === 'login' ? 'login-tc' : 'reg-tc')?.checked;
  const btnEl = document.getElementById(tab === 'login' ? 'btn-login' : 'btn-register');
  if (btnEl) btnEl.disabled = !checked;
};

window.authSwitchTab = function(tab) {
  document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.auth-panel').forEach(p => p.classList.remove('active'));
  document.getElementById('tab-' + tab)?.classList.add('active');
  document.getElementById('panel-' + tab)?.classList.add('active');
};

function authOnSuccess(user) {
  saveCurrentUser(user);
  if (typeof buildProfilePage === 'function') buildProfilePage(true);
  document.getElementById('auth-screen').style.display = 'none';
}

window.authLogout = async function() {
  if (typeof window.cloudPushData === 'function') await window.cloudPushData();
  if (typeof Android !== 'undefined' && Android.logout) { Android.logout(); return; }
  localStorage.removeItem(SK.user); sessionStorage.clear();
  if (typeof fbAuth !== 'undefined' && fbAuth) try { await fbAuth.signOut(); } catch(e) {}
  window.location.reload();
};

/* ── RENDER HELPERS ── */
window.renderAvatarContent = function(av) {
  if (!av || av === 'default' || av === '👤') return '👤';
  if (av.startsWith('data:') || av.startsWith('http')) return `<img src="${av}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" />`;
  return av;
};

/* ── PROFIL ENGINE ── */
const AVATARS = ['👤','⚽','🏆','👑','🔥','💎','🦁','🐉','🌟','🎯','💥','🏅'];

window.profOpenAvatarPicker = function() { document.getElementById('profAvatarModal')?.classList.add('open'); };
window.profCloseAvatarPicker = function() { document.getElementById('profAvatarModal')?.classList.remove('open'); };

window.profUploadPhoto = function() {
  if (typeof Android !== 'undefined' && Android.selectAvatarFromPhone) Android.selectAvatarFromPhone();
  else {
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*';
    inp.onchange = (e) => {
      const file = e.target.files[0]; if (!file) return;
      const reader = new FileReader(); reader.onload = (re) => window.onAvatarUploaded(re.target.result); reader.readAsDataURL(file);
    };
    inp.click();
  }
};

window.onAvatarUploaded = function(dataUrl) {
  const img = new Image(); img.src = dataUrl;
  img.onload = () => {
    const canvas = document.createElement('canvas'); const MAX_SIZE = 400;
    let width = img.width, height = img.height;
    if (width > height) { if (width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE; } }
    else { if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE; } }
    canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0, width, height);
    const compressedUrl = canvas.toDataURL('image/jpeg', 0.7);
    const user = getCurrentUser();
    if (user) {
      user.avatar = compressedUrl; saveCurrentUser(user); buildProfilePage(true);
      if (typeof authUpdateTopBar === 'function') authUpdateTopBar(user);
      if (typeof window.cloudPushData === 'function') window.cloudPushData();
    }
  };
  profCloseAvatarPicker();
};

window.profSelectAvatar = function(av) {
  const user = getCurrentUser();
  if (user) {
    user.avatar = av; saveCurrentUser(user);
    if (typeof window.cloudPushData === 'function') window.cloudPushData();
    buildProfilePage(true);
    if (typeof authUpdateTopBar === 'function') authUpdateTopBar(user);
  }
  profCloseAvatarPicker();
};

window.buildProfilePage = function(force = false) {
  const page = document.getElementById('page-profile'); if (!page) return;
  const user = getCurrentUser();
  if (!user) {
    page.innerHTML = `<div class="prof-login-prompt"><div class="prof-login-icon">👤</div><div class="prof-login-title">LOGIN REQUIRED</div><button class="prof-action-btn" onclick="authShowScreen()">INTRĂ ÎN CONT</button></div>`;
    page._built = false; return;
  }
  if (page._built && !force) {
    if (typeof updateXPUI === 'function') updateXPUI();
    if (typeof updateProfileStatsUI === 'function') updateProfileStatsUI();
    return;
  }
  page._built = true;
  const stats = calcUserStats();
  const savedXp = parseInt(localStorage.getItem('rgb_xp')) || user.xp || 0;
  const lvl = typeof getUserLevelData === 'function' ? getUserLevelData(savedXp) : { level:1, xp:0, progressPct:0, progressXP:0, requiredXP:100 };
  const avDisplay = renderAvatarContent(user.avatar);
  const globalRankData = calcGlobalRank(user.username, savedXp, stats);
  const totalUsers = Object.keys(getUsers()).length || 1;

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
            <i class="fa-solid fa-earth-europe"></i> RANK #${globalRankData.rank} / ${totalUsers}
          </span>
        </div>
      </div>
      <div class="xp-container" id="xpContainerUI">
        <div class="xp-header">
          <div class="xp-level-badge" id="xpLevelBadgeUI">LVL ${lvl.level}</div>
          <div class="xp-total-text" id="xpTotalTextUI">${savedXp.toLocaleString()} XP</div>
        </div>
        <div class="xp-bar-outer"><div class="xp-bar-inner" id="xpBarInnerUI" style="width:${lvl.progressPct}%"></div></div>
        <div class="xp-footer"><span>RANK PROGRESS</span><span id="xpProgressTextUI">${lvl.progressXP} / ${lvl.requiredXP} XP</span></div>
      </div>
    </div>
    <div class="prof-stats-grid" id="profStatsGridUI">
      <div class="prof-stat-card"><div class="prof-stat-val ${stats.profit >= 0 ? 'pos' : 'neg'}" id="profStatProfitUI">${stats.profit >= 0 ? '+' : ''}${stats.profit.toFixed(0)}</div><div class="prof-stat-lbl">PROFIT</div></div>
      <div class="prof-stat-card"><div class="prof-stat-val" style="color:var(--nb)" id="profStatWRUI">${stats.wr}%</div><div class="prof-stat-lbl">WR</div></div>
      <div class="prof-stat-card"><div class="prof-stat-val" id="profStatTotalUI">${stats.total}</div><div class="prof-stat-lbl">TICKETS</div></div>
    </div>
    <div class="prof-section-card">
      <div class="prof-section-title">SECURITY & DATA</div>
      <div class="prof-row" onclick="exportAccountData()"><div class="prof-row-left"><div class="prof-row-icon green"><i class="fa-solid fa-cloud-arrow-up"></i></div><div class="prof-row-text"><span class="prof-row-label">Cloud Backup</span></div></div></div>
      <div class="prof-row" onclick="authLogout()"><div class="prof-row-left"><div class="prof-row-icon red"><i class="fa-solid fa-power-off"></i></div><div class="prof-row-text"><span class="prof-row-label" style="color:var(--danger)">Log Out / Schimbă Contul</span></div></div></div>
    </div>
    <div class="prof-avatar-modal" id="profAvatarModal">
      <div class="prof-avatar-box">
        <div class="prof-edit-title">AVATAR</div>
        <div style="padding:0 0 15px; text-align:center;">
          <button class="prof-action-btn" onclick="profUploadPhoto()" style="width:100%; background:linear-gradient(135deg, var(--nb), var(--ng)); color:#000;"><i class="fa-solid fa-camera"></i> ÎNCARCĂ POZĂ DIN TELEFON</button>
        </div>
        <div class="prof-avatar-grid">${AVATARS.map(a => `<button class="prof-av-option" onclick="profSelectAvatar('${a}')">${a}</button>`).join('')}</div>
        <button class="prof-edit-cancel" style="width:100%" onclick="profCloseAvatarPicker()">CLOSE</button>
      </div>
    </div>
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
  }
  if (wrEl) wrEl.textContent = stats.wr + '%';
  if (totalEl) totalEl.textContent = stats.total;
}

function calcGlobalRank(currentUsername, currentXP, currentStats) {
  const users = getUsers(); const allPosts = getPosts();
  const leaderboard = Object.values(users).map(u => {
    if (u.username.toLowerCase() === currentUsername.toLowerCase()) {
      return { username: u.username, score: (currentXP * 0.5) + (currentStats.wr * 10) + (currentStats.profit * 0.1) };
    }
    return { username: u.username, score: (u.xp || 0) * 0.5 };
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

/* ── SOCIAL ENGINE ── */
window.socOpenPostPicker = function() {
  const modal = document.getElementById('socPickModal');
  const list = document.getElementById('socPickList');
  if (!modal || !list) return;
  const bets = JSON.parse(localStorage.getItem('rgb_bets') || '[]').reverse();
  if (bets.length === 0) list.innerHTML = `<div class="soc-empty" style="padding:20px; text-align:center; opacity:0.5;">Nu ai niciun bilet plasat în istoric.</div>`;
  else list.innerHTML = bets.map(b => `<label class="soc-pick-item"><input type="checkbox" class="soc-pick-check" value="${b.id}" /><div style="flex:1;"><div style="font-weight:700; font-size:14px; color:#fff;">${b.name}</div><div style="font-size:11px; color:var(--nb);">@${parseFloat(b.odds || 1).toFixed(2)} • ${b.status.toUpperCase()}</div></div></label>`).join('');
  modal.classList.add('open');
};

window.socConfirmPost = function() {
  const user = getCurrentUser(); if (!user) return;
  const checks = document.querySelectorAll('.soc-pick-check:checked');
  if (checks.length === 0) { alert('Selectează cel puțin un bilet.'); return; }
  const bets = JSON.parse(localStorage.getItem('rgb_bets') || '[]');
  const selected = Array.from(checks).map(cb => bets.find(b => b.id === parseInt(cb.value))).filter(b => b);
  const posts = getPosts();
  const newPost = { id: 'post_' + Date.now() + '_' + user.username, author: user.username, postedAt: Date.now(), tickets: selected.map(b => ({ name: b.name, odds: b.odds, status: b.status, events: b.events || [] })) };
  posts.unshift(newPost); savePosts(posts);
  if (typeof window.cloudPushData === 'function') window.cloudPushData();
  document.getElementById('socPickModal').classList.remove('open');
  socRenderFeed();
};

window.socDeletePost = function(id) {
  if (!confirm('Vrei să ștergi această postare din Feed?')) return;
  let posts = getPosts();
  posts = posts.filter(p => p.id !== id);
  savePosts(posts);
  if (typeof window.cloudPushData === 'function') window.cloudPushData();
  socRenderFeed();
};

function socRenderFeed() {
  const list = document.getElementById('soc-feed-list'); if (!list) return;
  const posts = getPosts().sort((a,b) => b.postedAt - a.postedAt);
  if (!posts.length) { list.innerHTML = `<div class="soc-empty" style="padding:40px; text-align:center; opacity:0.4;">Momentan nu există postări. Fii primul care postează!</div>`; return; }
  const allUsers = getUsers();
  const user = getCurrentUser();

  list.innerHTML = posts.map(p => {
    const authorUser = allUsers[p.author?.toLowerCase()];
    const tickets = p.tickets || [];
    const xp = authorUser?.xp || 0;
    const lvl = typeof getUserLevelData === 'function' ? getUserLevelData(xp) : { level:1 };
    const vBadge = typeof getVerificationBadge === 'function' ? getVerificationBadge(p.author) : '';
    const isElite = lvl.level >= 80 || vBadge.includes('fb-verified-wrap');
    const isOwner = user && user.username === p.author;

    return `
    <div class="soc-post-card ${isElite ? 'elite-aura' : ''}">
      <div class="soc-post-header">
        <div class="soc-post-avatar" onclick="viewUserProfile('${p.author}')">${renderAvatarContent(authorUser?.avatar)}</div>
        <div class="soc-post-meta">
          <div class="soc-post-author ${isElite ? 'elite-nickname-platinum' : ''}" onclick="viewUserProfile('${p.author}')">@${p.author}</div>
          <div class="soc-post-date">${new Date(p.postedAt).toLocaleString('ro-RO', {day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit'})} ${vBadge}</div>
        </div>
        ${isOwner ? `<button class="soc-post-del-btn" onclick="socDeletePost('${p.id}')"><i class="fa-solid fa-trash-can"></i></button>` : ''}
      </div>
      <div class="soc-post-content">${tickets.map(t => `<div class="soc-ticket-item"><div style="display:flex; justify-content:space-between; align-items:center;"><div style="font-weight:700; color:#fff; font-size:14px;">${t.name}</div><div style="font-family:'Syncopate'; font-size:11px; color:var(--nb);">@${parseFloat(t.odds || 1).toFixed(2)}</div></div><div class="soc-ticket-status-${t.status}" style="font-size:10px; font-weight:800; text-transform:uppercase; margin-top:2px;">${t.status}</div>${t.events && t.events.length > 0 ? `<div style="margin-top:8px; border-top:1px solid rgba(255,255,255,0.05); padding-top:8px; display:flex; flex-direction:column; gap:4px;">${t.events.slice(0, 3).map(ev => `<div style="display:flex; justify-content:space-between; font-size:11px; opacity:0.6;"><span>${ev.name}</span><span style="color:var(--nb);">@${parseFloat(ev.odds || 1).toFixed(2)}</span></div>`).join('')}</div>` : ''}</div>`).join('')}</div>
      <div style="margin-top:15px; display:flex; justify-content:flex-end;">
        <button class="soc-post-share-btn" onclick="if(window.shareTicket) shareTicket('${p.id}'); else alert('Modulul Cloud se încarcă...');">
          <i class="fa-solid fa-share-nodes"></i> SHARE BILET
        </button>
      </div>
    </div>`;
  }).join('');
}

window.socSwitchTab = function(tab) {
  document.querySelectorAll('.soc-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.soc-panel').forEach(p => p.classList.remove('active'));
  document.getElementById('soc-tab-' + tab)?.classList.add('active');
  document.getElementById('soc-panel-' + tab)?.classList.add('active');
  if (tab === 'feed') socRenderFeed();
};

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
    ${user ? `<div style="padding:10px 16px 0;"><button class="soc-post-btn" onclick="socOpenPostPicker()"><i class="fa-solid fa-plus"></i> CREEAZĂ POSTARE</button></div>` : ''}
    <div id="soc-panel-feed" class="soc-panel active"><div id="soc-feed-list"></div></div>
    <div id="soc-panel-rank" class="soc-panel"></div>
    <div id="soc-panel-search" class="soc-panel"></div>
    <div class="prof-avatar-modal" id="socPickModal"><div class="prof-avatar-box" style="max-width:440px;"><div class="prof-edit-title">ALEGE BILETELE</div><div id="socPickList" style="max-height:300px; overflow-y:auto; display:flex; flex-direction:column; gap:8px; margin:15px 0;"></div><div class="prof-edit-actions"><button class="prof-edit-cancel" onclick="document.getElementById('socPickModal').classList.remove('open')">ANULEAZĂ</button><button class="prof-edit-save" onclick="socConfirmPost()">POSTEAZĂ ACUM</button></div></div></div>
  `;
  socRenderFeed();
};

(function init() {
  const user = getCurrentUser();
  if (user) { if (typeof authUpdateTopBar === 'function') authUpdateTopBar(user); }
})();

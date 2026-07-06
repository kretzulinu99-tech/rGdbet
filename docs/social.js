/* ═══════════════════════════════════════════════════════════════
   social.js — Modulul Social Betting Network
   Versiune: v13.0 Apex Edition (REDESIGN & MULTI-POST FIX)
   Conține: Auth, Profile, Multi-Post Engine, Apex UI, Share System
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
  if (typeof window.cloudPullData === 'function') {
    window.cloudPullData(uid).then(() => {
      if (!getCurrentUser()) {
        const newUser = { username: name, email, uid, passwordHash: "firebase_auth", createdAt: Date.now(), avatar: "👤", theme: "neon" };
        saveCurrentUser(newUser);
      }
      document.getElementById('auth-screen') && (document.getElementById('auth-screen').style.display = 'none');
      document.getElementById('age-gate') && (document.getElementById('age-gate').style.display = 'none');
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

function authOnSuccess(user) { saveCurrentUser(user); buildProfilePage(true); document.getElementById('auth-screen').style.display = 'none'; }

window.authLogout = async function() {
  if (typeof window.cloudPushData === 'function') await window.cloudPushData();
  localStorage.removeItem(SK.user); sessionStorage.clear();
  if (typeof fbAuth !== 'undefined' && fbAuth) try { await fbAuth.signOut(); } catch(e) {}
  if (typeof Android !== 'undefined' && Android.logout) { Android.logout(); return; }
  window.location.reload();
};

/* ── RENDER HELPERS ── */
window.renderAvatarContent = function(av) {
  if (!av || av === 'default' || av === '👤') return '👤';
  if (av.startsWith('data:') || av.startsWith('http')) return `<img src="${av}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" />`;
  return av;
};

/* ── MULTI-POST ENGINE (v13.0) ── */
window.socOpenPostPicker = function() {
  const modal = document.getElementById('socPickModal');
  const list = document.getElementById('socPickList');
  if (!modal || !list) return;

  const bets = JSON.parse(localStorage.getItem('rgb_bets') || '[]').reverse();
  if (bets.length === 0) {
    list.innerHTML = `<div class="soc-empty" style="padding:20px; text-align:center; opacity:0.5;">Nu ai niciun bilet plasat în istoric.</div>`;
  } else {
    list.innerHTML = bets.map(b => `
      <label class="soc-pick-item">
        <input type="checkbox" class="soc-pick-check" value="${b.id}" />
        <div style="flex:1;">
          <div style="font-weight:700; font-size:14px; color:#fff;">${b.name}</div>
          <div style="font-size:11px; color:var(--nb);">@${parseFloat(b.odds || 1).toFixed(2)} • ${b.status.toUpperCase()}</div>
        </div>
      </label>
    `).join('');
  }
  modal.classList.add('open');
};

window.socConfirmPost = function() {
  const user = getCurrentUser(); if (!user) return;
  const checks = document.querySelectorAll('.soc-pick-check:checked');
  if (checks.length === 0) { alert('Selectează cel puțin un bilet.'); return; }

  const bets = JSON.parse(localStorage.getItem('rgb_bets') || '[]');
  const selected = Array.from(checks).map(cb => bets.find(b => b.id === parseInt(cb.value))).filter(b => b);

  const posts = getPosts();
  const newPost = {
    id: 'post_' + Date.now() + '_' + user.username,
    author: user.username,
    postedAt: Date.now(),
    tickets: selected.map(b => ({
      name: b.name,
      odds: b.odds,
      status: b.status,
      events: b.events || []
    }))
  };

  posts.unshift(newPost);
  savePosts(posts);

  if (typeof window.cloudPushData === 'function') window.cloudPushData();

  document.getElementById('socPickModal').classList.remove('open');
  socSwitchTab('feed');
};

/* ── APEX UI RENDERER (v13.0) ── */
function socRenderFeed() {
  const list = document.getElementById('soc-feed-list'); if (!list) return;
  const posts = getPosts().sort((a,b) => b.postedAt - a.postedAt);
  if (!posts.length) { list.innerHTML = `<div class="soc-empty" style="padding:40px; text-align:center; opacity:0.4;">Momentan nu există postări. Fii primul care postează!</div>`; return; }

  const allUsers = getUsers();

  list.innerHTML = posts.map(p => {
    const authorUser = allUsers[p.author?.toLowerCase()];
    const tickets = p.tickets || [];

    const xp = authorUser?.xp || 0;
    const lvl = typeof getUserLevelData === 'function' ? getUserLevelData(xp) : { level:1 };
    const vBadge = typeof getVerificationBadge === 'function' ? getVerificationBadge(p.author) : '';
    const isElite = lvl.level >= 80 || vBadge.includes('fb-verified-wrap');

    return `
    <div class="soc-post-card ${isElite ? 'elite-aura' : ''}">
      <div class="soc-post-header">
        <div class="soc-post-avatar" onclick="viewUserProfile('${p.author}')">${renderAvatarContent(authorUser?.avatar)}</div>
        <div class="soc-post-meta">
          <div class="soc-post-author ${isElite ? 'elite-nickname-platinum' : ''}">@${p.author}</div>
          <div class="soc-post-date">${new Date(p.postedAt).toLocaleString('ro-RO', {day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit'})} ${vBadge}</div>
        </div>
        <button class="soc-post-share-btn" onclick="shareTicket('${p.id}')">
          <i class="fa-solid fa-share-nodes"></i> SHARE
        </button>
      </div>

      <div class="soc-post-content">
        ${tickets.map(t => `
          <div class="soc-ticket-item">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <div style="font-weight:700; color:#fff; font-size:14px;">${t.name}</div>
              <div style="font-family:'Syncopate'; font-size:11px; color:var(--nb);">@${parseFloat(t.odds || 1).toFixed(2)}</div>
            </div>
            <div class="soc-ticket-status-${t.status}" style="font-size:10px; font-weight:800; text-transform:uppercase; margin-top:2px;">
              ${t.status}
            </div>
            ${t.events && t.events.length > 0 ? `
              <div style="margin-top:8px; border-top:1px solid rgba(255,255,255,0.05); padding-top:8px; display:flex; flex-direction:column; gap:4px;">
                ${t.events.slice(0, 3).map(ev => `
                  <div style="display:flex; justify-content:space-between; font-size:11px; opacity:0.6;">
                    <span>${ev.name}</span>
                    <span style="color:var(--nb);">@${parseFloat(ev.odds || 1).toFixed(2)}</span>
                  </div>
                `).join('')}
              </div>
            ` : ''}
          </div>
        `).join('')}
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
  if (tab === 'rank') socRenderLeaderboard();
};

/* ── INITIALIZATION ── */
(function init() {
  const user = getCurrentUser();
  if (user) {
    if (typeof authUpdateTopBar === 'function') authUpdateTopBar(user);
  }
})();

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
    <div id="soc-panel-rank" class="soc-panel"><div id="soc-rank-list"></div></div>
    <div id="soc-panel-search" class="soc-panel"><div class="soc-search-wrap"><input class="auth-input" id="soc-search-inp" type="text" placeholder="Caută utilizatori..." oninput="socSearch(this.value)" style="padding-left:15px;"/></div><div id="soc-search-results"></div></div>
    <div class="prof-avatar-modal" id="socPickModal"><div class="prof-avatar-box" style="max-width:440px;"><div class="prof-edit-title">ALEGE BILETELE</div><div id="socPickList" style="max-height:300px; overflow-y:auto; display:flex; flex-direction:column; gap:8px; margin:15px 0;"></div><div class="prof-edit-actions"><button class="prof-edit-cancel" onclick="document.getElementById('socPickModal').classList.remove('open')">ANULEAZĂ</button><button class="prof-edit-save" onclick="socConfirmPost()">POSTEAZĂ ACUM</button></div></div></div>
  `;
  socRenderFeed();
};

function socRenderLeaderboard() {
  const list = document.getElementById('soc-rank-list'); if (!list) return;
  const users = getUsers(); const allPosts = getPosts();
  const rankings = Object.values(users).map(u => {
    const uPosts = allPosts.filter(p => p.author?.toLowerCase() === u.username.toLowerCase());
    const settled = uPosts.filter(p => p.status === 'win' || p.status === 'loss' || p.status === 'cashout');
    const wins = settled.filter(p => p.status === 'win').length;
    const wr = settled.length >= 3 ? Math.round((wins / settled.length) * 100) : 0;
    return { username: u.username, avatar: u.avatar, xp: u.xp || 0, wr, total: settled.length, score: (wr * 0.7) + (settled.length * 0.3) };
  }).filter(r => r.total >= 1).sort((a,b) => b.score - a.score);

  list.innerHTML = rankings.map((r, i) => `
    <div class="soc-user-card" onclick="viewUserProfile('${r.username}')">
      <div style="font-weight:700; width:20px; opacity:0.5;">${i+1}</div>
      <div class="soc-post-avatar">${renderAvatarContent(r.avatar)}</div>
      <div style="flex:1;">
        <div class="soc-post-author">@${r.username}</div>
        <div class="soc-post-date">${r.wr}% WR • ${r.total} postări</div>
      </div>
    </div>
  `).join('');
}

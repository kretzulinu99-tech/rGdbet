/* ═══════════════════════════════════════════════════════════════
   social.js — Modulul Social Betting Network
   Versiune: v16.94 Apex Community Sovereign (Themes & Layout Master)
   Conține: Auth, Profile, Multi-Post Engine, Cloud Sync, Social Interactions
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

function getUsers()       { try { return JSON.parse(localStorage.getItem(SK.users)) || {}; } catch { return {}; } }
window.getUsers = getUsers;
function saveUsers(u)     { localStorage.setItem(SK.users, JSON.stringify(u)); }
window.saveUsers = saveUsers;
function getCurrentUser() {
  try {
    const uStr = sessionStorage.getItem(SK.user) || localStorage.getItem(SK.user);
    if (!uStr || uStr === 'null') return null;
    let u = JSON.parse(uStr);
    if (u && u.username) {
      const pKey = 'rgd_persistent_avatar_' + u.username.toLowerCase();
      const saved = localStorage.getItem(pKey) || localStorage.getItem('rgb_global_persistent_avatar');
      if (saved && (!u.avatar || u.avatar === '👤' || u.avatar === 'default')) {
        u.avatar = saved;
        localStorage.setItem(SK.user, JSON.stringify(u));
        sessionStorage.setItem(SK.user, JSON.stringify(u));
      }
    }
    return u;
  } catch { return null; }
}
window.getCurrentUser = getCurrentUser;
function saveCurrentUser(u){
  if (!u) return;
  if (u.avatar && u.avatar !== '👤' && u.avatar !== 'default' && u.username) {
    localStorage.setItem('rgd_persistent_avatar_' + u.username.toLowerCase(), u.avatar);
    localStorage.setItem('rgb_global_persistent_avatar', u.avatar);
  }
  sessionStorage.setItem(SK.user, JSON.stringify(u));
  localStorage.setItem(SK.user, JSON.stringify(u));
}
window.saveCurrentUser = saveCurrentUser;
function getPosts()       { try { return JSON.parse(localStorage.getItem(SK.posts)) || []; } catch { return []; } }
window.getPosts = getPosts;
function savePosts(p)     { localStorage.setItem(SK.posts, JSON.stringify(p)); }
window.savePosts = savePosts;

window.getVerificationBadge = function(username) {
  if (!username) return '';
  const u = username.toLowerCase();
  const verified = ['kretzulinu', 'admin', 'rgdbet', 'elite'];
  if (verified.includes(u)) {
    return `<span class="fb-verified-wrap" title="Elite Verified">
              <i class="fa-solid fa-certificate fb-verified-bg"></i>
              <i class="fa-solid fa-check fb-verified-check"></i>
            </span>`;
  }
  return '';
};

window.renderAvatarContent = function(av) {
  if (!av || av === 'default' || av === '👤') {
    return `<div class="avatar-placeholder">👤</div>`;
  }
  if (av.startsWith('data:') || av.startsWith('http')) {
    return `<img src="${av}" class="avatar-img" />`;
  }
  return `<div class="avatar-emoji">${av}</div>`;
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
    }
  };
  profCloseAvatarPicker();
};

window.profSelectAvatar = function(av) {
  const user = getCurrentUser();
  if (user) { user.avatar = av; saveCurrentUser(user); buildProfilePage(true); if (typeof authUpdateTopBar === 'function') authUpdateTopBar(user); }
  profCloseAvatarPicker();
};

function calcUserStats() {
  let allBets = [];
  try { allBets = JSON.parse(localStorage.getItem('rgb_bets') || '[]'); } catch(e) { allBets = []; }
  const currentPortfolioId = localStorage.getItem('rgb_current_portfolio') || 'default';
  const bets = allBets.filter(b => b.portfolioId === currentPortfolioId);
  const settled = bets.filter(b => b && (b.status === 'win' || b.status === 'loss' || b.status === 'cashout'));
  let wins = 0, profit = 0;
  settled.forEach(b => {
    const s = parseFloat(b.stake || 0), o = parseFloat(b.odds || 1);
    if (b.status === 'win') { wins++; profit += (s * o) - s; }
    else if (b.status === 'loss') { profit -= s; }
    else if (b.status === 'cashout') { profit += ((b.cashoutAmount || 0) - s); wins++; }
  });
  let portfolios = [];
  try { portfolios = JSON.parse(localStorage.getItem('rgb_portfolios') || '[]'); } catch(e) {}
  const p = portfolios.find(x => x.id === currentPortfolioId);
  const offset = p ? p.offset : 0;
  return { total: bets.length, settled: settled.length, wins, wr: settled.length ? Math.round((wins / settled.length) * 100) : 0, profit: (profit - offset) };
}

window.updateProfileStatsUI = function() {
  const stats = calcUserStats();
  const pEl = document.getElementById('profStatProfitUI'), wEl = document.getElementById('profStatWRUI'), tEl = document.getElementById('profStatTotalUI');
  if (pEl) { pEl.textContent = (stats.profit >= 0 ? '+' : '') + stats.profit.toFixed(0); pEl.className = 'prof-stat-val ' + (stats.profit >= 0 ? 'pos' : 'neg'); }
  if (wEl) wEl.textContent = stats.wr + '%';
  if (tEl) tEl.textContent = stats.total;
};

function calcGlobalRank(currentUsername, currentXP) {
  try {
    const users = getUsers();
    const leaderboard = Object.values(users).map(u => ({ username: u.username, xp: u.xp || 0 }));
    leaderboard.sort((a, b) => b.xp - a.xp);
    const rankIndex = leaderboard.findIndex(u => u.username && u.username.toLowerCase() === currentUsername.toLowerCase());
    return { rank: rankIndex !== -1 ? rankIndex + 1 : leaderboard.length + 1, total: Math.max(leaderboard.length, 1) };
  } catch(e) { return { rank: '?', total: '?' }; }
}

window.authLogout = function() {
  if (window.Android && typeof window.Android.logout === 'function') {
    window.Android.logout();
  } else {
    // Fallback pentru mediul Web / Testare
    localStorage.removeItem('rgd_session');
    localStorage.removeItem('rgb_session');
    localStorage.removeItem('rgb_user');
    localStorage.removeItem('rgd_user');
    window.location.reload();
  }
};

window.buildProfilePage = function() {
  const page = document.getElementById('page-profile'); if (!page) return;
  try {
    const user = getCurrentUser();
    if (!user) { page.innerHTML = `<div style="padding:150px 20px; text-align:center;"><button class="main-btn" onclick="navigateTo('home',null)">REVENIRE ACASĂ</button></div>`; return; }

    const stats = calcUserStats();
    const savedXp = parseInt(localStorage.getItem('rgb_xp')) || 0;
    const lvl = typeof getUserLevelData === 'function' ? getUserLevelData(savedXp) : { level:1, progressPct:0, progressXP:0, requiredXP:100 };
    const avDisplay = renderAvatarContent(user.avatar);
    const joinDate = new Date(user.createdAt || Date.now()).toLocaleDateString('ro-RO', { year:'numeric', month:'long', day:'numeric' });
    const rankData = calcGlobalRank(user.username, savedXp);
    const currentThemeId = localStorage.getItem('rgb_theme') || 'neon';

    // Ensure THEMES is handled correctly
    const themesToRender = window.THEMES || [];

    page.innerHTML = `
      <div class="side-panel-close-btn" style="background:rgba(2,4,8,0.7); backdrop-filter:blur(10px); -webkit-backdrop-filter:blur(10px); border-bottom:1px solid rgba(255,255,255,0.05);">
        <button onclick="navigateTo('home', null)"><i class="fa-solid fa-arrow-left"></i></button>
        <span style="font-family:'Syncopate'; font-size:10px; letter-spacing:2px;">ELITE PROFILE</span>
      </div>

      <div class="prof-hero-modern">
        <div class="prof-avatar-wrap">
          <div class="prof-avatar-modern" onclick="profOpenAvatarPicker()">${avDisplay}</div>
          <div onclick="profOpenAvatarPicker()" style="position:absolute; bottom:5px; right:5px; background:var(--nb); color:#000; width:34px; height:34px; border-radius:50%; display:flex; align-items:center; justify-content:center; border:3px solid #020408; font-size:12px; z-index:10; cursor:pointer; box-shadow: 0 4px 10px rgba(0,0,0,0.5);"><i class="fa-solid fa-camera"></i></div>
        </div>
        <div class="prof-name-container">
          <div class="prof-display-name">${user.username} ${getVerificationBadge(user.username)}</div>
          <div class="prof-user-tag">@${user.username}</div>
          <div style="font-size:11px; color:var(--text2); margin-top:8px; opacity:0.6; font-family:'Rajdhani'; font-weight:600;">Membru din ${joinDate}</div>
        </div>

        <div class="xp-container" style="max-width:100%; width:calc(100% - 32px); margin:25px auto 0; padding:20px; background:rgba(255,255,255,0.02); border-radius:24px; border:1px solid rgba(255,255,255,0.05);">
          <div class="xp-header" style="display:flex; justify-content:space-between; font-family:'Syncopate'; font-size:12px; margin-bottom:12px;">
            <span style="color:var(--nb); font-weight:800; text-shadow: 0 0 10px var(--nb);">LEVEL ${lvl.level}</span>
            <span style="color:#fff; font-weight:800;">${savedXp.toLocaleString()} XP</span>
          </div>
          <div class="xp-bar-outer" style="height:18px; border-radius:9px; background:rgba(0,0,0,0.4); border:1px solid rgba(255,255,255,0.1);">
            <div class="xp-bar-inner" style="width:${lvl.progressPct}%"></div>
          </div>
          <div style="display:flex; justify-content:space-between; margin-top:15px; font-family:'Syncopate'; font-size:9px; color:rgba(255,255,255,0.6); letter-spacing:1px; font-weight:700;">
            <span>PROGRES: ${lvl.progressXP} / ${lvl.requiredXP} XP</span>
            <span style="color:var(--gold); text-shadow: 0 0 10px rgba(255,204,0,0.3);">RANK GLOBAL: #${rankData.rank} / ${rankData.total}</span>
          </div>
        </div>
      </div>


      <div class="prof-stats-grid" style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:12px; padding:0 16px; margin-bottom:25px;">
        <div class="prof-stat-card"><div class="prof-stat-val ${stats.profit >= 0 ? 'pos' : 'neg'}" id="profStatProfitUI" style="font-size:20px; font-weight:800; font-family:'Rajdhani';">${(stats.profit >= 0 ? '+' : '') + stats.profit.toFixed(0)}</div><div class="prof-stat-lbl" style="font-size:8px; opacity:0.4; font-family:'Syncopate';">PROFIT</div></div>
        <div class="prof-stat-card"><div class="prof-stat-val" style="color:var(--nb); font-size:20px; font-weight:800; font-family:'Rajdhani';" id="profStatWRUI">${stats.wr}%</div><div class="prof-stat-lbl" style="font-size:8px; opacity:0.4; font-family:'Syncopate';">WIN RATE</div></div>
        <div class="prof-stat-card"><div class="prof-stat-val" style="font-size:20px; font-weight:800; font-family:'Rajdhani';" id="profStatTotalUI">${stats.total}</div><div class="prof-stat-lbl" style="font-size:8px; opacity:0.4; font-family:'Syncopate';">TICKETS</div></div>
      </div>

      <!-- VISUAL EXPERIENCE SECTION -->
      <div class="prof-section-card">
        <div style="font-family:'Syncopate'; font-size:9px; color:rgba(255,255,255,0.3); margin-bottom:15px; letter-spacing:1px;">VISUAL EXPERIENCE</div>
        <div class="theme-selector-grid">
          ${themesToRender.map(t => `
            <div class="theme-option-card ${t.id === currentThemeId ? 'active' : ''}" data-theme="${t.id}" onclick="setTheme('${t.id}')">
              <div class="theme-icon-circle">${t.icon}</div>
              <div class="theme-label-text">${t.label}</div>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="prof-section-card">
        <div style="font-family:'Syncopate'; font-size:9px; color:rgba(255,255,255,0.3); margin-bottom:15px; letter-spacing:1px;">ACCOUNT SETTINGS</div>
        <div class="prof-row" onclick="showTerms()"><div style="display:flex; align-items:center; gap:12px;"><i class="fa-solid fa-file-contract" style="color:var(--nb);"></i><span>Termeni și Condiții</span></div><i class="fa-solid fa-chevron-right"></i></div>
        <div class="prof-row" onclick="openGamblingTest()"><div style="display:flex; align-items:center; gap:12px;"><i class="fa-solid fa-brain" style="color:var(--nb);"></i><span>Test Joc Responsabil</span></div><i class="fa-solid fa-chevron-right"></i></div>
        <div class="prof-row" onclick="exportAccountData()"><div style="display:flex; align-items:center; gap:12px;"><i class="fa-solid fa-cloud-download" style="color:var(--ng);"></i><span>Export Date Cont</span></div><i class="fa-solid fa-chevron-right"></i></div>
        <div class="prof-row" onclick="authLogout()" style="margin-top:20px; border-color:rgba(255,51,102,0.2);"><div style="display:flex; align-items:center; gap:12px;"><i class="fa-solid fa-power-off" style="color:var(--danger);"></i><span style="color:var(--danger);">Deconectare</span></div><i class="fa-solid fa-chevron-right"></i></div>
      </div>
    `;

  } catch (err) { console.error(err); }
};

/* ── SOCIAL ENGINE ── */
window.socOpenPostPicker = function() {
  const modal = document.getElementById('socPickModal');
  const list = document.getElementById('socPickList');
  if (!modal || !list) return;
  const bets = JSON.parse(localStorage.getItem('rgb_bets') || '[]').reverse();
  if (bets.length === 0) list.innerHTML = `<div class="soc-empty">Nu ai bilete în istoric.</div>`;
  else list.innerHTML = bets.map(b => `<label class="soc-pick-item" id="picker-item-${b.id}"><input type="checkbox" class="soc-pick-check" value="${b.id}" onchange="this.parentElement.classList.toggle('selected', this.checked)" /><div class="soc-pick-info"><span class="soc-pick-name">${b.name || 'Bilet'}</span><div class="soc-pick-meta"><span style="color:var(--nb); font-weight:700;">@${parseFloat(b.odds).toFixed(2)}</span></div></div></label>`).join('');
  modal.classList.add('open');
};

window.socConfirmPost = async function() {
  const user = getCurrentUser(); if (!user) return;
  const checks = document.querySelectorAll('.soc-pick-check:checked');
  if (checks.length === 0) return;
  const bets = JSON.parse(localStorage.getItem('rgb_bets') || '[]');
  const selected = Array.from(checks).map(cb => bets.find(b => b.id === parseInt(cb.value))).filter(b => b);
  const newPost = { id: 'post_' + Date.now() + '_' + user.username, author: user.username, postedAt: Date.now(), tickets: selected.map(b => ({ name: b.name, odds: b.odds, status: b.status, events: b.events || [] })), likes: [], dislikes: [], comments: [] };
  if (typeof fbDb !== 'undefined' && fbReady) { try { await fbDb.collection('shared_feed').doc(newPost.id).set(newPost); } catch(e) {} }
  const posts = getPosts(); posts.unshift(newPost); savePosts(posts);
  document.getElementById('socPickModal').classList.remove('open');

  if (typeof updateQuestProgress === 'function') updateQuestProgress('social_post');

  socRenderFeed();
};

window.socLikePost = async function(id) {
  const user = getCurrentUser(); if(!user) return;
  let posts = getPosts(); const p = posts.find(x => x.id === id); if(!p) return;
  if(!p.likes) p.likes = []; if(!p.dislikes) p.dislikes = [];
  const idx = p.likes.indexOf(user.username);
  if(idx === -1) { p.likes.push(user.username); const dIdx = p.dislikes.indexOf(user.username); if(dIdx !== -1) p.dislikes.splice(dIdx, 1); } else { p.likes.splice(idx, 1); }
  savePosts(posts);
  if (typeof fbDb !== 'undefined' && fbReady) await fbDb.collection('shared_feed').doc(id).update({ likes: p.likes, dislikes: p.dislikes });
  socRenderFeed();
};

window.socDislikePost = async function(id) {
  const user = getCurrentUser(); if(!user) return;
  let posts = getPosts(); const p = posts.find(x => x.id === id); if(!p) return;
  if(!p.likes) p.likes = []; if(!p.dislikes) p.dislikes = [];
  const idx = p.dislikes.indexOf(user.username);
  if(idx === -1) { p.dislikes.push(user.username); const lIdx = p.likes.indexOf(user.username); if(lIdx !== -1) p.likes.splice(lIdx, 1); } else { p.dislikes.splice(idx, 1); }
  savePosts(posts);
  if (typeof fbDb !== 'undefined' && fbReady) await fbDb.collection('shared_feed').doc(id).update({ likes: p.likes, dislikes: p.dislikes });
  socRenderFeed();
};

window.socDeletePost = async function(id) {
  const user = getCurrentUser();
  if (!user) return;
  let posts = getPosts();
  const p = posts.find(x => x.id === id);
  if (!p || p.author !== user.username) return;

  if (!confirm(currentLang === 'ro' ? 'Ești sigur că vrei să ștergi această postare?' : 'Are you sure you want to delete this post?')) return;

  const newPosts = posts.filter(x => x.id !== id);
  savePosts(newPosts);

  if (typeof fbDb !== 'undefined' && fbReady) {
    try { await fbDb.collection('shared_feed').doc(id).delete(); } catch(e) {}
  }
  socRenderFeed();
};

window.socAddComment = async function(id) {
  const user = getCurrentUser(); if(!user) return;
  const inp = document.getElementById(`comm-input-${id}`);
  const text = inp?.value?.trim(); if(!text) return;
  let posts = getPosts(); const p = posts.find(x => x.id === id); if(!p) return;
  if(!p.comments) p.comments = [];
  p.comments.push({ author: user.username, text: text, date: Date.now() });
  savePosts(posts);
  if (typeof fbDb !== 'undefined' && fbReady) await fbDb.collection('shared_feed').doc(id).update({ comments: p.comments });
  inp.value = ''; socRenderFeed();
};

async function socRenderFeed() {
  const list = document.getElementById('soc-feed-list'); if (!list) return;
  if (typeof fbDb !== 'undefined' && fbReady && !window._feedSynced) {
    try {
      const snap = await fbDb.collection('shared_feed').orderBy('postedAt', 'desc').limit(50).get();
      const cloudPosts = []; snap.forEach(doc => cloudPosts.push(doc.data()));
      if (cloudPosts.length > 0) { savePosts(cloudPosts); window._feedSynced = true; }
    } catch(e) {}
  }
  const posts = getPosts().sort((a,b) => b.postedAt - a.postedAt);
  if (!posts.length) { list.innerHTML = `<div class="soc-empty" style="padding:40px; text-align:center; opacity:0.4;">Nu există postări globale.</div>`; return; }
  const allUsers = getUsers(); const user = getCurrentUser();
  const curr = typeof getCurrency === 'function' ? getCurrency() : 'RON';

  list.innerHTML = posts.map(p => {
    const authorUser = allUsers[p.author?.toLowerCase()];
    const tickets = p.tickets || [];
    const liked = p.likes && user && p.likes.includes(user.username);
    const disliked = p.dislikes && user && p.dislikes.includes(user.username);
    const isMyPost = user && p.author === user.username;

    const ticketsHtml = tickets.map(t => {
      const statusLabel = t.status === 'win' ? (currentLang === 'ro' ? 'CÂȘTIGĂTOR' : 'WINNER') :
                         t.status === 'loss' ? (currentLang === 'ro' ? 'PIERDUT' : 'LOST') :
                         t.status === 'cashout' ? (currentLang === 'ro' ? 'CASHOUT' : 'CASHOUT') :
                         (currentLang === 'ro' ? 'ÎN AȘTEPTARE' : 'PENDING');

      const stampClass = t.status === 'win' ? 'stamp-win' :
                        t.status === 'loss' ? 'stamp-loss' :
                        t.status === 'cashout' ? 'stamp-win' : 'stamp-pending';

      let eventsHtml = '';
      if (t.events && t.events.length > 0) {
        const grouped = {};
        t.events.forEach(ev => {
          const matchName = ev.match || ev.name || "Meci";
          if (!grouped[matchName]) grouped[matchName] = [];
          grouped[matchName].push(ev);
        });

        Object.keys(grouped).forEach(matchName => {
          const matchEvents = grouped[matchName];
          const leagueName = matchEvents[0].league || "";
          eventsHtml += `
            <div class="soc-event-row">
              ${leagueName ? `<div style="font-size:9px; color:#888; text-transform:uppercase; font-weight:700; margin-bottom:2px; letter-spacing:0.5px;">${leagueName}</div>` : ''}
              <span class="soc-ev-match" style="color:#000;">⚽ ${matchName}</span>
              ${matchEvents.map(ev => `
                <div class="soc-ev-market-line">
                  <span class="soc-ev-market" style="color:#555;">${ev.market || (currentLang === 'ro' ? 'Pronostic' : 'Market')}</span>
                  <span class="soc-ev-odds" style="color:#000;">@${(ev.odds || 0).toFixed(2)}</span>
                </div>
              `).join('')}
            </div>`;
        });
      }

      const dateStr = p.postedAt ? new Date(p.postedAt).toLocaleDateString(currentLang === 'ro' ? 'ro-RO' : 'en-GB', { day: '2-digit', month: 'short' }) : '-';
      const payoutVal = t.status === 'cashout' ? (t.cashoutAmount || 0).toFixed(2) : (t.status === 'loss' ? '0.00' : (t.stake * t.odds).toFixed(2));
      const payoutColor = t.status === 'win' || t.status === 'pending' ? '#2e7d32' : t.status === 'loss' ? '#d32f2f' : '#b8860b';

      return `
        <div class="soc-ticket-realistic" style="margin-bottom:15px; background:#fff !important; color:#000 !important;">
          <div class="soc-ticket-header">
            <span class="soc-ticket-brand" style="font-family:'Rajdhani', sans-serif; font-weight:900; font-size:22px; letter-spacing:2px; color:#000;">rGdbet</span>
            <div style="display:flex; align-items:center; gap:10px;">
                <button class="ticket-share-btn" onclick="if(window.shareTicket) shareTicket('${p.id}'); else alert('Loading...');">
                  <i class="fa-solid fa-share-nodes"></i>
                </button>
                <span class="soc-ticket-stamp ${stampClass}">${statusLabel}</span>
            </div>
          </div>
          <div class="soc-ticket-body">${eventsHtml}</div>
          <div class="soc-ticket-footer" style="border-top: 1px dashed #000; padding-top:15px; margin-top:15px;">
            <div class="soc-total-odds-box">
              <div class="soc-total-lbl">COTĂ TOTALĂ</div>
              <div class="soc-total-val" style="color:#000;">@${(t.odds || 0).toFixed(2)}</div>
            </div>
            <div style="text-align:right;">
              <div class="soc-total-lbl">${(currentLang === 'ro' ? 'Miză' : 'Stake').toUpperCase()}</div>
              <div style="font-weight:900; font-size:18px; color:#000;">${t.stake || '-'} ${curr}</div>
            </div>
          </div>
          <div class="soc-ticket-footer" style="border:none; margin-top:5px; padding-top:0;">
             <div class="soc-total-odds-box">
                <div class="soc-total-lbl">${currentLang === 'ro' ? 'CÂȘTIG POSIBIL' : 'POTENTIAL PAYOUT'}</div>
                <div style="font-weight:900; font-size:20px; color:${payoutColor};">
                  ${payoutVal} ${curr}
                </div>
             </div>
             <div style="text-align:right;">
                <div class="soc-total-lbl">DATA</div>
                <div style="font-weight:700; font-size:12px; color:#666;">${dateStr}</div>
             </div>
          </div>
          <div class="soc-barcode-area">
            <div class="soc-barcode"></div>
            <div class="soc-ticket-id">REF-${p.id.split('_')[1] || p.id}</div>
          </div>
        </div>`;
    }).join('');

    return `
    <div class="soc-post-card">
      <div class="soc-post-header">
        <div class="soc-post-avatar" onclick="viewUserProfile('${p.author}')">${renderAvatarContent(authorUser?.avatar)}</div>
        <div class="soc-post-meta">
          <div class="soc-post-author" onclick="viewUserProfile('${p.author}')">@${p.author} ${getVerificationBadge(p.author)}</div>
          <div class="soc-post-date">${new Date(p.postedAt).toLocaleTimeString()}</div>
        </div>
        <div class="soc-post-actions">
          ${isMyPost ? `<button class="soc-action-ico danger" onclick="socDeletePost('${p.id}')" title="Șterge"><i class="fa-solid fa-trash-can"></i></button>` : ''}
        </div>
      </div>
      <div class="soc-post-content">${ticketsHtml}</div>
      <div class="soc-interactions">
        <button class="soc-int-btn like ${liked ? 'active' : ''}" onclick="socLikePost('${p.id}')"><i class="fa-${liked ? 'solid' : 'regular'} fa-thumbs-up"></i> ${p.likes?.length || 0}</button>
        <button class="soc-int-btn dislike ${disliked ? 'active' : ''}" onclick="socDislikePost('${p.id}')"><i class="fa-${disliked ? 'solid' : 'regular'} fa-thumbs-down"></i> ${p.dislikes?.length || 0}</button>
        <div class="soc-int-btn"><i class="fa-regular fa-comment"></i> ${p.comments?.length || 0}</div>
      </div>
      <div class="soc-comments-section">
        <div id="comm-list-${p.id}">${(p.comments || []).map(c => `<div class="soc-comment-item"><span class="soc-comment-author">@${c.author}</span><span class="soc-comment-text">${c.text}</span></div>`).join('')}</div>
        <div class="soc-comment-input-wrap">
          <input type="text" class="soc-comment-input" id="comm-input-${p.id}" placeholder="Comentează...">
          <button class="soc-comment-send" onclick="socAddComment('${p.id}')"><i class="fa-solid fa-paper-plane"></i></button>
        </div>
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
  if (tab === 'rank') socRenderRank();
  if (tab === 'search') socRenderSearch();
};

function socRenderRank() {
  const container = document.getElementById('soc-panel-rank'); if (!container) return;
  const allUsers = getUsers(); const posts = getPosts(); const currentUser = getCurrentUser();
  const leaderData = {};
  Object.values(allUsers).forEach(u => { leaderData[u.username] = { username: u.username, avatar: u.avatar, xp: u.xp || 0, total: 0, wins: 0, wr: 0 }; });
  posts.forEach(p => { if (!leaderData[p.author]) leaderData[p.author] = { username: p.author, avatar: '👤', xp: 0, total: 0, wins: 0, wr: 0 }; const tickets = p.tickets || []; tickets.forEach(t => { leaderData[p.author].total++; if (t.status === 'win') leaderData[p.author].wins++; }); });
  const ranking = Object.values(leaderData).map(u => { u.wr = u.total > 0 ? Math.round((u.wins / u.total) * 100) : 0; u.score = (u.total * 10) + (u.wr * 5) + (u.xp * 0.1); return u; });
  ranking.sort((a, b) => b.score - a.score);
  const top10 = ranking.slice(0, 10);
  let html = `<div class="rank-list" style="padding:10px 16px 80px;"><div style="margin-bottom:20px; font-size:18px; color:#fff; text-shadow: 0 0 15px var(--nb), 0 0 30px var(--nb); text-align:center; font-family:'Syncopate'; font-weight:800; letter-spacing:2px;">TOP 10 ELITE ANALYSTS</div>`;
  top10.forEach((u, idx) => { const isMe = currentUser && u.username === currentUser.username; html += `<div class="rank-card" style="display:flex; align-items:center; gap:12px; background:rgba(255,255,255,0.03); border:1px solid ${isMe ? 'var(--nb)' : 'rgba(255,255,255,0.07)'}; border-radius:18px; padding:12px; margin-bottom:10px;"><div style="width:30px;">#${idx+1}</div><div class="rank-avatar">${renderAvatarContent(u.avatar)}</div><div style="flex:1;"><div style="font-weight:700; font-size:14px;">@${u.username}</div><div style="font-size:10px; opacity:0.5;">${u.total} BILETE</div></div><div style="text-align:right;"><div style="font-size:16px; font-weight:800; color:var(--ng);">${u.wr}%</div></div></div>`; });
  container.innerHTML = html + `</div>`;
}

function socRenderSearch() {
  const container = document.getElementById('soc-panel-search'); if (!container) return;
  container.innerHTML = `<div style="padding:15px 16px;"><div class="auth-input-wrap" style="margin-bottom:20px; background:rgba(255,255,255,0.05); border-radius:12px; border:1px solid rgba(0,200,255,0.2); padding:2px 10px;"><i class="fa-solid fa-magnifying-glass" style="color:var(--nb); margin-right:10px;"></i><input type="text" id="socSearchInput" placeholder="Caută analist..." style="background:none; border:none; color:#fff; padding:12px 0; width:100%; outline:none; font-family:'Rajdhani';" oninput="socPerformSearch(this.value)"></div><div id="socSearchResults"></div></div>`;
}

window.socPerformSearch = function(query) {
  const resultsContainer = document.getElementById('socSearchResults'); if (!resultsContainer) return;
  const q = query.trim().toLowerCase(); if (!q) { resultsContainer.innerHTML = ''; return; }
  const allUsers = getUsers(); const matches = Object.values(allUsers).filter(u => u.username && u.username.toLowerCase().includes(q));
  if (matches.length === 0) { resultsContainer.innerHTML = `<div style="text-align:center; padding:20px; opacity:0.5; font-size:13px;">Niciun utilizator găsit.</div>`; return; }
  resultsContainer.innerHTML = matches.map(u => { const vBadge = getVerificationBadge(u.username); return `<div class="rank-card" style="display:flex; align-items:center; gap:12px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.07); border-radius:18px; padding:12px; margin-bottom:10px; cursor:pointer;" onclick="viewUserProfile('${u.username}')"><div class="rank-avatar" style="width:45px; height:45px;">${renderAvatarContent(u.avatar)}</div><div style="flex:1;"><div style="font-weight:700; font-size:15px; color:#fff;">@${u.username} ${vBadge}</div><div style="font-size:10px; opacity:0.5; font-family:'Syncopate';">VEZI PROFIL COMPLET</div></div><i class="fa-solid fa-chevron-right"></i></div>`; }).join('');
};

window.buildSocialPage = function() {
  const page = document.getElementById('page-social'); if (!page) return;
  const user = getCurrentUser();
  page.innerHTML = `<div class="page-top-title"><i class="fa-solid fa-users" style="color:var(--ng)"></i><span>SOCIAL FEED</span></div><div class="soc-action-bar"><button class="soc-tab active" id="soc-tab-feed" onclick="socSwitchTab('feed')"><i class="fa-solid fa-fire"></i> FEED</button><button class="soc-tab" id="soc-tab-rank" onclick="socSwitchTab('rank')"><i class="fa-solid fa-trophy"></i> RANK</button><button class="soc-tab" id="soc-tab-search" onclick="socSwitchTab('search')"><i class="fa-solid fa-magnifying-glass"></i> CAUTĂ</button></div><div id="soc-panel-feed" class="soc-panel active">${user ? `<div style="padding:12px 16px 5px;"><button class="soc-post-btn" onclick="socOpenPostPicker()" style="width:100%; height:46px; background:linear-gradient(90deg, var(--nb), #fff); color:#000; border-radius:14px; font-weight:800; font-family:'Syncopate'; font-size:10px; letter-spacing:1px; border:none; box-shadow: 0 4px 15px rgba(0, 200, 255, 0.3);"><i class="fa-solid fa-plus-circle"></i> CREAZĂ O POSTARE</button></div>` : ''}<div id="soc-feed-list"></div></div><div id="soc-panel-rank" class="soc-panel"></div><div id="soc-panel-search" class="soc-panel"></div><div class="prof-avatar-modal" id="socPickModal"><div class="prof-avatar-box"><div class="prof-edit-title">ALEGE BILETELE</div><div id="socPickList"></div><div class="prof-edit-actions"><button onclick="document.getElementById('socPickModal').classList.remove('open')">ANULEAZĂ</button><button onclick="socConfirmPost()">POSTEAZĂ</button></div></div></div>`;
  socRenderFeed();
};

(async function init() {
  const user = getCurrentUser(); if (user && typeof authUpdateTopBar === 'function') authUpdateTopBar(user);
  if (typeof fbLoadSDK === 'function') { try { await fbLoadSDK(); socRenderFeed(); } catch(e) {} }
})();

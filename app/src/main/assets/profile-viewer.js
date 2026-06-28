/* ═══════════════════════════════════════════════════════════════
   profile-viewer.js — Vizualizare profil utilizator
   Permite oricărui utilizator autentificat să vadă profilul altui
   utilizator cu: statistici, bilete postate, status prietenie,
   acțiuni (follow, send message, send friend request)
   rGdbet v3.2 — Social Betting Network
═══════════════════════════════════════════════════════════════ */
'use strict';

/* ── State ── */
let _viewingUser = null; // username-ul profilului vizualizat

/* ═══ API PUBLICĂ ═══════════════════════════════════════════ */

/**
 * Deschide profilul unui utilizator
 * Poate fi apelat din: social feed, search, mesaje
 */
window.viewUserProfile = function(username) {
  if (!username) return;

  const me    = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
  const users = typeof getUsers       === 'function' ? getUsers()       : {};
  const target = users[username.toLowerCase()];

  if (!target) {
    if (typeof showMsgToast === 'function')
      showMsgToast('Profilul @' + username + ' nu a fost găsit.', 'error');
    return;
  }

  /* Dacă e propriul profil → navigăm la pagina profil normală */
  if (me && me.username.toLowerCase() === username.toLowerCase()) {
    if (typeof navigateTo === 'function')
      navigateTo('profile', document.querySelector('.nav-btn[data-page="profile"]'));
    return;
  }

  _viewingUser = username.toLowerCase();

  /* Injectăm overlay-ul de profil */
  renderProfileViewer(target, me);
};

/* ═══ RENDER PROFIL VIEWER ══════════════════════════════════ */
function renderProfileViewer(targetUser, me) {
  /* Ștergem overlay anterior dacă există */
  const existing = document.getElementById('pv-overlay');
  if (existing) existing.remove();

  // Helper pentru afișare avatar (Emoji sau Imagine)
  const renderAvatarContent = (av) => {
    if (!av || av === 'default' || av === '👤') return '👤';
    if (av.startsWith('data:') || av.startsWith('http')) {
      return `<img src="${av}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" />`;
    }
    return av;
  };

  const av = renderAvatarContent(targetUser.avatar);
  const joinDate = new Date(targetUser.joinedAt || Date.now())
    .toLocaleDateString('ro-RO', { year: 'numeric', month: 'long' });

  /* Statusuri relație */
  const follows   = typeof getFollows   === 'function' ? getFollows()   : {};
  const friends_d = typeof getFriends   === 'function' ? (function(){try{return JSON.parse(localStorage.getItem('rgb_friends')||'{}')}catch{return{}}})() : {};
  const myKey     = me ? me.username.toLowerCase() : null;
  const targetKey = targetUser.username.toLowerCase();

  const isFollowing = myKey && (follows[myKey] || []).includes(targetKey);
  const isFriend_   = myKey && (friends_d[myKey] || []).includes(targetKey);

  /* Cerere prietenie în așteptare */
  const reqs = (function(){ try { return JSON.parse(localStorage.getItem('rgb_friend_reqs') || '{}'); } catch { return {}; }})();
  const sentReq = myKey && (reqs[targetKey] || []).find(r => r.from === myKey && r.status === 'pending');
  const receivedReq = myKey && (reqs[myKey] || []).find(r => r.from === targetKey && r.status === 'pending');

  /* Statistici utilizator țintă */
  const stats = calcTargetStats(targetUser.username);

  /* Privacy check */
  const priv = targetUser.privacy || 'public';
  const canSeeStats  = priv === 'public' || isFriend_;
  const canSeePosts  = priv === 'public' || (priv === 'followers' && isFollowing) || isFriend_;

  /* Bilete postate în social */
  const allPosts = (function(){ try { return JSON.parse(localStorage.getItem('rgb_social_feed') || '[]'); } catch { return []; }})();
  const userPosts = canSeePosts
    ? allPosts.filter(p => p.author?.toLowerCase() === targetKey).slice(0, 10)
    : [];

  const overlay = document.createElement('div');
  overlay.id    = 'pv-overlay';
  overlay.className = 'pv-overlay';
  overlay.innerHTML = `
    <div class="pv-container">

      <!-- Header -->
      <div class="pv-header">
        <button class="pv-back" onclick="closeProfileViewer()">
          <i class="fa-solid fa-chevron-left"></i>
        </button>
        <div class="pv-header-title">PROFIL</div>
        <div style="width:36px;"></div>
      </div>

      <!-- Hero -->
      <div class="pv-hero">
        <div class="pv-avatar">${av}</div>
        <div class="pv-username">@${targetUser.username}</div>
        ${targetUser.email ? `<div class="pv-email">${targetUser.email}</div>` : ''}
        <div class="pv-joined">Membru din ${joinDate}</div>
        <div class="pv-privacy-badge ${getPvPrivacyClass(priv)}">
          ${getPrivacyIcon(priv)} ${getPrivacyLabel(priv)}
        </div>
      </div>

      <!-- Acțiuni (doar dacă e logat) -->
      ${me ? `
      <div class="pv-actions">
        <!-- Follow -->
        <button class="pv-action-btn ${isFollowing ? 'pv-btn-following' : 'pv-btn-follow'}"
                id="pvFollowBtn"
                onclick="pvToggleFollow('${targetUser.username}')">
          <i class="fa-solid fa-${isFollowing ? 'user-check' : 'user-plus'}"></i>
          ${isFollowing ? 'Urmărești' : 'Urmărește'}
        </button>

        <!-- Friend / Mesaj -->
        ${isFriend_ ? `
          <button class="pv-action-btn pv-btn-msg"
                  onclick="pvOpenChat('${targetUser.username}')">
            <i class="fa-solid fa-comment-dots"></i> Mesaj
          </button>` :
        receivedReq ? `
          <button class="pv-action-btn pv-btn-accept"
                  onclick="respondFriendRequest('${targetUser.username}',true)">
            <i class="fa-solid fa-check"></i> Acceptă cererea
          </button>` :
        sentReq ? `
          <button class="pv-action-btn pv-btn-pending" disabled>
            <i class="fa-solid fa-clock"></i> Cerere trimisă
          </button>` : `
          <button class="pv-action-btn pv-btn-friend"
                  id="pvFriendBtn"
                  onclick="pvSendRequest('${targetUser.username}')">
            <i class="fa-solid fa-handshake"></i> Adaugă prieten
          </button>`
        }
      </div>` : `
      <div class="pv-actions">
        <button class="pv-action-btn pv-btn-follow" onclick="authShowScreen()">
          <i class="fa-solid fa-right-to-bracket"></i> Loghează-te pentru acțiuni
        </button>
      </div>`}

      <!-- Statistici -->
      <div class="pv-stats-section">
        <div class="pv-section-title">
          <i class="fa-solid fa-chart-bar"></i> STATISTICI
          ${!canSeeStats ? '<span class="pv-locked-badge">🔒 Privat</span>' : ''}
        </div>
        ${canSeeStats ? `
        <div class="pv-stats-grid">
          <div class="pv-stat-card">
            <div class="pv-stat-val ${stats.profit >= 0 ? 'pv-pos' : 'pv-neg'}">
              ${stats.profit >= 0 ? '+' : ''}${stats.profit.toFixed(2)}
            </div>
            <div class="pv-stat-lbl">Profit (RON)</div>
          </div>
          <div class="pv-stat-card">
            <div class="pv-stat-val pv-blue">${stats.wr}%</div>
            <div class="pv-stat-lbl">Win Rate</div>
          </div>
          <div class="pv-stat-card">
            <div class="pv-stat-val">${stats.total}</div>
            <div class="pv-stat-lbl">Bilete</div>
          </div>
          <div class="pv-stat-card">
            <div class="pv-stat-val pv-green">${stats.wins}</div>
            <div class="pv-stat-lbl">Victorii</div>
          </div>
        </div>` : `
        <div class="pv-private-msg">
          <div style="font-size:32px;margin-bottom:8px;">${priv === 'private' ? '🔒' : '👥'}</div>
          <div style="font-family:Rajdhani,sans-serif;font-size:14px;color:rgba(255,255,255,.45);text-align:center;line-height:1.5;">
            ${priv === 'private'
              ? 'Acest profil este privat.'
              : 'Statisticile sunt vizibile doar pentru urmăritori.'}
          </div>
        </div>`}
      </div>

      <!-- Bilete postate -->
      <div class="pv-posts-section">
        <div class="pv-section-title">
          <i class="fa-solid fa-ticket"></i> BILETE POSTATE
          <span class="pv-posts-count">${userPosts.length}</span>
          ${!canSeePosts && priv !== 'public' ? '<span class="pv-locked-badge">🔒</span>' : ''}
        </div>
        ${!canSeePosts ? `
        <div class="pv-private-msg">
          <div style="font-size:28px;margin-bottom:8px;">🎫</div>
          <div style="font-family:Rajdhani,sans-serif;font-size:13px;color:rgba(255,255,255,.4);text-align:center;">
            ${priv === 'private'
              ? 'Profilul este privat.'
              : 'Trebuie să urmărești acest utilizator pentru a vedea biletele sale.'}
          </div>
        </div>` :
        userPosts.length === 0 ? `
        <div class="pv-private-msg">
          <div style="font-size:28px;margin-bottom:8px;">📭</div>
          <div style="font-family:Rajdhani,sans-serif;font-size:13px;color:rgba(255,255,255,.4);text-align:center;">
            Niciun bilet postat încă.
          </div>
        </div>` :
        userPosts.map(post => renderPvPost(post)).join('')
        }
      </div>

      <!-- Spațiu jos (nav) -->
      <div style="height:30px;"></div>
    </div>
  `;

  document.body.appendChild(overlay);
  /* Animație slide-in */
  requestAnimationFrame(() => overlay.classList.add('pv-visible'));
}

/* ── Render mini post card ── */
function renderPvPost(post) {
  const statusColor = post.status === 'win' ? '#00ff88'
    : post.status === 'loss' ? '#ff3366' : '#ffcc00';
  const statusIcon  = post.status === 'win' ? '✅'
    : post.status === 'loss' ? '❌' : '⏳';
  const odds   = parseFloat(post.totalOdds || post.odds || 1).toFixed(2);
  const dateStr = new Date(post.postedAt || 0)
    .toLocaleDateString('ro-RO', { day: '2-digit', month: 'short' });

  return `
    <div class="pv-post-card">
      <div class="pv-post-header">
        <div class="pv-post-title">${escPv(post.name || 'Bilet')}</div>
        <div class="pv-post-date">${dateStr}</div>
      </div>
      <div class="pv-post-events">
        ${(post.events || []).slice(0, 3).map(e => `
          <div class="pv-post-event">
            <span>${escPv(e.name || '')}</span>
            <span class="pv-post-odds">@${parseFloat(e.odds || 1).toFixed(2)}</span>
          </div>`).join('')}
        ${(post.events || []).length > 3
          ? `<div class="pv-post-more">+${post.events.length - 3} selecții</div>` : ''}
      </div>
      <div class="pv-post-footer">
        <div>
          <span style="font-family:Syncopate,sans-serif;font-size:8px;color:rgba(255,255,255,.3);">COTĂ</span>
          <span style="font-family:Syncopate,sans-serif;font-size:14px;color:var(--nb,#00c8ff);font-weight:700;margin-left:6px;">@${odds}</span>
        </div>
        <div style="display:flex;align-items:center;gap:6px;">
          <span style="color:${statusColor};font-size:14px;">${statusIcon}</span>
          <button class="pv-share-btn"
                  onclick="if(typeof openShareModal==='function')openShareModal(${JSON.stringify(post).replace(/"/g,'&quot;')})">
            <i class="fa-solid fa-share-nodes"></i>
          </button>
        </div>
      </div>
    </div>`;
}

/* ═══ ACȚIUNI ════════════════════════════════════════════════ */

window.closeProfileViewer = function() {
  const ov = document.getElementById('pv-overlay');
  if (!ov) return;
  ov.classList.remove('pv-visible');
  setTimeout(() => ov.remove(), 300);
  _viewingUser = null;
};

window.pvToggleFollow = function(username) {
  if (typeof socToggleFollow !== 'function') return;
  const btn = document.getElementById('pvFollowBtn');
  socToggleFollow(username, btn);
  /* Update buton */
  const follows_d = (function(){ try { return JSON.parse(localStorage.getItem('rgb_follows') || '{}'); } catch { return {}; }})();
  const me = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
  const myKey = me ? me.username.toLowerCase() : null;
  const isNowFollowing = myKey && (follows_d[myKey] || []).includes(username.toLowerCase());
  if (btn) {
    btn.className = 'pv-action-btn ' + (isNowFollowing ? 'pv-btn-following' : 'pv-btn-follow');
    btn.innerHTML = `<i class="fa-solid fa-${isNowFollowing ? 'user-check' : 'user-plus'}"></i> ${isNowFollowing ? 'Urmărești' : 'Urmărește'}`;
  }
};

window.pvSendRequest = function(username) {
  if (typeof sendFriendRequest === 'function') sendFriendRequest(username);
  const btn = document.getElementById('pvFriendBtn');
  if (btn) {
    btn.className  = 'pv-action-btn pv-btn-pending';
    btn.disabled   = true;
    btn.innerHTML  = '<i class="fa-solid fa-clock"></i> Cerere trimisă';
  }
};

window.pvOpenChat = function(username) {
  closeProfileViewer();
  setTimeout(() => {
    navigateTo('messages', document.querySelector('.nav-btn[data-page="messages"]'));
    setTimeout(() => openConversation(username.toLowerCase()), 250);
  }, 150);
};

/* ═══ STATISTICI UTILIZATOR ═════════════════════════════════ */
function calcTargetStats(username) {
  /* Statisticile sunt calculate din biletele POSTATE în social feed
     (biletele proprii sunt în localStorage propriu, nu accesibile altora) */
  const posts = (function(){ try { return JSON.parse(localStorage.getItem('rgb_social_feed') || '[]'); } catch { return []; }})();
  const userPosts = posts.filter(p => p.author?.toLowerCase() === username.toLowerCase());
  let wins = 0;
  let totalOdds = 0;
  let profit    = 0;
  const settled = userPosts.filter(p => p.status === 'win' || p.status === 'loss');
  settled.forEach(p => {
    const stake = parseFloat(p.stake || 10);
    const odds  = parseFloat(p.totalOdds || p.odds || 1);
    if (p.status === 'win') { wins++; profit += stake * (odds - 1); }
    else                    { profit -= stake; }
  });
  return {
    total:  userPosts.length,
    wins,
    wr:     settled.length ? Math.round((wins / settled.length) * 100) : 0,
    profit: parseFloat(profit.toFixed(2)),
  };
}

/* ═══ HELPERS ════════════════════════════════════════════════ */
function getPrivacyIcon(p)  { return p === 'public' ? '🌐' : p === 'followers' ? '👥' : '🔒'; }
function getPrivacyLabel(p) { return p === 'public' ? 'Public' : p === 'followers' ? 'Urmăritori' : 'Privat'; }
function getPvPrivacyClass(p){ return p === 'public' ? 'pv-priv-public' : p === 'followers' ? 'pv-priv-followers' : 'pv-priv-private'; }
function escPv(str) {
  return String(str||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
function getFriends() { try { return JSON.parse(localStorage.getItem('rgb_friends')||'{}'); } catch { return {}; } }
function getFollows() { try { return JSON.parse(localStorage.getItem('rgb_follows')||'{}'); } catch { return {}; } }

/* ═══ PATCH social.js — adaugă click pe @username în feed ═══ */
/* Interceptăm clicurile pe .soc-post-author pentru a deschide profilul */
(function patchSocialClicks() {
  document.addEventListener('click', function(e) {
    const authorEl = e.target.closest('.soc-post-author');
    if (!authorEl) return;
    const text = (authorEl.textContent || '').trim().replace('@', '');
    if (text) viewUserProfile(text);
  });

  /* Click pe avatar în social feed */
  document.addEventListener('click', function(e) {
    const avEl = e.target.closest('.soc-post-avatar[data-user]');
    if (!avEl) return;
    viewUserProfile(avEl.dataset.user);
  });
})();

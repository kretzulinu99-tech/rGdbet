/* ═══════════════════════════════════════════════════════════════
   profile-viewer.js — Vizualizare profil public (v9.2 Elite)
   Reutilizează componentele Elite pentru un aspect unitar.
═══════════════════════════════════════════════════════════════ */
'use strict';

window.viewUserProfile = function(username) {
  if (!username) return;

  const me = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
  const users = typeof getUsers === 'function' ? getUsers() : {};
  const target = users[username.toLowerCase()];

  if (!target) {
    alert('Utilizatorul @' + username + ' nu a fost găsit.');
    return;
  }

  /* Dacă e propriul profil → navigăm la pagina profil reală */
  if (me && me.username.toLowerCase() === username.toLowerCase()) {
    navigateTo('profile', document.querySelector('.nav-btn[data-page="profile"]'));
    return;
  }

  renderProfileViewerOverlay(target);
};

function renderProfileViewerOverlay(target) {
  /* Eliminăm overlay existent */
  const old = document.getElementById('pv-overlay');
  if (old) old.remove();

  const stats = calcTargetStats(target.username);
  const avDisplay = typeof renderAvatarContent === 'function' ? renderAvatarContent(target.avatar) : '👤';

  const xp = target.xp || 0;
  const lvl = typeof getUserLevelData === 'function' ? getUserLevelData(xp) : { level:1, progressPct:0 };

  const overlay = document.createElement('div');
  overlay.id = 'pv-overlay';
  overlay.className = 'pv-overlay';
  overlay.innerHTML = `
    <div class="pv-container">
      <div class="side-panel-close-btn" style="background:rgba(2,4,8,0.8); border-bottom:1px solid rgba(255,255,255,0.1);">
        <button onclick="closeProfileViewer()"><i class="fa-solid fa-arrow-left"></i></button>
        <span style="font-family:'Cinzel'; letter-spacing:3px;">PUBLIC PROFILE</span>
      </div>

      <div class="prof-hero-modern" style="padding-top:20px;">
        <div class="prof-avatar-modern">${avDisplay}</div>
        <div class="prof-name-container">
          <div class="prof-display-name">${target.displayName || target.username} ${typeof getVerificationBadge === 'function' ? getVerificationBadge(target.username) : ''}</div>
          <div class="prof-user-tag">@${target.username}</div>
        </div>

        <div class="xp-container" style="margin-top:15px;">
          <div class="xp-header">
            <div class="xp-level-badge">LVL ${lvl.level}</div>
            <div class="xp-total-text">${xp.toLocaleString()} XP</div>
          </div>
          <div class="xp-bar-outer"><div class="xp-bar-inner" style="width:${lvl.progressPct}%"></div></div>
        </div>
      </div>

      <div class="prof-stats-grid">
        <div class="prof-stat-card"><div class="prof-stat-val ${stats.profit >= 0 ? 'pos' : 'neg'}">${stats.profit >= 0 ? '+' : ''}${stats.profit.toFixed(0)}</div><div class="prof-stat-lbl">PROFIT</div></div>
        <div class="prof-stat-card"><div class="prof-stat-val" style="color:var(--nb)">${stats.wr}%</div><div class="prof-stat-lbl">WR</div></div>
        <div class="prof-stat-card"><div class="prof-stat-val">${stats.total}</div><div class="prof-stat-lbl">TICKETS</div></div>
      </div>

      <div class="prof-section-card">
        <div class="prof-section-title">ACTIVITY INSIGHTS</div>
        <div class="prof-row">
          <div class="prof-row-left">
            <div class="prof-row-icon blue"><i class="fa-solid fa-calendar-check"></i></div>
            <div class="prof-row-text">
              <span class="prof-row-label">Membru din</span>
              <span class="prof-row-sub">${new Date(target.joinedAt || Date.now()).toLocaleDateString('ro-RO', {year:'numeric', month:'long'})}</span>
            </div>
          </div>
        </div>
        <div class="prof-row">
          <div class="prof-row-left">
            <div class="prof-row-icon gold"><i class="fa-solid fa-medal"></i></div>
            <div class="prof-row-text">
              <span class="prof-row-label">Rank Global</span>
              <span class="prof-row-sub">Elite Member</span>
            </div>
          </div>
        </div>
      </div>

      <div style="padding:0 16px;">
        <button class="prof-action-btn" style="width:100%;" onclick="pvOpenChat('${target.username}')">
          <i class="fa-solid fa-comment-dots"></i> TRIMITE MESAJ
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  setTimeout(() => overlay.classList.add('pv-visible'), 10);
}

window.closeProfileViewer = function() {
  const ov = document.getElementById('pv-overlay');
  if (ov) {
    ov.classList.remove('pv-visible');
    setTimeout(() => ov.remove(), 300);
  }
};

window.pvOpenChat = function(username) {
  closeProfileViewer();
  setTimeout(() => {
    if (typeof openMessagesPanel === 'function') openMessagesPanel();
    // Presupunem că openConversation există în messages.js
    if (typeof openConversation === 'function') openConversation(username.toLowerCase());
  }, 100);
};

function calcTargetStats(username) {
  /* Statisticile publice sunt calculate din biletele POSTATE în feed.
     Dacă vrem să fim realiști, calculăm din baza de date globală dacă e disponibilă,
     dar momentan ne bazăm pe ce a postat utilizatorul. */
  const posts = (function(){ try { return JSON.parse(localStorage.getItem('rgb_social_feed') || '[]'); } catch { return []; }})();
  const userPosts = posts.filter(p => p.author?.toLowerCase() === username.toLowerCase());
  let wins = 0, profit = 0;
  const settled = userPosts.filter(p => p.status === 'win' || p.status === 'loss' || p.status === 'cashout');
  settled.forEach(p => {
    const s = parseFloat(p.stake || 10), o = parseFloat(p.totalOdds || p.odds || 1);
    if (p.status === 'win') { wins++; profit += s * (o - 1); }
    else if (p.status === 'loss') profit -= s;
    else if (p.status === 'cashout') profit += (p.cashoutAmount - s);
  });
  return { total: userPosts.length, wr: settled.length ? Math.round((wins/settled.length)*100) : 0, profit };
}

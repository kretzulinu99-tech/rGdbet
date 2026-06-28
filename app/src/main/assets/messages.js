/* ═══════════════════════════════════════════════════════════════
   messages.js — Sistem Mesagerie + Cereri Prietenie
   rGdbet v3.1 — Social Betting Network
   
   LocalStorage keys:
     rgb_messages      — toate conversațiile {convId: [{...}]}
     rgb_friend_reqs   — cereri prietenie {to: [{from, status, ts}]}
     rgb_friends       — liste prieteni {username: [username,...]}
     rgb_unread        — contoare necitite {username: {convId: count}}
═══════════════════════════════════════════════════════════════ */
'use strict';

/* ═══ STORAGE HELPERS ═══════════════════════════════════════ */
const MSK = {
  msgs:   'rgb_messages',
  reqs:   'rgb_friend_reqs',
  friends:'rgb_friends',
  unread: 'rgb_unread',
};

function getMessages()      { try { return JSON.parse(localStorage.getItem(MSK.msgs)    || '{}'); } catch { return {}; } }
function saveMessages(d)    { localStorage.setItem(MSK.msgs,    JSON.stringify(d)); }
function getFriendReqs()    { try { return JSON.parse(localStorage.getItem(MSK.reqs)    || '{}'); } catch { return {}; } }
function saveFriendReqs(d)  { localStorage.setItem(MSK.reqs,    JSON.stringify(d)); }
function getFriends()       { try { return JSON.parse(localStorage.getItem(MSK.friends) || '{}'); } catch { return {}; } }
function saveFriends(d)     { localStorage.setItem(MSK.friends, JSON.stringify(d)); }
function getUnread()        { try { return JSON.parse(localStorage.getItem(MSK.unread)  || '{}'); } catch { return {}; } }
function saveUnread(d)      { localStorage.setItem(MSK.unread,  JSON.stringify(d)); }

/* Generează ID conversație ordonat alfabetic */
function convId(a, b) {
  return [a.toLowerCase(), b.toLowerCase()].sort().join('::');
}

/* ═══ CERERI PRIETENIE ══════════════════════════════════════ */

/* Trimite cerere */
window.sendFriendRequest = function(toUsername) {
  const me = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
  if (!me) { if (typeof authShowScreen === 'function') authShowScreen(); return; }
  const from = me.username.toLowerCase();
  const to   = toUsername.toLowerCase();
  if (from === to) return;

  /* Verifică dacă sunt deja prieteni */
  const friends = getFriends();
  if ((friends[from] || []).includes(to)) {
    showMsgToast('Ești deja prieten cu @' + toUsername, 'info');
    return;
  }

  const reqs = getFriendReqs();
  if (!reqs[to]) reqs[to] = [];

  /* Verifică dacă există deja o cerere */
  if (reqs[to].find(r => r.from === from && r.status === 'pending')) {
    showMsgToast('Cerere deja trimisă lui @' + toUsername, 'info');
    return;
  }

  reqs[to].push({ from, status: 'pending', ts: Date.now() });
  saveFriendReqs(reqs);

  /* Trimitem un mesaj de sistem (notificare) destinatarului */
  const sysMsg = `👋 @${me.username} ți-a trimis o cerere de prietenie!`;
  sendMessage(toUsername, sysMsg, true); // true = system message

  showMsgToast('Cerere de prietenie trimisă lui @' + toUsername + '! 🤝', 'success');
  updateMsgBadge();
};

/* Răspunde la cerere */
window.respondFriendRequest = function(fromUsername, accept) {
  const me = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
  if (!me) return;
  const myKey   = me.username.toLowerCase();
  const fromKey = fromUsername.toLowerCase();
  const reqs    = getFriendReqs();

  if (!reqs[myKey]) return;
  const idx = reqs[myKey].findIndex(r => r.from === fromKey && r.status === 'pending');
  if (idx < 0) return;

  if (accept) {
    reqs[myKey][idx].status = 'accepted';
    /* Adaugă în lista de prieteni pentru ambii */
    const friends = getFriends();
    if (!friends[myKey])   friends[myKey]   = [];
    if (!friends[fromKey]) friends[fromKey] = [];
    if (!friends[myKey].includes(fromKey))   friends[myKey].push(fromKey);
    if (!friends[fromKey].includes(myKey))   friends[fromKey].push(myKey);
    saveFriends(friends);

    /* Notificare de acceptare */
    const sysMsg = `🎊 @${me.username} ți-a acceptat cererea de prietenie! Acum puteți comunica.`;
    sendMessage(fromUsername, sysMsg, true);

    showMsgToast('Ești acum prieten cu @' + fromUsername + '! 🎉', 'success');
  } else {
    reqs[myKey].splice(idx, 1); // Eliminăm cererea dacă e refuzată
  }
  saveFriendReqs(reqs);
  buildMessagesPage(true);
  updateMsgBadge();

  /* Refresh social feed dacă e vizibil pentru a actualiza iconițele de add/message */
  if (typeof socRenderFeed === 'function') socRenderFeed();
};

/* Obține cererile primite de user curent */
function getMyPendingRequests() {
  const me = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
  if (!me) return [];
  const reqs = getFriendReqs();
  return (reqs[me.username.toLowerCase()] || []).filter(r => r.status === 'pending');
}

/* Obține lista de prieteni */
function getMyFriends() {
  const me = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
  if (!me) return [];
  const friends = getFriends();
  return friends[me.username.toLowerCase()] || [];
}

/* Verifică dacă e prieten */
window.isFriend = function(username) {
  const friends = getMyFriends();
  return friends.includes(username.toLowerCase());
};

/* ═══ MESAGERIE ══════════════════════════════════════════════ */

/* ── Sunete ── */
const snd_send = new Audio('https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3');
const snd_recv = new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3');

let _lastTotalUnread = -1;

function playSendSnd() { snd_send.play().catch(()=>{}); }
function playRecvSnd() { snd_recv.play().catch(()=>{}); }

/* Trimite mesaj */
window.sendMessage = function(toUsername, text, isSystem = false) {
  const me = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
  if (!me || !text?.trim()) return false;
  const from = me.username.toLowerCase();
  const to   = toUsername.toLowerCase();
  const cid  = convId(from, to);
  const msgs  = getMessages();
  if (!msgs[cid]) msgs[cid] = [];
  msgs[cid].push({
    id:   Date.now() + '_' + Math.random().toString(36).substr(2, 5),
    from,
    to,
    text: text.trim(),
    ts:   Date.now(),
    read: false,
    isSystem: isSystem, // Marcăm dacă e mesaj de sistem
  });
  /* Limitează la 500 mesaje per conversație */
  if (msgs[cid].length > 500) msgs[cid] = msgs[cid].slice(-500);
  saveMessages(msgs);

  /* Incrementează necitiți pentru destinatar */
  const unread = getUnread();
  if (!unread[to]) unread[to] = {};
  unread[to][cid] = (unread[to][cid] || 0) + 1;
  saveUnread(unread);

  if (!isSystem) playSendSnd();
  return true;
};

/* Obține conversația */
function getConversation(otherUsername) {
  const me = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
  if (!me) return [];
  const cid  = convId(me.username.toLowerCase(), otherUsername.toLowerCase());
  const msgs  = getMessages();
  return msgs[cid] || [];
}

/* Marchează conversația ca citită */
function markConversationRead(otherUsername) {
  const me = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
  if (!me) return;
  const myKey = me.username.toLowerCase();
  const cid   = convId(myKey, otherUsername.toLowerCase());
  const unread = getUnread();
  if (unread[myKey]) { delete unread[myKey][cid]; saveUnread(unread); }
  /* Marchează și mesajele ca citite */
  const msgs = getMessages();
  if (msgs[cid]) {
    msgs[cid].forEach(m => { if (m.to === myKey) m.read = true; });
    saveMessages(msgs);
  }
  updateMsgBadge();
}

/* Numără necitiți total */
function getTotalUnread() {
  const me = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
  if (!me) return 0;
  const unread = getUnread();
  const myUnread = unread[me.username.toLowerCase()] || {};
  return Object.values(myUnread).reduce((s, v) => s + v, 0);
}

/* Update badge nav */
window.updateMsgBadge = function() {
  const pending  = getMyPendingRequests().length;
  const unreadN  = getTotalUnread();
  const total    = pending + unreadN;

  if (_lastTotalUnread !== -1 && unreadN > _lastTotalUnread) playRecvSnd();
  _lastTotalUnread = unreadN;

  const badge    = document.getElementById('navMsgBadge');
  const topBadge = document.getElementById('notifBadge');

  // Actualizăm ambele badge-uri (cel din nav bar și cel de sus de lângă iconița de mesaje)
  [badge, topBadge].forEach(b => {
    if (!b) return;
    if (total > 0) {
      b.textContent = total > 99 ? '99+' : total;
      b.style.display = 'flex';
    } else {
      b.style.display = 'none';
    }
  });
};

/* ═══ BUILD PAGINA MESAJE ════════════════════════════════════ */
let _activeConv = null; /* username-ul cu care chatăm acum */

window.buildMessagesPage = function(force = false) {
  /* Scriem in panoul lateral daca e deschis, altfel in page-messages */
  let page = null;
  const panelContent = document.getElementById('messages-panel-content');
  const panel = document.getElementById('messages-panel');
  if (panel && panel.classList.contains('open') && panelContent) {
    page = panelContent;
  } else {
    page = document.getElementById('page-messages');
  }
  if (!page) return;
  const me = typeof getCurrentUser === 'function' ? getCurrentUser() : null;

  if (!me) {
    page.innerHTML = `
      <div class="msg-login-prompt">
        <div style="font-size:52px;margin-bottom:14px;">💬</div>
        <div class="msg-section-title" style="font-size:13px;margin-bottom:10px;">MESAJE PRIVATE</div>
        <div style="font-family:Rajdhani,sans-serif;font-size:15px;color:rgba(255,255,255,.4);margin-bottom:18px;text-align:center;line-height:1.5;">
          Loghează-te pentru a trimite și primi mesaje de la prieteni.
        </div>
        <button class="msg-action-btn" onclick="authShowScreen()">
          <i class="fa-solid fa-right-to-bracket"></i> INTRĂ ÎN CONT
        </button>
      </div>`;
    return;
  }

  /* Dacă avem o conversație activă deschisă */
  if (_activeConv) {
    renderChatView(page, me, _activeConv);
    return;
  }

  /* Inbox principal */
  renderInboxView(page, me);
};

// Helper pentru afișare avatar (Emoji sau Imagine)
const renderAvatarContent = (av) => {
  if (!av || av === 'default' || av === '👤') return '👤';
  if (av.startsWith('data:') || av.startsWith('http')) {
    return `<img src="${av}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" />`;
  }
  return av;
};

/* ── INBOX ── */
function renderInboxView(page, me) {
  const pending = getMyPendingRequests();
  const myFriends = getMyFriends();
  const users   = typeof getUsers === 'function' ? getUsers() : {};
  const msgs    = getMessages();
  const unread  = getUnread();
  const myUnread = unread[me.username.toLowerCase()] || {};

  /* Construim lista conversații cu ultimul mesaj */
  const convList = myFriends.map(friendKey => {
    const cid  = convId(me.username.toLowerCase(), friendKey);
    const msgs_ = msgs[cid] || [];
    const last  = msgs_[msgs_.length - 1] || null;
    const unreadCount = myUnread[cid] || 0;
    return { username: friendKey, last, unreadCount, ts: last?.ts || 0 };
  }).sort((a, b) => b.ts - a.ts);

  page.innerHTML = `
    <div class="side-panel-close-btn">
      <button onclick="closeMessagesPanel ? closeMessagesPanel() : null"><i class="fa-solid fa-xmark"></i></button>
      <span>MESAJE</span>
    </div>
    <div class="page-top-title" style="display:none;">
      <i class="fa-solid fa-comment-dots" style="color:var(--nb)"></i>
      <span>MESAJE</span>
    </div>

    <!-- Cereri prietenie primite -->
    ${pending.length > 0 ? `
    <div class="msg-section">
      <div class="msg-section-title">
        <i class="fa-solid fa-user-plus"></i>
        CERERI DE PRIETENIE
        <span class="msg-badge-pill">${pending.length}</span>
      </div>
      ${pending.map(req => {
        const senderUser = users[req.from] || {};
        const av = renderAvatarContent(senderUser.avatar);
        return `
        <div class="msg-friend-req-card">
          <div class="msg-av">${av}</div>
          <div style="flex:1;">
            <div class="msg-username">@${req.from}</div>
            <div class="msg-preview-text">Vrea să fie prieten cu tine 🤝</div>
          </div>
          <div style="display:flex;gap:8px;flex-shrink:0;">
            <button class="msg-req-accept" onclick="respondFriendRequest('${req.from}',true)">
              <i class="fa-solid fa-check"></i> Accept
            </button>
            <button class="msg-req-reject" onclick="respondFriendRequest('${req.from}',false)">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>
        </div>`;
      }).join('')}
    </div>` : ''}

    <!-- Conversații -->
    <div class="msg-section">
      <div class="msg-section-title">
        <i class="fa-solid fa-inbox"></i>
        CONVERSAȚII
        ${convList.length === 0 ? '' : `<span class="msg-badge-pill">${convList.length}</span>`}
      </div>
      ${convList.length === 0 ? `
        <div class="msg-empty">
          <div style="font-size:36px;margin-bottom:8px;">💬</div>
          <div style="font-family:Syncopate,sans-serif;font-size:9px;color:rgba(255,255,255,.3);letter-spacing:1px;">
            NICIO CONVERSAȚIE ÎNCĂ<br>
            <span style="font-family:Rajdhani,sans-serif;font-size:11px;">
              Caută un prieten și trimite primul mesaj!
            </span>
          </div>
        </div>` :
        convList.map(c => {
          const friendUser = users[c.username] || {};
          const av = renderAvatarContent(friendUser.avatar);
          const lastText = c.last
            ? (c.last.from === me.username.toLowerCase()
                ? '📤 Tu: ' + c.last.text.substring(0, 35)
                : c.last.text.substring(0, 40))
            : 'Trimite primul mesaj...';
          const timeStr = c.last ? formatMsgTime(c.last.ts) : '';
          return `
          <div class="msg-conv-row ${c.unreadCount > 0 ? 'msg-conv-unread' : ''}"
               onclick="openConversation('${c.username}')">
            <div class="msg-av" style="position:relative;">
              ${av}
              ${c.unreadCount > 0 ? `<span class="msg-unread-dot">${c.unreadCount}</span>` : ''}
            </div>
            <div style="flex:1;min-width:0;">
              <div style="display:flex;justify-content:space-between;align-items:center;">
                <div class="msg-username">@${c.username}</div>
                <div class="msg-time">${timeStr}</div>
              </div>
              <div class="msg-preview-text">${escMsgHtml(lastText)}</div>
            </div>
          </div>`;
        }).join('')
      }
    </div>

    <!-- Caută prieteni noi -->
    <div class="msg-section">
      <div class="msg-section-title"><i class="fa-solid fa-magnifying-glass"></i> GĂSEȘTE PRIETENI</div>
      <div class="msg-search-wrap">
        <div class="auth-input-wrap">
          <i class="fa-solid fa-magnifying-glass auth-field-icon"></i>
          <input class="auth-input" id="msgSearchInp" type="text"
                 placeholder="Caută după username..."
                 oninput="msgSearchUsers(this.value)"
                 style="padding-left:38px;"/>
        </div>
        <div id="msgSearchResults" style="margin-top:10px;"></div>
      </div>
    </div>
  `;
}

/* ── CHAT VIEW ── */
function renderChatView(page, me, otherUsername) {
  const users  = typeof getUsers === 'function' ? getUsers() : {};
  const other  = users[otherUsername.toLowerCase()] || { username: otherUsername };
  const av     = renderAvatarContent(other.avatar);
  const conv   = getConversation(otherUsername);
  markConversationRead(otherUsername);
  const myKey  = me.username.toLowerCase();

  page.innerHTML = `
    <!-- Header chat -->
    <div class="msg-chat-header">
      <button class="msg-back-btn" onclick="closeConversation()">
        <i class="fa-solid fa-chevron-left"></i>
      </button>
      <div class="msg-av" style="width:40px;height:40px;font-size:22px;">${av}</div>
      <div>
        <div class="msg-username" style="font-size:15px;">@${other.username || otherUsername}</div>
        <div class="msg-time">Prieten • Chat privat</div>
      </div>
    </div>

    <!-- Mesaje -->
    <div class="msg-chat-list" id="msgChatList">
      ${conv.length === 0 ? `
        <div class="msg-empty" style="margin-top:40px;">
          <div style="font-size:40px;margin-bottom:8px;">👋</div>
          <div style="font-family:Rajdhani,sans-serif;color:rgba(255,255,255,.35);font-size:14px;">
            Începe conversația! Trimite primul mesaj.
          </div>
        </div>` :
        conv.map(m => renderMsgBubble(m, myKey)).join('')
      }
    </div>

    <!-- Input mesaj -->
    <div class="msg-input-bar">
      <input class="msg-input" id="msgInputField" type="text"
             placeholder="Scrie un mesaj..."
             onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();msgSendCurrent();}"
             autocomplete="off" maxlength="500"/>
      <button class="msg-send-btn" onclick="msgSendCurrent()">
        <i class="fa-solid fa-paper-plane"></i>
      </button>
    </div>
  `;

  /* Scroll la jos */
  setTimeout(() => {
    const list = document.getElementById('msgChatList');
    if (list) list.scrollTop = list.scrollHeight;
    document.getElementById('msgInputField')?.focus();
  }, 80);
}

function renderMsgBubble(msg, myKey) {
  const isMe   = msg.from === myKey;
  const time   = formatMsgTime(msg.ts);

  if (msg.isSystem) {
    return `
      <div class="msg-bubble-row" style="justify-content:center;margin:10px 0;">
        <div style="background:rgba(255,255,255,0.05);padding:6px 16px;border-radius:20px;border:1px dashed rgba(0,200,255,0.3);font-size:12px;color:rgba(255,255,255,0.6);font-family:Rajdhani,sans-serif;">
          ${escMsgHtml(msg.text)}
        </div>
      </div>`;
  }

  return `
    <div class="msg-bubble-row ${isMe ? 'msg-bubble-row-me' : 'msg-bubble-row-other'}">
      <div class="msg-bubble ${isMe ? 'msg-bubble-me' : 'msg-bubble-other'}">
        ${escMsgHtml(msg.text)}
        <div class="msg-bubble-time">${time} ${isMe && msg.read ? '<i class="fa-solid fa-check-double" style="color:var(--ng)"></i>' : ''}</div>
      </div>
    </div>`;
}

/* ── Deschide / Închide conversație ── */
window.openConversation = function(username) {
  _activeConv = username;
  let page = null;
  const panelContent = document.getElementById('messages-panel-content');
  const panel = document.getElementById('messages-panel');
  if (panel && panel.classList.contains('open') && panelContent) {
    page = panelContent;
  } else {
    page = document.getElementById('page-messages');
  }
  const me = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
  if (page && me) renderChatView(page, me, username);
};

window.closeConversation = function() {
  _activeConv = null;
  let page = null;
  const panelContent = document.getElementById('messages-panel-content');
  const panel = document.getElementById('messages-panel');
  if (panel && panel.classList.contains('open') && panelContent) {
    page = panelContent;
  } else {
    page = document.getElementById('page-messages');
  }
  const me = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
  if (page && me) renderInboxView(page, me);
};

/* ── Trimite mesaj curent ── */
window.msgSendCurrent = function() {
  if (!_activeConv) return;
  const inp = document.getElementById('msgInputField');
  const text = (inp?.value || '').trim();
  if (!text) return;
  const ok = sendMessage(_activeConv, text);
  if (!ok) return;
  if (inp) inp.value = '';
  /* Adaugă bubble fără rebuild complet */
  const list = document.getElementById('msgChatList');
  const me   = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
  if (list && me) {
    const emptyDiv = list.querySelector('.msg-empty');
    if (emptyDiv) emptyDiv.remove();
    const bubble = document.createElement('div');
    bubble.innerHTML = renderMsgBubble({
      from: me.username.toLowerCase(),
      text, ts: Date.now(), read: false
    }, me.username.toLowerCase());
    list.appendChild(bubble.firstElementChild);
    list.scrollTop = list.scrollHeight;
  }
};

/* ── Căutare utilizatori pentru mesaje ── */
window.msgSearchUsers = function(query) {
  const res = document.getElementById('msgSearchResults');
  if (!res) return;

  /* Căutare instantanee de la 1 caracter */
  if (!query || query.trim().length < 1) { res.innerHTML = ''; return; }

  const me      = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
  if (!me) return;
  const myKey   = me.username.toLowerCase();
  const users   = typeof getUsers === 'function' ? getUsers() : {};
  const friends = getFriends();
  const myFriends = friends[myKey] || [];
  const reqs    = getFriendReqs();

  const q = query.toLowerCase().trim();
  const matches = Object.values(users).filter(u =>
    u.username.toLowerCase() !== myKey &&
    ((u.username && u.username.toLowerCase().includes(q)) ||
     (u.email && u.email.toLowerCase().includes(q)))
  );
  if (!matches.length) {
    res.innerHTML = `<div style="font-family:Rajdhani,sans-serif;color:rgba(255,255,255,.35);font-size:13px;padding:10px 0;">Niciun utilizator găsit.</div>`;
    return;
  }

  res.innerHTML = matches.map(u => {
    const uKey = u.username.toLowerCase();
    const av   = renderAvatarContent(u.avatar);
    const alreadyFriend = myFriends.includes(uKey);
    /* Verifică dacă a trimis deja cerere */
    const sentReq = (reqs[uKey] || []).find(r => r.from === myKey && r.status === 'pending');
    let actionBtn = '';
    if (alreadyFriend) {
      actionBtn = `<button class="msg-req-accept" onclick="openConversation('${uKey}')">
        <i class="fa-solid fa-comment"></i> Chat
      </button>`;
    } else if (sentReq) {
      actionBtn = `<button class="msg-req-reject" disabled style="opacity:.5;cursor:default;">
        Cerere trimisă
      </button>`;
    } else {
      actionBtn = `<button class="msg-req-accept" onclick="sendFriendRequest('${u.username}');msgSearchUsers(document.getElementById('msgSearchInp')?.value||'')">
        <i class="fa-solid fa-user-plus"></i> Add
      </button>`;
    }
    return `
      <div class="msg-conv-row" style="cursor:default;">
        <div class="msg-av">${av}</div>
        <div style="flex:1;">
          <div class="msg-username">@${u.username}</div>
          <div class="msg-preview-text">${alreadyFriend ? '👫 Prieten' : '👤 Utilizator'}</div>
        </div>
        ${actionBtn}
      </div>`;
  }).join('');
};

/* ═══ TOAST MESAJE ═══════════════════════════════════════════ */
function showMsgToast(text, type = 'info') {
  let toast = document.getElementById('msg-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'msg-toast';
    document.body.appendChild(toast);
  }
  toast.className   = `msg-toast msg-toast-${type} msg-toast-visible`;
  toast.textContent = text;
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove('msg-toast-visible'), 3500);
}

/* ═══ HELPERS ════════════════════════════════════════════════ */
function formatMsgTime(ts) {
  if (!ts) return '';
  const d    = new Date(ts);
  const now  = new Date();
  const diff = (now - d) / 1000;
  if (diff < 60)    return 'acum';
  if (diff < 3600)  return Math.floor(diff / 60) + 'm';
  if (diff < 86400) return Math.floor(diff / 3600) + 'h';
  return d.toLocaleDateString('ro-RO', { day: '2-digit', month: 'short' });
}

function escMsgHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* ═══ EXPUNE API PUBLIC (folosit din social.js) ══════════════ */
window.msApi = {
  sendFriendRequest,
  respondFriendRequest,
  isFriend: window.isFriend,
  getMyFriends,
  getTotalUnread,
  updateMsgBadge,
};

/* ═══ INIT ═══════════════════════════════════════════════════ */
(function msgInit() {
  function run() {
    updateMsgBadge();
    /* Refresh badge periodic */
    setInterval(updateMsgBadge, 10000);
  }
  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', run);
  else
    run();
})();

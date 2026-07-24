/* ═══════════════════════════════════════════════════════════════
   messages.js — Sistem Mesagerie "Apex Instant" (Facebook Style)
   rGdbet v3.5 Elite Social - Persistence & Media Fixed
═══════════════════════════════════════════════════════════════ */
'use strict';

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

function convId(a, b) {
  return [a.toLowerCase(), b.toLowerCase()].sort().join('::');
}

/* ── PERSISTENCE: SYNC FROM FIRESTORE ── */
async function syncFriendsFromFirestore() {
  const me = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
  if (!me || typeof fbDb === 'undefined' || !fbReady) return;
  const myKey = me.username.toLowerCase();

  try {
    // 1. Pull All Reqs for me
    const reqSnap = await fbDb.collection('friend_requests').where('to', '==', myKey).get();
    const allReqs = getFriendReqs();
    allReqs[myKey] = reqSnap.docs.map(d => d.data());
    saveFriendReqs(allReqs);

    // 2. Pull All Friends (accepted reqs where I am participant)
    const friendsList = new Set();
    const sentReqs = await fbDb.collection('friend_requests').where('from', '==', myKey).where('status', '==', 'accepted').get();
    sentReqs.docs.forEach(d => friendsList.add(d.data().to));

    const recvReqs = await fbDb.collection('friend_requests').where('to', '==', myKey).where('status', '==', 'accepted').get();
    recvReqs.docs.forEach(d => friendsList.add(d.data().from));

    const f = getFriends();
    f[myKey] = Array.from(friendsList);
    saveFriends(f);

    // 3. Sync Messages (pull last 50 per active conversation)
    const msgs = getMessages();
    for (const other of f[myKey]) {
      const cid = convId(myKey, other);
      const mSnap = await fbDb.collection('chat_messages').where('cid', '==', cid).orderBy('ts', 'desc').limit(30).get();
      msgs[cid] = mSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a,b) => a.ts - b.ts);
    }
    saveMessages(msgs);

    showMsgToast("Cont sincronizat!", "success");
    buildMessagesPage();
  } catch(e) { console.error("Sync error:", e); }
}

/* ═══ CERERI PRIETENIE ══════════════════════════════════════ */
window.sendFriendRequest = async function(toUsername) {
  const me = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
  if (!me) { if (typeof authShowScreen === 'function') authShowScreen(); return; }
  const from = me.username.toLowerCase();
  const to   = toUsername.toLowerCase();
  if (from === to) return;

  if (typeof fbDb !== 'undefined' && fbReady) {
    try {
      await fbDb.collection('friend_requests').add({
        from, to, status: 'pending', ts: Date.now()
      });
      showMsgToast('Cerere trimisă! 🤝', 'success');
      sendMessage(toUsername, `👋 @${me.username} ți-a trimis o cerere de prietenie!`, true);
    } catch (e) { console.error("Req error:", e); }
  }
};

window.respondFriendRequest = async function(fromUsername, accept) {
  const me = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
  if (!me || !fbReady) return;
  const myKey = me.username.toLowerCase();
  const fromKey = fromUsername.toLowerCase();

  try {
    const snap = await fbDb.collection('friend_requests')
      .where('from', '==', fromKey).where('to', '==', myKey).where('status', '==', 'pending').get();
    if (snap.empty) return;
    const docId = snap.docs[0].id;

    if (accept) {
      await fbDb.collection('friend_requests').doc(docId).update({ status: 'accepted' });
      sendMessage(fromUsername, `🎊 @${me.username} ți-a acceptat cererea!`, true);
      showMsgToast('Acum sunteți prieteni! 🎉', 'success');
      syncFriendsFromFirestore();
    } else {
      await fbDb.collection('friend_requests').doc(docId).delete();
      buildMessagesPage();
    }
  } catch (e) { console.error("Resp error:", e); }
};

/* ═══ MESAGERIE "APEX INSTANT" ══════════════════════════════ */
const snd_send = new Audio('https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3');
const snd_recv = new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3');

let _msgUnsub = null;
let _typingUnsub = null;
let _partnerPresenceUnsub = null;
let _isOtherTyping = false;
let _typingTimeout = null;

function playSendSnd() { snd_send.play().catch(()=>{}); }
function playRecvSnd() { snd_recv.play().catch(()=>{}); }

window.sendMessage = async function(toUsername, text, isSystem = false, extra = null) {
  const me = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
  if (!me || (!text?.trim() && !extra)) return false;

  const from = me.username.toLowerCase();
  const to = toUsername.toLowerCase();
  const cid = convId(from, to);

  const msgData = {
    cid: cid,
    from: from,
    to: to,
    text: (text || '').trim(),
    ts: Date.now(),
    read: false,
    isSystem: isSystem,
    type: extra?.type || "text",
    data: extra?.data || null,
    reactions: {}
  };

  if (typeof fbDb !== 'undefined' && fbReady) {
    try {
      await fbDb.collection('chat_messages').add(msgData);
      if (!isSystem) playSendSnd();
      return true;
    } catch (e) {
      console.error("[Firestore] Eroare trimitere:", e);
      return false;
    }
  }
  return false;
};

/* ── TYPING INDICATOR ── */
window.msgHandleTyping = function() {
  const me = getCurrentUser();
  if (!me || !_activeConv || !fbReady) return;
  const cid = convId(me.username, _activeConv);
  const ref = fbDb.collection('typing_status').doc(`${cid}_${me.username.toLowerCase()}`);
  ref.set({ isTyping: true, ts: Date.now() }, { merge: true });
  clearTimeout(_typingTimeout);
  _typingTimeout = setTimeout(() => {
    ref.set({ isTyping: false, ts: Date.now() }, { merge: true });
  }, 2000);
};

/* ── IMAGE SHARING FIX ── */
window.msgTriggerImageUpload = function() {
  if (window.Android && typeof Android.selectChatImageFromPhone === 'function') {
    Android.selectChatImageFromPhone();
  } else {
    alert("Funcție disponibilă doar în aplicația mobilă rGdbet.");
  }
};

window.onChatImageUploaded = async function(base64Data) {
  if (!_activeConv) return;
  showMsgToast("Se trimite imaginea...", "info");

  // Trimitere ca mesaj special de tip "image"
  const ok = await sendMessage(_activeConv, "Imagine", false, {
    type: "image",
    data: base64Data
  });

  if (ok) {
    const list = document.getElementById('msgChatList');
    if (list) list.scrollTop = list.scrollHeight;
  }
};

/* ── UI RENDERING ── */
function renderMsgBubble(msg, myKey) {
  const isMe = msg.from === myKey;
  const time = formatMsgTime(msg.ts);

  if (msg.isSystem) {
    return `<div class="msg-bubble-row" style="justify-content:center;margin:10px 0;">
      <div style="background:rgba(255,255,255,0.05);padding:6px 16px;border-radius:20px;font-size:11px;color:rgba(255,255,255,0.5);">${escMsgHtml(msg.text)}</div>
    </div>`;
  }

  let content = `<div class="msg-text-content">${escMsgHtml(msg.text)}</div>`;
  if (msg.type === "ticket" && msg.data) {
    content = `<div class="chat-ticket-mini" onclick="viewUserProfile('${msg.from}')">
      <div class="t-head"><span>TICKET</span><span>${msg.data.status}</span></div>
      <div style="font-weight:700;">⚽ ${msg.data.name}</div><div class="t-odds">@${(msg.data.odds||0).toFixed(2)}</div>
    </div>`;
  } else if (msg.type === "image" && msg.data) {
    content = `<div class="chat-img-wrap"><img src="${msg.data}" class="chat-img-msg" onclick="viewFullImage('${msg.data}')"/></div>`;
  }

  const reactions = Object.values(msg.reactions || {});
  const reactHtml = reactions.length > 0 ? `<div class="msg-reactions-wrap">${[...new Set(reactions)].join('')} <span>${reactions.length}</span></div>` : '';

  return `<div class="msg-bubble-row ${isMe ? 'msg-bubble-row-me' : 'msg-bubble-row-other'}" id="msg_${msg.id || Date.now()}">
    <div class="msg-bubble ${isMe ? 'msg-bubble-me' : 'msg-bubble-other'}" onclick="msgToggleReactionMenu('${msg.id}')">
      ${content}
      <div class="msg-bubble-time" style="font-size:8px;opacity:0.5;margin-top:4px;">${time} ${isMe && msg.read ? '✓✓' : ''}</div>
      ${reactHtml}
    </div>
    <div id="react_menu_${msg.id}" class="reaction-menu" style="display:none;">
      <span onclick="msgSetReaction('${msg.id}', '👍')">👍</span>
      <span onclick="msgSetReaction('${msg.id}', '❤️')">❤️</span>
      <span onclick="msgSetReaction('${msg.id}', '😂')">😂</span>
      <span onclick="msgSetReaction('${msg.id}', '🔥')">🔥</span>
    </div>
  </div>`;
}

function updateChatUIWithFirestoreMessages(conv, myKey) {
  const list = document.getElementById('msgChatList');
  if (!list) return;

  // Curățăm lista și randerizăm mesajele
  // Păstrăm mesajul de "Sunteți prieteni" doar dacă nu sunt mesaje
  if (conv.length > 0) {
    list.innerHTML = conv.map(m => renderMsgBubble(m, myKey)).join('');
  } else {
    // Afișăm welcome screen-ul dacă nu există istoric
    const other = _activeConv || "utilizatorul";
    list.innerHTML = `
      <div class="msg-empty" style="margin-top:40px; text-align:center;">
        <div style="font-family:Syncopate; font-size:14px; color:#fff;">@${other}</div>
        <div style="font-family:Rajdhani; color:rgba(255,255,255,0.4); font-size:13px; margin-top:5px;">Sunteți prieteni pe rGdbet. Spune-i salut!</div>
      </div>
    `;
  }

  // Forțăm scroll-ul jos la fiecare actualizare instantanee
  list.scrollTop = list.scrollHeight;
}

/* ── PAGE BUILDERS ── */
let _activeConv = null;
window.buildMessagesPage = function() {
  const page = document.getElementById('page-messages');
  const me = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
  if (!page) return;
  page.style.display = 'block'; page.classList.add('active');
  if (!me) { page.innerHTML = `<div class="msg-login-prompt">💬<br/><button class="msg-action-btn" onclick="authShowScreen()">INTRĂ ÎN CONT</button></div>`; return; }
  if (_activeConv) { renderChatView(page, me, _activeConv); return; }
  renderInboxView(page, me);
};

function renderInboxView(page, me) {
  const myKey = me.username.toLowerCase();
  const reqs = getFriendReqs()[myKey] || [];
  const pending = reqs.filter(r => r.status === 'pending' && r.to === myKey);
  const users = typeof getUsers === 'function' ? getUsers() : {};
  const msgs = getMessages();
  const unread = getUnread()[myKey] || {};
  const cids = new Set([...Object.keys(msgs), ...Object.keys(unread)]);

  const list = Array.from(cids).map(cid => {
    const parts = cid.split('::'); if (parts.length < 2) return null;
    const other = parts[0] === myKey ? parts[1] : parts[0];
    const m_ = msgs[cid] || [];
    return { username: other, last: m_[m_.length-1], unread: unread[cid] || 0, ts: m_[m_.length-1]?.ts || 0 };
  }).filter(c => c && c.username !== myKey).sort((a,b) => b.ts - a.ts);

  const friendsList = (getFriends()[myKey] || []);

  page.innerHTML = `
    <div class="side-panel-close-btn" style="background:transparent;"><button onclick="closeMessagesPanel()"><i class="fa-solid fa-xmark"></i></button><span>MESAJE</span></div>

    <div style="padding:0 16px 10px;"><button class="msg-action-btn" onclick="syncFriendsFromFirestore()" style="width:100%; border-radius:12px; background:linear-gradient(135deg, var(--nb), var(--ng)); color:#000; font-weight:800; font-size:10px;"><i class="fa-solid fa-sync"></i> SINCRONIZEAZĂ CONT</button></div>

    ${pending.length > 0 ? `<div class="msg-section"><div class="msg-section-title">CERERI PRIETENIE <span class="msg-badge-pill">${pending.length}</span></div>
      ${pending.map(r => `<div class="msg-friend-req-card">
        <div class="msg-req-info">
          <div class="msg-av">${renderAvatarContent(users[r.from]?.avatar)}</div>
          <div style="flex:1;"><strong>@${r.from}</strong></div>
        </div>
        <div class="msg-req-btns">
          <button class="msg-req-accept" onclick="respondFriendRequest('${r.from}',true)">ACCEPTĂ</button>
          <button class="msg-req-reject" onclick="respondFriendRequest('${r.from}',false)">REFUZĂ</button>
        </div>
      </div>`).join('')}</div>` : ''}

    <div class="msg-section"><div class="msg-section-title">PRIETENI</div>
    ${friendsList.length === 0 ? `<div class="msg-empty" style="padding:10px 0;">Niciun prieten. Caută mai jos!</div>` :
      `<div style="display:flex; gap:12px; overflow-x:auto; padding:10px 0; scrollbar-width:none;">
        ${friendsList.map(f => `<div onclick="openConversation('${f}')" style="text-align:center; flex-shrink:0; cursor:pointer;">
          <div class="msg-av" style="width:50px; height:50px; border:2px solid var(--nb);">${renderAvatarContent(users[f.toLowerCase()]?.avatar)}</div>
          <div style="font-size:10px; color:#fff; margin-top:5px; font-weight:600;">@${f}</div>
        </div>`).join('')}
      </div>`
    }</div>

    <div class="msg-section"><div class="msg-section-title">CONVERSAȚII</div>
    ${list.length === 0 ? `<div class="msg-empty">Nicio discuție activă.</div>` : list.map(c => `
      <div class="msg-conv-row ${c.unread > 0 ? 'msg-conv-unread' : ''}" onclick="openConversation('${c.username}')">
        <div class="msg-av">${renderAvatarContent(users[c.username.toLowerCase()]?.avatar)}</div>
        <div style="flex:1;"><div style="display:flex;justify-content:space-between;"><strong>@${c.username}</strong><small>${c.last ? formatMsgTime(c.last.ts) : ''}</small></div>
        <div class="msg-preview-text">${c.last?.text || (c.last?.type==='image'?'Imagine':'Mesaj nou')}</div></div>
        ${c.unread > 0 ? `<span class="msg-unread-dot">${c.unread}</span>` : ''}
      </div>`).join('')}</div>

    <div class="msg-section"><div class="msg-section-title">CAUTĂ PARIORI</div><input class="auth-input" oninput="msgSearchUsers(this.value)" placeholder="Introdu username...">
    <div id="msgSearchResults" style="margin-top:10px;"></div></div>
  `;
}

function renderChatView(page, me, other) {
  const u = (typeof getUsers === 'function' ? getUsers() : {})[other.toLowerCase()] || { username: other };

  page.innerHTML = `
    <!-- Header chat (Style Facebook) -->
    <div class="msg-chat-header" style="background: rgba(10,15,26,0.95); border-bottom: 1px solid rgba(255,255,255,0.05); padding: 12px 16px; position:sticky; top:0; z-index:1100;">
      <button class="msg-back-btn" onclick="closeConversation()" style="background:none; border:none; color:var(--nb); font-size:20px;">
        <i class="fa-solid fa-arrow-left"></i>
      </button>
      <div style="display:flex; align-items:center; gap:12px; cursor:pointer; flex:1; margin-left:10px;"
           onclick="if(typeof viewUserProfile==='function') viewUserProfile('${other}')">
        <div class="msg-av" style="width:38px;height:38px;border: 1px solid rgba(0,200,255,0.3);">${renderAvatarContent(u.avatar)}</div>
        <div style="display:flex; flex-direction:column;">
          <div class="msg-username" style="font-size:16px; font-weight:700; color:#fff;">@${other}</div>
          <div id="chat-user-status" style="font-size:11px; color:var(--ng); margin-top:-1px;">Online acum</div>
        </div>
      </div>
      <div style="display:flex; gap:15px; color:var(--nb); font-size:18px;">
        <i class="fa-solid fa-phone"></i>
        <i class="fa-solid fa-video"></i>
      </div>
    </div>

    <!-- Mesaje (Zona Scroll) -->
    <div class="msg-chat-list fb-messenger-style" id="msgChatList" style="padding: 20px 16px 160px; min-height:85vh; background:transparent;">
      <div class="msg-empty" style="margin-top:40px; text-align:center;">
        <div class="msg-av" style="width:80px;height:80px;margin:0 auto 15px;font-size:40px;">${renderAvatarContent(u.avatar)}</div>
        <div style="font-family:Syncopate; font-size:14px; color:#fff;">@${other}</div>
        <div style="font-family:Rajdhani; color:rgba(255,255,255,0.4); font-size:13px; margin-top:5px;">Sunteți prieteni pe rGdbet</div>
      </div>
    </div>

    <!-- Zona Input + Emojis (Sticky Bottom) -->
    <div class="msg-input-container-fb" style="position:fixed; bottom:82px; left:0; right:0; max-width:500px; margin:0 auto; background:rgba(8,11,16,0.98); border-top:1px solid rgba(255,255,255,0.05); padding:10px 12px; z-index:10000; box-shadow: 0 -8px 30px rgba(0,0,0,0.6);">

      <!-- Emoji Quick Bar -->
      <div class="msg-emoji-bar" style="display:flex; gap:12px; padding:5px 0 10px; overflow-x:auto; scrollbar-width:none;">
        <span onclick="msgAddEmoji('👍')" style="font-size:22px; cursor:pointer;">👍</span>
        <span onclick="msgAddEmoji('❤️')" style="font-size:22px; cursor:pointer;">❤️</span>
        <span onclick="msgAddEmoji('😂')" style="font-size:22px; cursor:pointer;">😂</span>
        <span onclick="msgAddEmoji('🔥')" style="font-size:22px; cursor:pointer;">🔥</span>
        <span onclick="msgAddEmoji('⚽')" style="font-size:22px; cursor:pointer;">⚽</span>
        <span onclick="msgAddEmoji('🏆')" style="font-size:22px; cursor:pointer;">🏆</span>
        <span onclick="msgAddEmoji('💎')" style="font-size:22px; cursor:pointer;">💎</span>
        <span onclick="msgAddEmoji('🤝')" style="font-size:22px; cursor:pointer;">🤝</span>
      </div>

      <div style="display:flex; align-items:center; gap:10px;">
        <button onclick="msgShowTicketPicker()" style="background:none; border:none; color:var(--nb); font-size:22px; cursor:pointer;"><i class="fa-solid fa-circle-plus"></i></button>
        <button onclick="msgTriggerImageUpload()" style="background:none; border:none; color:var(--nb); font-size:22px; cursor:pointer;"><i class="fa-solid fa-camera"></i></button>
        <div style="flex:1; position:relative;">
          <input class="msg-input" id="msgInputField" type="text"
                 placeholder="Aa"
                 oninput="msgHandleTyping()"
                 onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();msgSendCurrent();}"
                 autocomplete="off" maxlength="500"
                 style="width:100%; background:rgba(255,255,255,0.08); border:none; border-radius:20px; padding:10px 15px; color:#fff; font-family:Rajdhani; font-size:15px;"/>
        </div>
        <button class="msg-send-btn" onclick="msgSendCurrent()" style="background:none; border:none; color:var(--nb); font-size:24px; display:flex; align-items:center; justify-content:center; cursor:pointer;">
          <i class="fa-solid fa-paper-plane"></i>
        </button>
      </div>
    </div>
  `;

  /* Scroll la jos */
  setTimeout(() => {
    const list = document.getElementById('msgChatList');
    if (list) list.scrollTop = list.scrollHeight;
    document.getElementById('msgInputField')?.focus();
  }, 100);

  // WhatsApp Style Presence Listener
  if (_partnerPresenceUnsub) _partnerPresenceUnsub();
  _partnerPresenceUnsub = fbDb.collection('users').doc(other.toLowerCase()).onSnapshot(doc => {
    const statusEl = document.getElementById('chat-user-status');
    if (doc.exists && statusEl) {
      const data = doc.data();
      const lastSeen = data.lastSeen;
      if (lastSeen && (Date.now() - lastSeen < 60000)) { // 1 min threshold for "Active Now"
        statusEl.textContent = "Activ(ă) acum"; statusEl.style.color = "var(--ng)";
      } else if (lastSeen) {
        statusEl.textContent = formatLastSeen(lastSeen); statusEl.style.color = "rgba(255,255,255,0.4)";
      } else { statusEl.textContent = "Offline"; }
    }
  });
}

/* ── HELPERS ── */
function formatLastSeen(ts) {
  if (!ts) return "";
  const d = new Date(ts); const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const timeStr = d.getHours().toString().padStart(2, '0') + ":" + d.getMinutes().toString().padStart(2, '0');
  if (isToday) return `Văzut azi la ${timeStr}`;
  return `Văzut pe ${d.toLocaleDateString('ro-RO')}`;
}

const EMOJI_LIST = ['👍','❤️','😂','🔥','😢','😡','⚽','🏆','💎','🤝','🚀','💰','📈','🎯','⭐','👏','🙌','😮','🤔','💯','⚽','🏀','🎾','🏒','🏐','🎮','🎰','🔥','✅','❌'];
function buildEmojiPicker() {
  const p = document.getElementById('emoji-picker'); if (!p) return;
  p.innerHTML = EMOJI_LIST.map(e => `<span class="emoji-item" onclick="msgAddEmoji('${e}'); msgToggleEmojiPicker();">${e}</span>`).join('');
}
window.msgToggleEmojiPicker = function() {
  const p = document.getElementById('emoji-picker'); if (!p) return;
  p.style.display = p.style.display === 'grid' ? 'none' : 'grid';
};
window.msgAddEmoji = function(e) { const i = document.getElementById('msgInputField'); if(i) { i.value += e; i.focus(); } };

/* ── CONVERSATION FLOW ── */
window.openConversation = function(username) {
  _activeConv = username;
  const me = getCurrentUser(); if (!me) return;

  // Forțăm navigarea la pagina de mesaje
  if (typeof navigateTo === 'function') navigateTo('messages', null);

  const page = document.getElementById('page-messages');
  if (page) renderChatView(page, me, username);

  if (typeof fbDb === 'undefined' || !fbReady) return;

  const cid = convId(me.username, username);

  // Messages Listener (WhatsApp Style Sync)
  if (_msgUnsub) _msgUnsub();
  _msgUnsub = fbDb.collection('chat_messages')
    .where('cid', '==', cid)
    .limitToLast(100)
    .onSnapshot(snap => {
      const msgs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a,b) => (a.ts || 0) - (b.ts || 0));
      updateChatUIWithFirestoreMessages(msgs, me.username.toLowerCase());
    }, err => {
      console.error("[Firestore] Listener error:", err);
    });

  // Typing Listener
  if (_typingUnsub) _typingUnsub();
  _typingUnsub = fbDb.collection('typing_status').doc(`${cid}_${username.toLowerCase()}`).onSnapshot(doc => {
    if (doc.exists) {
      const data = doc.data();
      _isOtherTyping = data.isTyping && (Date.now() - (data.ts || 0) < 5000);
      // Actualizăm UI-ul pentru indicatorul de tastare
      const list = document.getElementById('msgChatList');
      if (list) {
        const ex = list.querySelector('.typing-bubble');
        if (_isOtherTyping && !ex) {
          const div = document.createElement('div');
          div.className = 'typing-bubble';
          div.innerHTML = `<div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>`;
          list.appendChild(div);
          list.scrollTop = list.scrollHeight;
        } else if (!_isOtherTyping && ex) {
          ex.remove();
        }
      }
    }
  });

  // Presence Listener (Facebook Messenger Style)
  if (_partnerPresenceUnsub) _partnerPresenceUnsub();
  _partnerPresenceUnsub = fbDb.collection('users').doc(username.toLowerCase()).onSnapshot(doc => {
    const statusEl = document.getElementById('chat-user-status');
    if (statusEl && doc.exists) {
      const data = doc.data();
      const lastSeen = data.lastSeen;
      const now = Date.now();

      if (lastSeen && (now - lastSeen < 60000)) { // 1 min threshold for "Active Now"
        statusEl.textContent = "Activ(ă) acum";
        statusEl.style.color = "var(--ng)";
      } else if (lastSeen) {
        statusEl.textContent = formatLastSeen(lastSeen);
        statusEl.style.color = "rgba(255,255,255,0.4)";
      } else {
        statusEl.textContent = "Offline";
      }
    }
  });
};

window.msgAddEmoji = function(emoji) {
  const inp = document.getElementById('msgInputField');
  if (inp) {
    inp.value += emoji;
    inp.focus();
  }
};

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

  // Randare bilet dacă tipul este "ticket"
  let contentHtml = escMsgHtml(msg.text);
  if (msg.type === "ticket" && msg.data) {
    const t = msg.data;
    contentHtml = `
      <div class="chat-ticket-mini" onclick="if(typeof viewFullImage==='function') viewFullImage('${t.photo || ''}')">
        <div class="t-head"><span>rGdbet Ticket</span> <span>${t.status?.toUpperCase() || ''}</span></div>
        <div class="t-event">⚽ ${t.name || 'Bilet'}</div>
        <div class="t-odds"><span>Cotă: @${(t.odds || 1).toFixed(2)}</span> <span>Miză: ${t.stake || 0} RON</span></div>
      </div>
    `;
  } else if (msg.type === "image" && msg.data) {
    contentHtml = `
      <div class="chat-img-wrap">
        <img src="${msg.data}" class="chat-img-msg" onclick="viewFullImage('${msg.data}')"/>
      </div>
    `;
  }

  // Calculare Reacții
  const reactions = msg.reactions || {};
  const reactionValues = Object.values(reactions).filter(v => v !== null);
  const reactionHtml = reactionValues.length > 0 ? `
    <div class="msg-reactions-wrap">
      ${[...new Set(reactionValues)].slice(0, 3).join('')} <span>${reactionValues.length}</span>
    </div>
  ` : '';

  return `
    <div class="msg-bubble-row ${isMe ? 'msg-bubble-row-me' : 'msg-bubble-row-other'}" id="msg_${msg.id}">
      <div class="msg-bubble ${isMe ? 'msg-bubble-me' : 'msg-bubble-other'}"
           onclick="msgToggleReactionMenu('${msg.id}')"
           oncontextmenu="event.preventDefault(); showMsgActions('${msg.id}', '${isMe ? 'me' : 'other'}', '${isMe ? msg.to : msg.from}')">
        ${contentHtml}
        <div class="msg-bubble-time" style="font-size:9px; opacity:0.5; margin-top:4px;">${time} ${isMe && msg.read ? '<i class="fa-solid fa-check-double" style="color:var(--ng)"></i>' : ''}</div>
        ${reactionHtml}
      </div>
      <div id="react_menu_${msg.id}" class="reaction-menu" style="display:none;">
        <span onclick="msgSetReaction('${msg.id}', '👍')">👍</span>
        <span onclick="msgSetReaction('${msg.id}', '❤️')">❤️</span>
        <span onclick="msgSetReaction('${msg.id}', '😂')">😂</span>
        <span onclick="msgSetReaction('${msg.id}', '🔥')">🔥</span>
        <span onclick="msgSetReaction('${msg.id}', '😢')">😢</span>
        <span onclick="msgSetReaction('${msg.id}', '😡')">😡</span>
      </div>
    </div>`;
}

window.msgSendCurrent = async function() {
  if (!_activeConv) return;
  const inp = document.getElementById('msgInputField');
  const text = (inp?.value || '').trim();
  if (!text) return;

  if (inp) inp.value = ''; // Clear immediately for UX

  // Trimitem mesajul
  const ok = await sendMessage(_activeConv, text);
  if (!ok) {
    showMsgToast('Eroare la trimitere mesaj', 'error');
    if (inp) inp.value = text; // Restore text on error
  }

  // Feedback vizual instantaneu: scroll jos dacă e deschis chatul
  const list = document.getElementById('msgChatList');
  if (list) list.scrollTop = list.scrollHeight;
};

window.closeConversation = function() {
  if (_msgUnsub) _msgUnsub(); if (_typingUnsub) _typingUnsub(); if (_partnerPresenceUnsub) _partnerPresenceUnsub();
  _activeConv = null; buildMessagesPage();
};

window.msgShowTicketPicker = function() {
  const bets = JSON.parse(localStorage.getItem('rgb_bets') || '[]');
  const modal = document.createElement('div'); modal.className = 'prof-edit-modal open'; modal.style.zIndex = "20000";
  modal.innerHTML = `<div class="prof-edit-box" style="max-width:400px; max-height:80vh; overflow:hidden; display:flex; flex-direction:column;"><div class="prof-edit-title">ALEGE BILETUL</div><div style="flex:1; overflow-y:auto; margin-bottom:15px;">${bets.slice().reverse().map(b => `<div onclick="msgSendTicket('${b.id}')" style="padding:12px; border-bottom:1px solid rgba(255,255,255,0.1); cursor:pointer; background:rgba(255,255,255,0.02); margin-bottom:5px; border-radius:8px;"><div style="font-weight:700; color:var(--nb);">⚽ ${b.name || 'Bilet'}</div><div style="font-size:11px; color:#aaa;">@${(b.odds || 1).toFixed(2)} | ${b.stake} RON</div></div>`).join('')}</div><button class="prof-edit-cancel" onclick="this.closest('.prof-edit-modal').remove()" style="width:100%; padding:12px;">ÎNCHIDE</button></div>`;
  document.body.appendChild(modal);
};

window.msgSendTicket = async function(id) {
  const bets = JSON.parse(localStorage.getItem('rgb_bets') || '[]'); const b = bets.find(x => x.id == id);
  if (b && _activeConv) { document.querySelector('.prof-edit-modal')?.remove(); await sendMessage(_activeConv, "Bilet partajat", false, { type: "ticket", data: b }); }
};

window.msgToggleReactionMenu = function(id) {
  const m = document.getElementById('react_menu_'+id); if (!m) return;
  const was = m.style.display === 'flex'; document.querySelectorAll('.reaction-menu').forEach(x => x.style.display = 'none');
  m.style.display = was ? 'none' : 'flex';
};

window.msgSetReaction = async function(id, emoji) {
  const me = getCurrentUser(); if (!me || !fbReady) return;
  const ref = fbDb.collection('chat_messages').doc(id); const doc = await ref.get();
  if (doc.exists) {
    const reactions = doc.data().reactions || {};
    reactions[me.username] = reactions[me.username] === emoji ? null : emoji;
    if (!reactions[me.username]) delete reactions[me.username];
    await ref.update({ reactions });
  }
  document.querySelectorAll('.reaction-menu').forEach(x => x.style.display = 'none');
};

function formatMsgTime(ts) { if(!ts) return ""; const d = new Date(ts); return d.getHours() + ":" + String(d.getMinutes()).padStart(2,'0'); }
function escMsgHtml(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
window.showMsgToast = function(text, type = 'info') {
  let toast = document.getElementById('msg-toast');
  if (!toast) { toast = document.createElement('div'); toast.id = 'msg-toast'; document.body.appendChild(toast); }
  toast.className = `msg-toast msg-toast-${type} msg-toast-visible`; toast.textContent = text;
  clearTimeout(toast._timer); toast._timer = setTimeout(() => toast.classList.remove('msg-toast-visible'), 3500);
}
window.viewFullImage = function(base64Str) {
  const overlay = document.createElement('div'); overlay.style.cssText = "position:fixed; inset:0; background:rgba(0,0,0,0.9); z-index:10000; display:flex; align-items:center; justify-content:center; cursor:pointer;";
  overlay.onclick = () => overlay.remove(); const img = document.createElement('img'); img.src = base64Str; img.style.cssText = "max-width:95%; max-height:95%; border-radius:10px; box-shadow:0 0 30px rgba(0,200,255,0.3);"; overlay.appendChild(img); document.body.appendChild(overlay);
}
window.msgSearchUsers = function(query) {
  const res = document.getElementById('msgSearchResults'); if (!res || !query || query.trim().length < 1) { if(res) res.innerHTML = ''; return; }
  const me = getCurrentUser(); if(!me) return; const q = query.toLowerCase().trim(); const users = typeof getUsers === 'function' ? getUsers() : {};
  const matches = Object.values(users).filter(u => u.username.toLowerCase() !== me.username.toLowerCase() && u.username.toLowerCase().includes(q));
  res.innerHTML = matches.map(u => `<div class="msg-conv-row" onclick="openConversation('${u.username}')"><div class="msg-av">${renderAvatarContent(u.avatar)}</div><div style="flex:1;"><strong>@${u.username}</strong><br/><small>Parior rGdbet</small></div><button class="msg-req-accept" style="padding:6px 12px; font-size:11px;">CHAT</button></div>`).join('');
};

(function msgInit() {
  setInterval(() => {
    if (typeof fbReady !== 'undefined' && fbReady) {
      const me = getCurrentUser();
      if (me) fbDb.collection('users').doc(me.uid || me.username.toLowerCase()).set({ lastSeen: Date.now() }, { merge: true });
    }
  }, 120000);
})();

window.msApi = { getMyFriends, getTotalUnread, updateMsgBadge };

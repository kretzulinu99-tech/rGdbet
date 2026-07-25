/* ═══════════════════════════════════════════════════════════════
   utils.js — Apex Unified Storage & Common Helpers
   v1.3 Sovereign Arhitecture - Global Core & Leak Shield
═══════════════════════════════════════════════════════════════ */
'use strict';

window.APEX_DEBUG = false; // Set to true to enable console logs
window._apexIntervals = []; // Global registry for page-specific intervals

const STORAGE_KEYS = {
    friends:  'rgb_friends',
    follows:  'rgb_follows',
    reqs:     'rgb_friend_reqs',
    msgs:     'rgb_messages',
    unread:   'rgb_unread',
    user:     'rgb_user',
    users:    'rgb_users_db',
    posts:    'rgb_social_feed',
    bets:     'rgb_bets'
};

// --- DEBUG LOGGER ---
window.log = function(...args) {
    if (window.APEX_DEBUG) {
        console.log(...args);
    }
};

// --- INTERVAL MANAGER (Leak Shield) ---
window.setApexInterval = function(fn, delay) {
    const id = setInterval(fn, delay);
    window._apexIntervals.push(id);
    return id;
};

window.clearApexIntervals = function() {
    window._apexIntervals.forEach(id => clearInterval(id));
    window._apexIntervals = [];
};

// --- BASIC STORAGE ACCESSORS ---
window.getFriends = function() { try { return JSON.parse(localStorage.getItem(STORAGE_KEYS.friends) || '{}'); } catch { return {}; } };
window.saveFriends = function(data) { localStorage.setItem(STORAGE_KEYS.friends, JSON.stringify(data)); };

window.getFollows = function() { try { return JSON.parse(localStorage.getItem(STORAGE_KEYS.follows) || '{}'); } catch { return {}; } };
window.saveFollows = function(data) { localStorage.setItem(STORAGE_KEYS.follows, JSON.stringify(data)); };

window.getFriendReqs = function() { try { return JSON.parse(localStorage.getItem(STORAGE_KEYS.reqs) || '{}'); } catch { return {}; } };
window.saveFriendReqs = function(data) { localStorage.setItem(STORAGE_KEYS.reqs, JSON.stringify(data)); };

window.getMessages = function() { try { return JSON.parse(localStorage.getItem(STORAGE_KEYS.msgs) || '{}'); } catch { return {}; } };
window.saveMessages = function(data) { localStorage.setItem(STORAGE_KEYS.msgs, JSON.stringify(data)); };

window.getUnread = function() { try { return JSON.parse(localStorage.getItem(STORAGE_KEYS.unread) || '{}'); } catch { return {}; } };
window.saveUnread = function(data) { localStorage.setItem(STORAGE_KEYS.unread, JSON.stringify(data)); };

// --- USER & CONTENT CORE ---
window.getUsers = function() { try { return JSON.parse(localStorage.getItem(STORAGE_KEYS.users) || '{}'); } catch { return {}; } };
window.saveUsers = function(u) { localStorage.setItem(STORAGE_KEYS.users, JSON.stringify(u)); };

window.getPosts = function() { try { return JSON.parse(localStorage.getItem(STORAGE_KEYS.posts) || '[]'); } catch { return []; } };
window.savePosts = function(p) { localStorage.setItem(STORAGE_KEYS.posts, JSON.stringify(p)); };

window.getCurrentUser = function() {
  try {
    const uStr = sessionStorage.getItem(STORAGE_KEYS.user) || localStorage.getItem(STORAGE_KEYS.user);
    if (!uStr || uStr === 'null') return null;
    let u = JSON.parse(uStr);
    if (u && u.username) {
      const pKey = 'rgd_persistent_avatar_' + u.username.toLowerCase();
      const saved = localStorage.getItem(pKey) || localStorage.getItem('rgb_global_persistent_avatar');
      if (saved && (!u.avatar || u.avatar === '👤' || u.avatar === 'default')) {
        u.avatar = saved;
        localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(u));
        sessionStorage.setItem(STORAGE_KEYS.user, JSON.stringify(u));
      }
    }
    return u;
  } catch { return null; }
};

window.saveCurrentUser = function(u) {
  if (!u) return;
  if (u.avatar && u.avatar !== '👤' && u.avatar !== 'default' && u.username) {
    localStorage.setItem('rgd_persistent_avatar_' + (u.username||'').toLowerCase(), u.avatar);
    localStorage.setItem('rgb_global_persistent_avatar', u.avatar);
  }
  sessionStorage.setItem(STORAGE_KEYS.user, JSON.stringify(u));
  localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(u));
};

// --- LOGGED USER HELPERS ---
window.getMyFriends = function() {
    const user = window.getCurrentUser();
    if (!user) return [];
    return window.getFriends()[(user.username||'').toLowerCase()] || [];
};

window.getMyFollows = function() {
    const user = window.getCurrentUser();
    if (!user) return [];
    return window.getFollows()[(user.username||'').toLowerCase()] || [];
};

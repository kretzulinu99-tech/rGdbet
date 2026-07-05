/* ═══════════════════════════════════════════════════════════════
   notifications.js — Sistem Notificări Push PWA (v9.7 Elite)
   Gestionează permisiunile și declanșarea alertelor social.
═══════════════════════════════════════════════════════════════ */
'use strict';

const NOTIF_CONFIG = {
  icon: 'https://cdn-icons-png.flaticon.com/512/5971/5971593.png',
  badge: 'https://cdn-icons-png.flaticon.com/512/5971/5971593.png'
};

/**
 * Solicită permisiunea de a trimite notificări.
 */
window.requestNotificationPermission = async function() {
  if (!('Notification' in window)) {
    console.warn('Acest browser nu suportă notificări.');
    return false;
  }

  if (Notification.permission === 'granted') return true;

  const permission = await Notification.requestPermission();
  return permission === 'granted';
};

/**
 * Trimite o notificare locală (Push Simulation).
 * Funcționează excelent pe mobil (PWA) și Desktop.
 */
window.sendPushNotification = function(title, body, data = {}) {
  if (Notification.permission !== 'granted') return;

  // Dacă avem Service Worker, folosim înregistrarea lui pentru o integrare PWA mai bună
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then(registration => {
      registration.showNotification(title, {
        body: body,
        icon: NOTIF_CONFIG.icon,
        badge: NOTIF_CONFIG.badge,
        vibrate: [200, 100, 200],
        data: data,
        tag: 'rgdbet-social-' + Date.now()
      });
    });
  } else {
    // Fallback standard
    new Notification(title, {
      body: body,
      icon: NOTIF_CONFIG.icon
    });
  }
};

/**
 * Hook-uri Sociale pentru Notificări
 */
window.notifyFollow = function(followerName) {
  window.sendPushNotification(
    '🚀 Nou Follower!',
    `@${followerName} a început să îți urmărească activitatea.`
  );
};

window.notifyNewMessage = function(senderName, text) {
  window.sendPushNotification(
    `💬 Mesaj nou de la @${senderName}`,
    text.substring(0, 50) + (text.length > 50 ? '...' : '')
  );
};

window.notifySpectacularPost = function(authorName, odds) {
  window.sendPushNotification(
    '🔥 Bilet Spectaculos!',
    `@${authorName} a postat un bilet cu cota @${odds.toFixed(2)}.`
  );
};

// Auto-request la prima interacțiune dacă e logat
document.addEventListener('click', () => {
  const user = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
  if (user && Notification.permission === 'default') {
    window.requestNotificationPermission();
  }
}, { once: true });

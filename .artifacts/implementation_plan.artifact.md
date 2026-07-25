# Plan de Unificare Stocare: Prieteni și Urmăriri (v14.0)

Acest plan vizează eliminarea redundanței și a riscului de desincronizare a listelor de prieteni și persoane urmărite prin crearea unui modul centralizat de utilitare.

## User Review Required

> [!IMPORTANT]
> Voi crea un nou fișier, `utils.js`, care va conține toți "accessorii" pentru LocalStorage (get/save pentru friends, follows, messages etc.). Acest fișier va fi încărcat primul în `index.html` pentru a fi disponibil global.

## Propuneri de modificări

### 1. Creare `utils.js` [NEW]
Acest script va centraliza accesul la datele care sunt partajate între module:
*   `getFriends()` / `saveFriends(data)` -> Cheia `rgb_friends`
*   `getFollows()` / `saveFollows(data)` -> Cheia `rgb_follows`
*   `getFriendReqs()` / `saveFriendReqs(data)` -> Cheia `rgb_friend_reqs`
*   `getMessages()` / `saveMessages(data)` -> Cheia `rgb_messages`
*   `getUnread()` / `saveUnread(data)` -> Cheia `rgb_unread`
*   `getMyFriends()` & `getMyFollows()` -> Helpers pentru utilizatorul logat.

### 2. Actualizare `index.html` [MODIFY]
*   Adăugarea `<script src="utils.js"></script>` imediat după dependințele externe (Chart.js, Confetti) și înaintea oricărui script local.

### 3. Refactorizare Module Existente [CLEANUP]
*   **`messages.js`**: Eliminarea definițiilor locale de storage (lines 14-21) și utilizarea celor globale.
*   **`badges.js`**: Înlocuirea accesului direct `localStorage.getItem('rgb_follows')` cu apeluri către `getFollows()`.
*   **`social.js`**: Asigurarea consistenței cu noile funcții globale.
*   **`profile-viewer.js`**: Audit pentru orice acces direct la prieteni/urmăriri și înlocuirea acestuia.

## Plan de Verificare

### Verificare Funcțională
*   **Mesagerie**: Trimiterea unui mesaj și verificarea dacă lista de prieteni rămâne consistentă.
*   **Urmăriri**: Testarea funcției de follow (dacă există) și verificarea dacă numărul de urmăriri din Badges se actualizează corect folosind noua funcție unificată.
*   **Sincronizare Cloud**: Verificarea dacă `cloud-sync.js` încă poate accesa cheile corecte (nu le vom schimba, doar modul de acces în JS).

### Sincronizare Cloud (GitHub)
*   Sincronizarea folderului `docs/` pentru a propaga arhitectura curată.

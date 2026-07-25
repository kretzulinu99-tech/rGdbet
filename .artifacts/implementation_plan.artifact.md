# Plan de Implementare: Corecție Încărcare Scripturi (v10.1)

Acest plan vizează includerea tuturor scripturilor lipsă în `index.html` și corectarea ordinii de încărcare a acestora pentru a asigura funcționarea corectă a modulelor de Autentificare, AI, Premium și Social.

## User Review Required

> [!IMPORTANT]
> Scripturile esențiale (Auth, Firebase, Social, AI) vor fi mutate **ÎNAINTE** de `script.js`. Această schimbare este critică deoarece `script.js` inițializează aplicația și are nevoie ca funcțiile din aceste module să fie deja disponibile în memorie.

## Propuneri de modificări

### 1. Actualizare `index.html` [MODIFY]
Voi rearanja și adăuga scripturile în următoarea ordine optimă pentru a asigura disponibilitatea globalelor:

1.  `age-gate.js`
2.  `auth.js` [NEW]
3.  `firebase-auth.js` [MOVE]
4.  `premium.js` [NEW]
5.  `gamification.js`
6.  `quests.js`
7.  `dna-engine.js`
8.  `ai-analyst.js` [NEW]
9.  `social.js` [MOVE]
10. `streak-effects.js` [NEW]
11. `flashscore-sync.js` [NEW]
12. `script.js?v=17.0` (Main app logic)
13. `simulator.js`
14. `themes.js`
15. `streak-mode.js`
16. `cloud-sync.js`
17. `messages.js`
18. `profile-viewer.js`
19. `badges.js`
20. `notifications.js`
21. `gambling-test.js`

## Plan de Verificare

### Verificare Funcțională
*   Verificarea în consolă a erorilor de tip "ReferenceError".
*   Testarea butonului de Login/Register.
*   Verificarea inițializării modulului AI.

### Sincronizare Cloud
*   După aplicare, voi sincroniza folderul `docs/` pentru ca schimările să fie live și pe GitHub Pages.

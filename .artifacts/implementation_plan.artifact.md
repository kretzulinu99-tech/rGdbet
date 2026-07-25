# Plan de Curățare și Consolidare Logica Autentificare (v12.0)

Acest plan vizează eliminarea funcțiilor de autentificare duplicate din `social.js` pentru a asigura că logica robustă (cu hash și validări) din `auth.js` este singura utilizată de aplicație.

## User Review Required

> [!IMPORTANT]
> Voi elimina funcția `authLogout` din `social.js`. Deși nu am identificat în versiunea curentă a fișierului `authLogin`, `authRegister` și `authSwitchTab`, voi face o scanare amănunțită pentru a elimina orice altă logică redundantă care ar putea suprascrie modulele din `auth.js`.

## Propuneri de modificări

### 1. Curățare `social.js` [MODIFY]
*   **Eliminare `authLogout`**: Voi șterge definiția acestei funcții, lăsând varianta din `auth.js` (care include și salvarea datelor înainte de deconectare) să fie cea activă.
*   **Scanare pentru Duplicare Logică**: Voi verifica dacă `getUsers`, `saveUsers`, `getCurrentUser` și `saveCurrentUser` din `social.js` intră în conflict cu funcțiile din `auth.js` și le voi unifica dacă este necesar.

### 2. Verificare Ordine Scripturi în `index.html` [VERIFY]
*   Mă voi asigura că `auth.js` este încărcat **după** `social.js` sau că `social.js` nu mai definește deloc aceste funcții globale, astfel încât ordinea să nu mai cauzeze suprascrieri accidentale.
*   *Corecție*: În planul anterior (v10.1), am mutat `auth.js` la început. Dacă `social.js` (încărcat mai târziu) ar avea aceleași funcții, le-ar suprascrie. Eliminarea lor din `social.js` rezolvă problema definitiv.

## Plan de Verificare

### Verificare Funcțională
*   Testarea butonului de **Logout** din profil pentru a vedea dacă se execută logica completă din `auth.js` (save data + redirect).
*   Testarea funcționalităților sociale pentru a asigura că încă pot citi utilizatorul curent folosind funcțiile din `auth.js` (dacă au fost unificate) sau că referințele sunt corecte.

### Sincronizare Cloud
*   Sincronizarea folderului `docs/` pentru a propaga curățenia pe GitHub Pages.

# Plan de Unificare și Sincronizare Logout (v13.0)

Acest plan vizează transformarea funcției `authLogout` dintr-o simplă procedură locală într-o funcție asincronă hibridă care gestionează simultan deconectarea din mediul local (LocalStorage), Cloud (Firebase) și mediul Nativ (Android), asigurând totodată salvarea finală a datelor.

## User Review Required

> [!IMPORTANT]
> Funcția `authLogout` va deveni **`async`**. Voi implementa un lanț de execuție care garantează că datele sunt salvate în Cloud *înainte* ca sesiunea Firebase să fie închisă, prevenind astfel desincronizarea semnalată.

## Propuneri de modificări

### 1. Actualizare `auth.js` [MODIFY]
Voi înlocui implementarea curentă a `window.authLogout` cu una asincronă care include:
1.  **Persistare**: Apel către `authPersistUserData` și `cloudPushData` (dacă sunt disponibile).
2.  **Firebase**: `await fbAuth.signOut()` (dacă `fbAuth` este inițializat).
3.  **Android**: Apel către bridge-ul nativ pentru curățarea cache-ului aplicației.
4.  **Local**: Ștergerea tuturor cheilor de sesiune (`rgb_user`, `rgd_session` etc.).
5.  **UI**: Revenirea la ecranul de Login.

### 2. Eliminare Suprascrieri Redundante [CLEANUP]
*   Voi verifica din nou `firebase-auth.js` și `social.js` pentru a mă asigura că nicio altă funcție nu încearcă să redefească `authLogout`.
*   Voi elimina orice logică de tip `_origLogout` care cauza confuzie asincronă.

### 3. Sincronizare Scripturi
*   Actualizarea folderului `docs/` pentru a reflecta noul flux de logout pe varianta live.

## Plan de Verificare

### Verificare Funcțională
*   **Logout Cloud**: Autentificare cu un cont Firebase, efectuarea unor modificări, apoi Logout. Verificarea dacă datele au fost salvate pe server înainte de deconectare.
*   **Logout Local**: Verificarea dacă `localStorage` este curățat complet de cheile sensibile.
*   **Erori Asincrone**: Verificarea consolei pentru a asigura că `signOut()` nu blochează restul procesului în caz de eroare de rețea.

### Sincronizare
*   `git commit` și `git push` pentru propagarea fix-ului.

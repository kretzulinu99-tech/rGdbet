# Plan de Unificare a Funcțiilor de Hashing (v18.0)

Acest plan vizează centralizarea logicii de hashing (algoritmul djb2) într-o singură funcție globală definită în `utils.js`, eliminând redundanța și riscul de inconsistență între modulele `auth.js` și `social.js`.

## User Review Required

> [!IMPORTANT]
> Toate instanțele funcției `authHash` vor fi redenumite în **`hashStr`**. Logica rămâne identică, deci datele salvate anterior (hash-urile parolelor) vor rămâne valide.

## Propuneri de modificări

### 1. Definire `hashStr` în `utils.js` [MODIFY] [utils.js](file:///C:/Users/kretzu/AndroidStudioProjects/rGdbet2/app/src/main/assets/utils.js)
*   Voi adăuga funcția `window.hashStr(str)` în nucleul de utilitare. Aceasta va folosi algoritmul djb2 și va returna un string hexazecimal.

### 2. Curățare `auth.js` [MODIFY] [auth.js](file:///C:/Users/kretzu/AndroidStudioProjects/rGdbet2/app/src/main/assets/auth.js)
*   Voi șterge definiția locală a funcției `authHash`.
*   Voi înlocui toate apelurile `authHash(...)` cu `hashStr(...)`.

### 3. Curățare `social.js` [MODIFY] [social.js](file:///C:/Users/kretzu/AndroidStudioProjects/rGdbet2/app/src/main/assets/social.js)
*   Voi șterge definiția redundantă a funcției `hashStr` (care oricum nu era folosită activ în versiunea curentă a acestui fișier, dar genera confuzie).

### 4. Sincronizare `docs/`
*   Actualizarea folderului de publicare pentru a propaga noua arhitectură pe GitHub Pages.

## Plan de Verificare

### Verificare Funcțională
*   **Login**: Verificarea dacă logarea mai funcționează pentru un cont existent (confirmă că `hashStr` produce aceleași rezultate ca `authHash`).
*   **Register**: Crearea unui cont nou și verificarea salvării hash-ului.
*   **Change Password**: Verificarea funcționalității de schimbare a parolei în profil.

### Sincronizare Cloud
*   Confirmarea faptului că nu există erori în consolă legate de lipsa funcției `authHash`.

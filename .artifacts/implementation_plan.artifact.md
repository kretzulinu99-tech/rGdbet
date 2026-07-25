# Plan de Unificare a Sistemului de Share (v11.0)

Acest plan vizează consolidarea logicii de partajare a biletelor și postărilor într-o singură funcție robustă în `social.js`, eliminând redundanța și conflictele semnalate între `social.js` și `firebase-auth.js`.

## User Review Required

> [!IMPORTANT]
> Voi redenumi funcția `shareTicket` în **`openShareModal`** pentru a respecta terminologia solicitată. Voi actualiza toate apelurile din aplicație (Home, Social, Bilete) pentru a folosi această nouă funcție unificată.

## Propuneri de modificări

### 1. Unificare în `social.js` [MODIFY]
*   Voi adăuga funcția `window.openShareModal` care va centraliza logica de:
    *   Identificare tip conținut (bilet local vs. postare socială).
    *   Deschidere modal `#share-modal`.
    *   Generare link de tip `?share=ID`.
    *   Afișare butoane de social sharing (WhatsApp, Facebook, Copy).

### 2. Curățare `firebase-auth.js` [MODIFY]
*   Voi elimina definițiile duplicat/vechi ale funcțiilor `shareTicket` și orice altă variantă de `openShareModal` din acest fișier.
*   Funcția `fbShowShareButtons` va fi păstrată dacă este utilă, sau integrată în `social.js`.

### 3. Actualizare Apeluri în `index.html`, `script.js` și `social.js` [MODIFY]
*   Toate butoanele care foloseau `onclick="shareTicket(...)"` vor fi actualizate la `onclick="openShareModal(...)"`.

## Plan de Verificare

### Verificare Funcțională
*   Testarea butonului de share de pe un bilet local (pagina Bilete).
*   Testarea butonului de share de pe o postare din Social Feed.
*   Verificarea faptului că modalul se deschide corect și link-ul generat conține ID-ul corect.

### Sincronizare
*   După aplicare, folderul `docs/` va fi sincronizat pentru a reflecta unificarea pe varianta web.

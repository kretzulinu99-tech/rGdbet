# Plan de Refactorizare CSS: Specificitate și Conflicte (v16.0)

Acest plan vizează rezolvarea conflictelor de specificitate cauzate de utilizarea claselor generice (`.active`, `.open`, `.nav-label`) în multiple secțiuni ale aplicației, asigurând un comportament vizual consistent.

## User Review Required

> [!IMPORTANT]
> Voi trece de la clase generice la clase "scopate" (combinate sau renumite). Acest lucru necesită actualizarea simultană a fișierelor CSS (`style.css`), HTML (`index.html`) și a logicii JavaScript care manipulează aceste clase (ex: `script.js`, `social.js`, `auth.js`).

## Propuneri de modificări

### 1. Refactorizare `.active` [CSS/HTML/JS]
Voi înlocui utilizarea simplă a clasei `.active` cu variante specifice în selectori:
*   **Navigație**: Utilizarea selectorului `.nav-btn.active` în loc de `.active` general.
*   **Pagini SPA**: Utilizarea `.spa-page.active`.
*   **Tab-uri/Panouri Auth**: Utilizarea `.auth-tab.active` și `.auth-panel.active`.
*   **Filtre**: Utilizarea `.filter-btn.active`.
*   **Ecrane Speciale**: `.level-up-screen.active`.

### 2. Refactorizare `.open` [CSS/HTML/JS]
Voi unifica sau scopura utilizarea clasei `.open` pentru elementele de tip overlay/modal:
*   **Modale Profil/Share**: `.prof-edit-modal.open`, `.share-modal-overlay.open`.
*   **Acordion/Secțiuni**: `.lab-card-body.open`, `.ai-accordion-body.open`.

### 3. Redenumire `.nav-label` [CSS/HTML]
*   Voi redenumi clasa `.nav-label` în **`.nav-label-text`** în `index.html` și în toți selectorii din `style.css` pentru a evita suprapunerile cu alte etichete din aplicație.

### 4. Curățare `style.css` [MODIFY]
*   Voi elimina definițiile redundante și contradictorii ale acestor clase (ex: unde `.nav-label` era definit de 7 ori cu dimensiuni diferite).
*   Voi păstra o singură definiție clară per componentă.

## Plan de Verificare

### Verificare Vizuală
*   Testarea meniului de jos (**Bottom Nav**) pentru a asigura că iconițele și textele se colorează corect la navigare.
*   Verificarea deschiderii modalelor (**Share**, **Edit Profil**) și a panourilor expandabile din **LAB**.
*   Verificarea tab-urilor de **Login/Register** (asigurarea că panoul activ este vizibil).

### Verificare Funcțională (JS)
*   Asigurarea că funcția `navigateTo` și alte scripturi de tip `classList.toggle('active')` încă găsesc elementele corecte sau folosesc noile denumiri.

### Sincronizare Cloud
*   După aplicare, voi sincroniza folderul `docs/` pentru a propaga reparațiile pe link-ul web.

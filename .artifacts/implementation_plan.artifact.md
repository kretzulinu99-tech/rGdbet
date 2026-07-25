# Plan de Integrare Buton Navigație Claude AI (v21.0)

Acest plan vizează adăugarea unui buton dedicat în meniul principal de jos (Bottom Nav) pentru accesul rapid la motorul de analiză **Claude AI**, transformând aplicația într-o experiență cu 6 secțiuni principale + butonul central.

## User Review Required

> [!IMPORTANT]
> Voi trece interfața de navigare de la 5 la 6 butoane (plus cel central). Acest lucru va activa clasa CSS `.bottom-nav-6` pentru a asigura spațierea corectă pe ecrane mici.

## Propuneri de modificări

### 1. Actualizare `index.html` [MODIFY]
*   **Structură Pagini**: Adăugarea `<div id="page-ai" class="spa-page"></div>` pentru a găzdui interfața Claude.
*   **Logica de Navigație**:
    *   Adăugarea `'ai'` în array-ul `NAV_ORDER`.
    *   Apelarea `buildAiPage()` în funcția `navigateTo` pentru inițializarea interfeței la click.
*   **Meniul de Jos**:
    *   Introducerea noului buton între **LAB** și butonul central de **BILETE**.
    *   Iconiță utilizată: `fa-robot`.
    *   Activarea clasei `.bottom-nav-6` pe elementul `<nav id="bottomNav">`.

### 2. Sincronizare `docs/`
*   Actualizarea folderului de publicare pentru ca noul buton să fie disponibil și pe GitHub Pages.

## Plan de Verificare

### Verificare Vizuală
*   Confirmarea faptului că meniul de jos nu este prea aglomerat și că toate cele 6 etichete sunt lizibile.
*   Verificarea culorii de stare activă (Neon Blue) pentru noul buton la selectare.

### Verificare Funcțională
*   Apasarea butonului "AI" trebuie să deschidă instantaneu interfața **Claude 3.5 Sonnet**.
*   Navigarea înapoi de la AI la Home trebuie să funcționeze fluid, curățând intervalele active.

### Sincronizare Cloud
*   `git commit` și `git push` pentru activarea noii funcționalități.

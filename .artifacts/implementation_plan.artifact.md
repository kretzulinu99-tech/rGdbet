# Plan de Eliminare Animație Hot Streak (v28.0)

Acest plan vizează dezactivarea efectelor vizuale de tip "Hot Streak" (flăcări, glow verde, particule) care se declanșează după o serie de 5+ câștiguri consecutive.

## User Review Required

> [!NOTE]
> Voi păstra logica de detecție a seriilor de câștiguri (pentru statistici și quest-uri), dar voi elimina exclusiv declanșarea animațiilor și a efectelor vizuale de tip "Hot".

## Propuneri de modificări

### 1. Dezactivare în `streak-effects.js` [MODIFY] [streak-effects.js](file:///C:/Users/kretzu/AndroidStudioProjects/rGdbet2/app/src/main/assets/streak-effects.js)
*   Voi comenta sau elimina linia care apelează `activate('hot')` atunci când pragul de victorii este atins.
*   Acest lucru va opri afișarea flăcărilor pe margini și a badge-ului "HOT STREAK".

### 2. Dezactivare în `streak-mode.js` [MODIFY] [streak-mode.js](file:///C:/Users/kretzu/AndroidStudioProjects/rGdbet2/app/src/main/assets/streak-mode.js)
*   Voi dezactiva apelul `_activateMode('win', wins)` pentru a opri glow-ul verde de pe containere și particulele ascendente.
*   Voi păstra funcționalitatea pentru "Loss Streak" (glow roșu), conform cererii (care a vizat doar "Hot Streak").

### 3. Sincronizare `docs/`
*   Actualizarea folderului de publicare pentru a propaga schimbarea pe GitHub Pages.

## Plan de Verificare

### Verificare Funcțională
*   **Test Victorie**: Voi simula 5 victorii consecutive și voi verifica dacă:
    *   NU mai apar flăcările sau glow-ul verde.
    *   NU mai apare toast-ul de "WIN STREAK".
*   **Test Înfrângere**: Voi verifica dacă "Cold Streak" (glow roșu) încă funcționează corect la 5 pierderi consecutive.

**Ești de acord să elimin doar animația "Hot" (victorii) și să o păstrez pe cea "Cold" (pierderi)?**

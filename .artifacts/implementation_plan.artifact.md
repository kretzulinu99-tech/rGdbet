# Plan de Eliminare Completă "Donate Revolut" (v19.0)

Acest plan vizează eliminarea oricărei referințe la "Revolut" sau "Donate" din sistemul de traduceri și interfața aplicației, pentru a asigura conformitatea cu politicile Play Store.

## User Review Required

> [!IMPORTANT]
> Voi redenumi cheia de traducere `donate` în **`upgrade_btn`** și voi actualiza toate textele din cele 12 limbi pentru a reflecta exclusiv acțiunea de **Upgrade Elite / Premium**, eliminând cuvintele "Donate" sau "Revolut".

## Propuneri de modificări

### 1. Actualizare Traduceri [MODIFY] [script.js](file:///C:/Users/kretzu/AndroidStudioProjects/rGdbet2/app/src/main/assets/script.js)
Voi înlocui cheia `donate` cu `upgrade_btn` și voi seta următoarele valori (exemple):
*   `en`: "UPGRADE ELITE"
*   `ro`: "FĂ-ȚI UPGRADE!"
*   `it`: "PASSA A ELITE"
*   `es`: "MEJORAR A ELITE"
*   ... și restul limbilor în mod similar.

### 2. Actualizare Interfață [MODIFY] [index.html](file:///C:/Users/kretzu/AndroidStudioProjects/rGdbet2/app/src/main/assets/index.html)
*   Redenumirea ID-ului `donateBtn` în `upgradeBtn`.
*   Schimbarea clasei CSS `.btn-donate` în `.btn-upgrade-elite`.
*   Actualizarea atributului `data-i18n="donate"` la `data-i18n="upgrade_btn"`.

### 3. Actualizare Stiluri [MODIFY] [style.css](file:///C:/Users/kretzu/AndroidStudioProjects/rGdbet2/app/src/main/assets/style.css)
*   Redenumirea tuturor regulilor care vizează `.btn-donate` pentru a folosi noul nume `.btn-upgrade-elite`.

### 4. Sincronizare Scripturi [MODIFY] [script.js](file:///C:/Users/kretzu/AndroidStudioProjects/rGdbet2/app/src/main/assets/script.js)
*   Actualizarea oricărei referințe JS la elementul `donateBtn` (dacă există) pentru a folosi `upgradeBtn`.

## Plan de Verificare

### Verificare Vizuală
*   Confirmarea faptului că butonul galben de pe Home afișează acum "FĂ-ȚI UPGRADE!" (sau echivalentul în limba selectată) și nu mai conține textul "Revolut".
*   Verificarea aspectului butonului după redenumirea clasei CSS.

### Verificare Funcțională
*   Asigurarea că butonul încă deschide fluxul de upgrade prin `openUpgradeAction()`.

### Sincronizare Cloud
*   Sincronizarea folderului `docs/` pentru a propaga curățenia pe GitHub Pages.

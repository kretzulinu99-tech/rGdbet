# Plan de Integrare Claude 3.5 Sonnet (v20.0)

Acest plan vizează activarea modelului **Claude 3.5 Sonnet** de la Anthropic ca motor principal pentru modulul **AI Analist** din aplicație, utilizând cheia API furnizată.

## User Review Required

> [!CAUTION]
> Cheia API furnizată va fi stocată în codul sursă al aplicației (front-end). Deși acest lucru permite funcționarea imediată, este o practică nesigură pentru aplicații publice. Recomandăm mutarea acestei logici pe un server backend în viitor.

## Propuneri de modificări

### 1. Configurare Sistem [NEW]
*   Voi crea fișierul `C:\Users\kretzu\.claude\config.json` cu cheia ta, pentru a permite uneltelor locale (CLI/IDE) să recunoască modelul Claude.

### 2. Actualizare `ai-analyst.js` [MODIFY]
Voi rescrie funcția `callAI` pentru a face apeluri către Anthropic API în loc de Gemini:
*   **URL**: `https://api.anthropic.com/v1/messages`
*   **Model**: `claude-3-5-sonnet-20240620`
*   **Headers**: Includerea `x-api-key` și `anthropic-version`.
*   **Adaptare Stream**: Conversia formatului de răspuns de la Gemini la formatul Anthropic (Message API).

### 3. Sincronizare `docs/`
*   Actualizarea folderului de publicare pentru a activa motorul Claude și pe varianta web.

## Plan de Verificare

### Verificare Funcțională
*   **Analiză Meci**: Introducerea unui meci în pagina AI și verificarea dacă răspunsul vine de la Claude (ar trebui să fie mai detaliat și să respecte promptul de sistem).
*   **Logs**: Verificarea consolei pentru a asigura că nu există erori de tip CORS (Anthropic ar putea necesita un proxy pe web, dar voi încerca implementarea directă mai întâi).

## Notă despre Android Studio
Pentru a avea Claude AI ca asistent *în interiorul* editorului Android Studio (nu în aplicația ta), va trebui să instalezi manual un plugin precum **"Claude Dev"** sau **"Continue"** din *File > Settings > Plugins*, deoarece eu pot modifica doar codul proiectului, nu și funcționalitățile IDE-ului.

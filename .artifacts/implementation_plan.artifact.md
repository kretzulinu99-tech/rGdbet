# Plan de Implementare: Limitare Bilete pentru Utilizatori Free (v15.0)

Acest plan vizează activarea modelului Freemium prin impunerea unei limite de **20 de bilete pe lună** pentru utilizatorii care nu au un abonament Premium.

## User Review Required

> [!IMPORTANT]
> Limita se va aplica global pe contul utilizatorului (însumând biletele din toate portofoliile) pentru luna calendaristică curentă. Dacă limita este atinsă, procesul de adăugare va fi blocat și utilizatorul va fi invitat să facă upgrade.

## Propuneri de modificări

### 1. Definire Helper `isPremium` [MODIFY] [premium.js](file:///C:/Users/kretzu/AndroidStudioProjects/rGdbet2/app/src/main/assets/premium.js)
*   Voi adăuga funcția globală `window.isPremium()` care returnează `true` dacă utilizatorul are tier-ul 'premium'.

### 2. Implementare Verificare Limită [MODIFY] [script.js](file:///C:/Users/kretzu/AndroidStudioProjects/rGdbet2/app/src/main/assets/script.js)
*   În funcția `confirmPlaceTicket()`, înainte de a adăuga biletul în array-ul `bets`, voi insera următoarea logică:
    *   Dacă `!isPremium()`:
        *   Calculez numărul de bilete existente în luna curentă.
        *   Dacă numărul este `>= 20`:
            *   Afișez un mesaj de tip alertă/toast: "Ai atins limita de 20 de bilete/lună pentru contul Free."
            *   Apelez `openUpgradeAction()` pentru a deschide secțiunea de upgrade.
            *   Întrerup execuția (nu salvez biletul).

### 3. Sincronizare `docs/`
*   Actualizarea folderului de publicare pentru a activa limitarea și pe versiunea web.

## Plan de Verificare

### Verificare Funcțională
*   **Cont Free (< 20 bilete)**: Adăugarea unui bilet ar trebui să funcționeze normal.
*   **Cont Free (>= 20 bilete)**: Încercarea de a adăuga biletul 21 trebuie să fie blocată cu mesajul corespunzător.
*   **Cont Premium**: Adăugarea biletelor trebuie să fie nelimitată, indiferent de numărul lor.

### Verificare Vizuală
*   Confirmarea faptului că butonul de upgrade din alertă trimite utilizatorul la pagina corectă.

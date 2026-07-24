# Plan de Implementare: Monitorizarea Orei de Începere a Evenimentelor

Acest plan vizează adăugarea unui câmp pentru ora de începere a fiecărui eveniment de pe bilet. Această informație va permite o analiză mult mai precisă în motorul **AI Apex DNA**, facilitând detectarea pattern-urilor de profit în funcție de momentul zilei.

## User Review Required

> [!NOTE]
> Ora de începere va fi stocată pentru fiecare eveniment individual de pe bilet. Dacă un bilet are mai multe evenimente, fiecare poate avea propria oră.

## Propuneri de modificări

### 1. Interfața de Adăugare [MODIFY] [index.html](file:///C:/Users/kretzu/AndroidStudioProjects/rGdbet2/app/src/main/assets/index.html)
*   Adăugarea unui câmp de tip `time` cu id-ul `event-time` sub rândul de pronostic și cotă.
*   Etichetarea câmpului ca „Ora de începere”.

### 2. Logica de Stocare și Afișare [MODIFY] [script.js](file:///C:/Users/kretzu/AndroidStudioProjects/rGdbet2/app/src/main/assets/script.js)
*   **`addEventToTicket()`**: Va colecta valoarea din `event-time` și o va salva în obiectul evenimentului.
*   **`renderEvents()`**: Va afișa ora în lista temporară a evenimentelor de pe biletul în curs de creare.
*   **`render()`**: Va actualiza vizualizarea biletelor finale pentru a afișa ora lângă fiecare eveniment (ex: `14:30 ⚽ Real Madrid - Barca`).

### 3. Pregătire pentru DNA [FUTURE]
*   Datele despre oră vor fi disponibile automat pentru motorul DNA pentru a rafina analiza de tip "Nocturnal Blindspot".

## Plan de Verificare

### Verificare Manuală
*   Adăugarea unui bilet cu oră specifică și verificarea dacă aceasta apare corect în lista biletelor.
*   Verificarea resetării câmpului de oră după adăugarea unui eveniment.

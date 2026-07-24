# Manual BetBuilder Functionality

Add the ability to group multiple betting options under a single event manually, similar to a "BetBuilder" ticket. Users can now add multiple markets (e.g., Win, Goals, Corners) for the same match and see them grouped on their ticket.

## User Review Required

- **Grouping Logic**: The system will group events by their name (e.g., "Barca vs Real") if the names match exactly. Do we need a more explicit "Add to current match" button?
- **Manual Input**: The user requested everything to be manual, so we'll maintain the text-based entry for match names and odds.

## Proposed Changes

### UI Components

#### [index.html](file:///C:/Users/kretzu/AndroidStudioProjects/rGdbet2/app/src/main/assets/index.html)
- Add a "BetBuilder Mode" toggle or instructions in the "Add Bet" page.
- Ensure the events list can display grouped items clearly.

### Business Logic

#### [script.js](file:///C:/Users/kretzu/AndroidStudioProjects/rGdbet2/app/src/main/assets/script.js)
- Update `renderEvents` to group multiple options by match name.
- Modify the ticket data structure (if necessary, though `events` array already supports multiple entries) to handle display grouping.
- Ensure total odds calculation correctly multiplies all selected options.

### Styling

#### [style.css](file:///C:/Users/kretzu/AndroidStudioProjects/rGdbet2/app/src/main/assets/style.css)
- Add styles for grouped events on tickets (e.g., a "BetBuilder" badge or nested list style).

## Verification Plan

### Manual Verification
1. Open the "Bilete" (Add Bet) page.
2. Enter "Barca vs Real" as the match name and "1 solist" as the first option with its odds. Click Add.
3. Enter "Barca vs Real" again as the match name and "Over 2.5 goals" as the second option. Click Add.
4. Verify that both options appear under the same match header in the events list.
5. Verify that total odds are calculated correctly (multiplied).
6. Place the ticket and verify it appears correctly in the "Activ & Istoric" section with grouped markets.

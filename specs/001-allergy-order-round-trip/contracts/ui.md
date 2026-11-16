# Contract: User Interface

These are the routes, controls and exact visible text that users and tests rely on. RTL tests
find controls by the accessible names given here.

## Routes

| Path | Screen | Who |
|---|---|---|
| `/` (and any unknown path) | Role menu | Everyone (A-3) |
| `/server` | Server tablet | Role `server` |
| `/kitchen` | Kitchen display | Roles `station lead`, `expediter` |

Opening `/server` or `/kitchen` without a role for this tab sends the user to `/`. Every screen
header shows the current role, a "Change role" link to `/` and a "Reset demo data" button.

## Role menu (A-3)

Buttons: "Server", "Station lead", "Expediter", "Reset demo data". Picking a role saves it for
this tab and opens the route for that role. There is no password or login (Constitution IV).

## Server tablet (`/server`)

1. **Table picker**: one button per table ("Table 10", "Table 11", "Table 12").
2. **Seat strip**: one button per seat ("Seat 1"…"Seat n"). Each seat with an allergy shows its
   allergen names (REQ-02).
3. **Seat view** for the selected seat. The allergy panel is always visible here; no button
   opens it (R-11):
   - Allergen chips: 14 toggle buttons named by allergen ("Tree nuts", …) (REQ-01)
   - Severity chips: "severe allergy", "intolerance", "preference", "unknown". One choice, no
     default (REQ-01)
   - Traces chips: "Traces: yes", "Traces: no". One choice, no default (REQ-01)
   - "Note (optional)": text field, never required (REQ-01)
   - "Save allergy": enabled once ≥ 1 allergen, a severity and a traces value are chosen
   - The seat's recorded allergies are listed below the panel (REQ-02)
4. **Menu** for the selected seat: one row per dish, showing the dish name, `dishLabels(...)`
   and an "Add" button (REQ-04, REQ-05, REQ-16).
5. **Order** for the table: items grouped by seat. Each item shows its seat's allergies
   (REQ-02), its `dishLabels(...)` (including kitchen status after sending, REQ-12, REQ-13,
   REQ-15) and "Allergy order" when that applies (REQ-03). "Send order" sends all drafts for the
   table.

Sending a dish that shows "Contains <allergen>" is allowed, with no block or warning (Clarifications).

## Kitchen display (`/kitchen`)

- **Role switch** in the header: "Station lead" / "Expediter" (R-5).
- **Tickets** ordered by `sortTickets` (REQ-08). Each ticket shows its table and sent time.
- **Allergy ticket that is not acknowledged**: label "ALLERGY – NOT ACKNOWLEDGED" (REQ-08), and
  an "Acknowledge" button for the station lead (REQ-09).
- **Allergy item**: the `kitchenItemText` lines (REQ-06, REQ-07), the kitchen status, and the
  buttons from `offeredActions`:
  - "Confirm": station lead, status Acknowledged, dish info complete (REQ-10)
  - "Cannot confirm": station lead, status Acknowledged. Opens an inline "Reason" field (required)
    and a "Save" button (REQ-11)
  - "Sign off": expediter, status Confirmed, not signed off (REQ-14)
- **Normal item**: dish name and seat only; never the allergy label (REQ-21).

## Allowed status text (closed set, Constitution I)

`Contains <allergen>` · `Not confirmed` · `Cannot confirm` · `Reason: <text>` · `Kitchen: Sent`
· `Kitchen: Acknowledged` · `Confirmed` · `OK to serve` · `Allergy order` ·
`ALLERGY – NOT ACKNOWLEDGED` · `Cross-contact: <fryer|base|utensil>`

No screen, in any state, shows text that matches `/safe|allergen[\s-]*free/i`
(REQ-05, SC-002, R-13).

## Accessibility notes

Status is always shown as text, never only as color (REQ-06 says "as text"). Chips are
`<button aria-pressed>`, so the RTL tap count uses `getByRole('button', { name })`.

# Data Model: Allergy Order Round Trip

Phase 1 output for [plan.md](./plan.md). Types are in `frontend/src/domain/types.ts`; this file
is the reference for them. Requirements and assumptions are cited as REQ-xx and A-x.

## Static data (read-only, not in shared state)

### Allergen (REQ-01)

| Field | Type | Notes |
|---|---|---|
| `id` | `AllergenId` | String union of the 14 fixed ids, e.g. `"tree-nuts"` |
| `name` | `string` | Display name used verbatim in "Contains <name>" and on the kitchen display, e.g. "Tree nuts" |

The list is fixed in `data/allergens.ts`; the UI cannot add allergens.

### DishRecord (A-1, A-2)

| Field | Type | Notes |
|---|---|---|
| `id` | `string` | Stable id, e.g. `"walnut-salad"` |
| `name` | `string` | Display name; must not contain "safe" or "allergen-free" (R-13) |
| `allergens` | `AllergenId[]` | Listed allergens (REQ-04) |
| `allergenInfo` | `"complete" \| "missing" \| "unverified"` | Not `complete` → "Cannot confirm" on the tablet (REQ-16) and no "Confirm" in the kitchen (REQ-10) |
| `sharedEquipment` | `("fryer" \| "base" \| "utensil")[]` | Each one → "Cross-contact: <equipment>" (REQ-07) |
| `approvedChanges` | `Partial<Record<AllergenId, string[]>>` | Chef-approved changes per allergen (REQ-20, SHOULD) |

Both screens import the same `dishes.ts` module, so they always read the same record (A-1). Dish
records are never written (Out of Scope: editing dish records).

## Shared state (`localStorage`, see contracts/shared-state.md)

### AppState (root document)

| Field | Type | Notes |
|---|---|---|
| `schemaVersion` | `1` | Mismatch → reseed (R-14) |
| `revision` | `number` | +1 on every write; used in the broadcast notice |
| `tables` | `Table[]` | Seeded; not editable |
| `seats` | `Record<SeatKey, Seat>` | `SeatKey = "<tableId>:<seatNumber>"` |
| `orderItems` | `Record<string, OrderItem>` | Drafts and sent items |
| `tickets` | `Ticket[]` | In send order, oldest first |

### Table

| Field | Type | Notes |
|---|---|---|
| `id` | `string` | e.g. `"T12"` |
| `seatCount` | `number` | 1–6 |

### Seat

| Field | Type | Notes |
|---|---|---|
| `tableId` | `string` | |
| `number` | `number` | 1-based seat number shown as "seat 3" (REQ-06) |
| `allergies` | `Allergy[]` | Zero or more; each belongs to exactly this seat (REQ-02) |

### Allergy (REQ-01)

| Field | Type | Validation |
|---|---|---|
| `id` | `string` | Generated |
| `allergens` | `AllergenId[]` | ≥ 1, each from the fixed list |
| `severity` | `"severe" \| "intolerance" \| "preference" \| "unknown"` | Required; **no default** (R-11) |
| `traces` | `boolean` | Required; **no default** (R-11) |
| `note` | `string \| undefined` | Optional; trimmed; empty → `undefined` (REQ-01 scenario 2) |
| `recordedAt` | `string` (ISO) | From injected clock |

Display names for severity: severe allergy, intolerance, preference, unknown (as in the spec).

### OrderItem (one dish for one seat)

| Field | Type | Notes |
|---|---|---|
| `id` | `string` | |
| `tableId`, `seatNumber` | `string`, `number` | The seat it belongs to (REQ-02) |
| `dishId` | `string` | → DishRecord |
| `addedAt` | `string` (ISO) | |
| `ticketId` | `string \| null` | `null` = draft (not sent) |
| `isAllergyOrder` | `boolean \| null` | `null` while draft (computed live); fixed at send (R-10, REQ-03) |
| `allergySnapshot` | `Allergy[] \| null` | Seat allergies copied at send (R-10, REQ-06) |
| `kitchenStatus` | `KitchenStatus \| null` | Allergy orders only; `"Sent"` at send (A-8); `null` for normal items |
| `review` | `{ role: "station lead"; at: string } \| null` | Set by Confirm (REQ-10) |
| `cannotConfirm` | `{ role: "station lead"; reason: string; at: string } \| null` | Set by Cannot confirm (REQ-11); `reason` non-blank |
| `signOff` | `{ role: "expediter"; at: string } \| null` | Set by Sign off (REQ-14); drives "OK to serve" (REQ-15) |

A draft item's allergy display is always computed from the seat's **current** allergies, so
REQ-02 holds for items added before or after the allergy was recorded.

### Ticket (A-7)

| Field | Type | Notes |
|---|---|---|
| `id` | `string` | |
| `tableId` | `string` | One sent order for one table (A-7) |
| `sentAt` | `string` (ISO) | Basis for the 60 s escalation (REQ-21, SHOULD) |
| `itemIds` | `string[]` | The OrderItems sent together |
| `acknowledgedAt` | `string \| null` | Set by Acknowledge (REQ-09) |

Derived: `isAllergyTicket = items.some(i => i.isAllergyOrder)`. The seed has two normal
(non-allergy) tickets from other tables, so REQ-08 ordering can be tested.

### Role (A-3), stored per tab, not shared

`"server" | "station lead" | "expediter"`, held in `sessionStorage` (R-5).

## Rules (pure functions in `domain/`)

### Allergy order (REQ-03, REQ-18)

`isAllergyOrder(allergies) = allergies.some(a => a.severity ∈ {severe, intolerance, unknown})`.
A seat whose only severities are `preference` gives `false`, so its items are normal
modifications. The function gives this for free; REQ-18 is still tested only in the SHOULD phase.

### Tablet dish labels: `dishLabels(dish, seatAllergies, item?)` (REQ-04, REQ-05, REQ-13, REQ-16)

Rules are applied in this order. The result is a list, because several can apply (Edge Cases).

1. For each allergen in `seatAllergies` that is also in `dish.allergens`: add
   `"Contains <allergen name>"` (REQ-04). If no allergen matches, add no "Contains" label.
2. If `seatAllergies` is non-empty and `dish.allergenInfo ≠ "complete"`: add `"Cannot confirm"`
   (REQ-16).
3. If the item was sent as an allergy order, add the kitchen status label (table below).
4. If no "Contains", no "Cannot confirm" (from step 2 or the kitchen), and kitchen status ≠
   Confirmed: add `"Not confirmed"` (REQ-05, R-9).

### Tablet kitchen status label (REQ-12, REQ-13, REQ-15)

| `kitchenStatus` | `signOff` | Tablet shows |
|---|---|---|
| Sent | – | "Kitchen: Sent" + "Not confirmed" (if step 4 applies) |
| Acknowledged | – | "Kitchen: Acknowledged" + "Not confirmed" (if step 4 applies) |
| Confirmed | null | "Confirmed" |
| Confirmed | set | "Confirmed" + "OK to serve" |
| Cannot confirm | – | "Cannot confirm" + "Reason: <reason>" |

"Confirmed" is produced **only** in the Confirmed rows (REQ-13). "OK to serve" is produced
**only** when `signOff ≠ null` (REQ-15). Both are checked again on every render from the latest
snapshot, so a quick change of status still ends on the latest one (Edge Cases).

### Kitchen state machine (REQ-09, REQ-10, REQ-11, REQ-14)

```text
            Acknowledge (station lead, whole ticket)       Confirm (station lead,
  Sent ───────────────────────────────────────▶ Acknowledged ──── dish.allergenInfo = complete) ──▶ Confirmed ── Sign off (expediter) ──▶ Confirmed + signOff
                                                    │
                                                    └── Cannot confirm (station lead, reason ≠ blank) ──▶ Cannot confirm (end state)
```

| Action | Role | Allowed from | Guard | Effect |
|---|---|---|---|---|
| `acknowledge(ticketId)` | station lead | ticket not acknowledged | ticket is an allergy ticket | `ticket.acknowledgedAt = now`; every allergy item with status `Sent` → `Acknowledged`; normal items unchanged (REQ-09, A-7) |
| `confirm(itemId)` | station lead | `Acknowledged` | `dish.allergenInfo = "complete"` | → `Confirmed`; `review = {role, at: now}` (REQ-10) |
| `cannotConfirm(itemId, reason)` | station lead | `Acknowledged` | `reason.trim() ≠ ""` | → `Cannot confirm`; save trimmed reason, role and time (REQ-11) |
| `signOff(itemId)` | expediter | `Confirmed`, `signOff = null` | – | `signOff = {role, at: now}` (REQ-14) |

`offeredActions(item, ticket, dish, role)` returns exactly the buttons the table allows. The view
renders only those buttons. The reducers check the same guards again and do nothing if a guard
fails (R-4). For example, if "Cannot confirm" is saved with a blank reason, the state is
unchanged (REQ-11 scenario 5).

### Kitchen ordering (REQ-08)

Sort tickets by `(isAllergyTicket && !acknowledged) ? 0 : 1`, then by `sentAt`. Allergy tickets
that are not acknowledged stay at the top as newer tickets arrive. They show the label
"ALLERGY – NOT ACKNOWLEDGED" (en dash, U+2013).

### Kitchen item text (REQ-06, REQ-07)

Each allergy item shows as text: each allergen name from `allergySnapshot`, the severity display
name, `"seat <n>"`, and one `"Cross-contact: <equipment>"` per `dish.sharedEquipment` entry.

### Clearing items (REQ-22, SHOULD)

There is no "clear" action for allergy items unless `signOff ≠ null`. This is implemented in the
SHOULD phase.

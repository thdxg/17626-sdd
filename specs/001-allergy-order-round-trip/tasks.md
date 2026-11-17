---

description: "Task list for Allergy Order Round Trip"
---

# Tasks: Allergy Order Round Trip

**Input**: Design documents from `/specs/001-allergy-order-round-trip/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ (shared-state.md, domain-api.md, ui.md), quickstart.md

**Tests**: Included. Constitution V says work is done only when the acceptance examples of its REQ IDs pass, and quickstart.md §2 maps every acceptance scenario to a Vitest file. Within each story, write the tests first and confirm they fail.

**Organization**: Tasks are grouped by user story. All five stories are P1 (spec.md). SHOULD requirements (REQ-18…REQ-22) are in a separate phase that starts only after the MUST gate (Constitution IV, SC-007). Those tasks keep their story label.

## Conventions (apply to every task)

- **REQ IDs (Constitution II)**: every task ends with `REQ:` and the REQ IDs it implements or tests. Setup and foundational tasks name the REQ IDs they are needed for, plus the assumption (A-x) or success criterion (SC-xxx) that drives them. Commits and PRs for a task name the same REQ IDs.
- **Test names** start with the REQ IDs they cover, e.g. `it("REQ-10: Confirm is not offered before Acknowledge", …)`, so `npx vitest run -t "REQ-10"` runs one requirement (quickstart.md §2).
- **Paths**: all source paths are under `frontend/` (plan.md §Project Structure). Tests live in `frontend/src/test/`.
- **Forbidden words**: no string in any source file that reaches the screen may match `/safe|allergen[\s-]*free/i` (Constitution I, REQ-05). Status text comes only from `LABEL` and the helpers in `frontend/src/domain/labels.ts` (contracts/ui.md §Allowed status text).
- **Purity**: files in `frontend/src/domain/` import nothing from React, the DOM or storage, and never call `Date.now()`; time is passed in (contracts/domain-api.md).
- **Reducers**: a reducer whose guard fails returns the **same object reference** so the store skips the write and the broadcast (contracts/domain-api.md).

## Format: `[ID] [P?] [Story] Description — REQ: …`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: US1…US5 from spec.md

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Test tooling and static hosting for the existing `frontend/` Vite + React 19 + TypeScript project.

- [ ] T001 Add devDependencies `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/dom`, `@testing-library/user-event` to `frontend/package.json` with `npm install -D` in `frontend/`. Before installing, check with Context7 that the chosen Vitest major lists Vite 8 as a supported peer and that the Testing Library versions support React 19 (research R-6); pin the exact installed versions. Do not add `@testing-library/jest-dom` or any router library (research R-2, R-6). Add the script `"test": "vitest run"`. — REQ: test harness for REQ-01–REQ-17 acceptance examples (Constitution V)
- [ ] T002 Add a Vitest `test` block to `frontend/vite.config.ts`: `test: { environment: "jsdom", setupFiles: "src/test/setup.ts" }`. Use `/// <reference types="vitest/config" />` (or `defineConfig` from `vitest/config`, whichever Context7 shows as current for this Vitest version) so `tsc -b` still passes. — REQ: test harness for REQ-01–REQ-17 (Constitution V)
- [ ] T003 [P] Create `frontend/src/test/setup.ts`: call RTL `cleanup()` after each test and clear `window.localStorage` and `window.sessionStorage` before each test. — REQ: test isolation for REQ-01–REQ-17 (Constitution V)
- [ ] T004 [P] Create `frontend/vercel.json` with `{"rewrites": [{"source": "/(.*)", "destination": "/index.html"}]}` so a direct load or reload of `/server` and `/kitchen` serves the app (research R-7). Check with Context7 / Vercel docs that this rewrite syntax is current. — REQ: REQ-12 (two-tab use of `/server` and `/kitchen`, A-10)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Types, mock data, the shared store, routing and the role menu. Every story needs these.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

### Types and mock data

- [ ] T005 Create `frontend/src/domain/types.ts` with every type in data-model.md, exactly as specified:
  - `AllergenId` — string union of the 14 fixed ids (`"gluten" | "crustaceans" | "eggs" | "fish" | "peanuts" | "soybeans" | "milk" | "tree-nuts" | "celery" | "mustard" | "sesame" | "sulphites" | "lupin" | "molluscs"`); `Allergen { id; name }`.
  - `Equipment = "fryer" | "base" | "utensil"`; `DishRecord { id; name; allergens: AllergenId[]; allergenInfo: "complete" | "missing" | "unverified"; sharedEquipment: Equipment[]; approvedChanges: Partial<Record<AllergenId, string[]>> }`.
  - `Severity = "severe" | "intolerance" | "preference" | "unknown"` plus `SEVERITY_DISPLAY` mapping to "severe allergy", "intolerance", "preference", "unknown".
  - `Allergy { id; allergens: AllergenId[] (≥ 1, each from the fixed list); severity: Severity (Required; **no default**); traces: boolean (Required; **no default**); note?: string (Optional; trimmed; empty → undefined); recordedAt: string (ISO) }`.
  - `Table { id: string; seatCount: number (1–6) }`; `SeatKey = \`${string}:${number}\`` ("<tableId>:<seatNumber>"); `Seat { tableId; number (1-based); allergies: Allergy[] }`.
  - `KitchenStatus = "Sent" | "Acknowledged" | "Confirmed" | "Cannot confirm"`.
  - `OrderItem { id; tableId; seatNumber; dishId; addedAt; ticketId: string | null (null = draft); isAllergyOrder: boolean | null (null while draft; fixed at send); allergySnapshot: Allergy[] | null; kitchenStatus: KitchenStatus | null (allergy orders only; "Sent" at send; null for normal items); review: { role: "station lead"; at: string } | null; cannotConfirm: { role: "station lead"; reason: string; at: string } | null (reason non-blank); signOff: { role: "expediter"; at: string } | null }`.
  - `Ticket { id; tableId; sentAt; itemIds: string[]; acknowledgedAt: string | null }`.
  - `AppState { schemaVersion: 1; revision: number; tables: Table[]; seats: Record<SeatKey, Seat>; orderItems: Record<string, OrderItem>; tickets: Ticket[] (in send order, oldest first) }`.
  - `Role = "server" | "station lead" | "expediter"`.
  — REQ: REQ-01, REQ-02, REQ-03, REQ-06, REQ-09, REQ-10, REQ-11, REQ-14, REQ-15
- [ ] T006 [P] Create `frontend/src/data/allergens.ts` exporting the fixed, read-only list of the 14 allergens (research R-8) with display names: Gluten, Crustaceans, Eggs, Fish, Peanuts, Soybeans, Milk, Tree nuts, Celery, Mustard, Sesame, Sulphites, Lupin, Molluscs; plus `allergenName(id)`. The UI cannot add allergens. — REQ: REQ-01, REQ-04, REQ-06
- [ ] T007 [P] Create `frontend/src/data/dishes.ts` exporting exactly the 8 read-only `DishRecord`s in research R-8 (walnut-salad, almond-tart, fish-chips, steak-frites, risotto, roast-chicken, green-salad, daily-special) with their allergens, `allergenInfo` (only `daily-special` is `"missing"`), `sharedEquipment` (fish-chips and steak-frites `["fryer"]`, roast-chicken `["base"]`, green-salad `["utensil"]`) and `approvedChanges` (walnut-salad `{ "tree-nuts": ["Without walnuts"] }`, risotto `{ milk: ["Olive oil instead of butter and parmesan"] }`); plus `dishById(id)`. Freeze the records (`as const` / `Object.freeze`); they are never written. Both screens import this one module (A-1). — REQ: REQ-04, REQ-07, REQ-10, REQ-16, REQ-20 (A-1, A-2)
- [ ] T008 [P] Create `frontend/src/data/seed.ts` exporting `createSeed(): AppState` with `schemaVersion: 1`, `revision: 0`, tables `T10` (4 seats), `T11` (4 seats), `T12` (6 seats) shown as "Table 10/11/12", one empty `Seat` per seat, and **two sent normal tickets** for T10 and T11 (items with `isAllergyOrder: false`, `kitchenStatus: null`, `allergySnapshot: []`, `acknowledgedAt: null`) whose `sentAt` is before any new order, so REQ-08 ordering can be seen (data-model.md §Ticket). — REQ: REQ-02, REQ-08 (A-10)
- [ ] T009 [P] Create `frontend/src/test/data.test.ts`: (a) REQ-05 — every string in `dishes.ts` and `allergens.ts` does not match `/safe|allergen[\s-]*free/i` (research R-13c); (b) A-2 — at least one dish lists tree nuts, one has `sharedEquipment` containing `fryer`, one has a non-empty `approvedChanges`, one has `allergenInfo: "missing"`; (c) REQ-01 — the allergen list has exactly 14 unique ids. — REQ: REQ-01, REQ-05 (A-2)
- [ ] T010 Create `frontend/src/domain/labels.ts` with the `LABEL` constant object only (contracts/domain-api.md): `notConfirmed: "Not confirmed"`, `cannotConfirm: "Cannot confirm"`, `confirmed: "Confirmed"`, `okToServe: "OK to serve"`, `allergyNotAcknowledged: "ALLERGY – NOT ACKNOWLEDGED"` (en dash U+2013), and also `allergyOrder: "Allergy order"`, `kitchenSent: "Kitchen: Sent"`, `kitchenAcknowledged: "Kitchen: Acknowledged"`, `reasonPrefix: "Reason: "` — the closed set in contracts/ui.md §Allowed status text. Label functions are added in US2, US3 and US5. — REQ: REQ-05, REQ-08, REQ-13, REQ-15, REQ-16

### Shared state and store

- [ ] T011 Create `frontend/src/domain/actions.ts` with the `Action` discriminated union for every action in contracts/domain-api.md (`recordAllergy`, `addItem`, `removeDraftItem`, `sendOrder`, `acknowledge`, `confirm`, `cannotConfirm`, `signOff`, `reset`) and `reduce(state: AppState, action: Action, now: Date): AppState`. Implement only `reset` (returns `createSeed()`; the store sets the revision). Every other case returns `state` unchanged (same reference) until its story implements it. Add a small `newId(prefix, now)` helper that does not use `Math.random` in a way that breaks tests (e.g. counter + timestamp). — REQ: REQ-12 (A-10 reset)
- [ ] T012 [P] Create `frontend/src/test/fakes.ts` with `memoryStorage(): StorageLike`, `fakeChannelPair()` (returns a factory; every channel made from it delivers `postMessage` to every **other** channel from the same factory, synchronously or via a `flush()` the test calls) and `fixedClock(ms)` (returns `now()` plus `advance(ms)`) (contracts/domain-api.md §store). — REQ: REQ-12, REQ-13, REQ-15
- [ ] T013 Create `frontend/src/store/store.ts` implementing `createStore({ storage, channel, now, onExternalChange })` exactly as contracts/shared-state.md:
  - key `allergy-round-trip/state`; JSON of `AppState`;
  - invalid document (missing, parse error, `schemaVersion ≠ 1`) → write `createSeed()` with `revision: 0`;
  - `dispatch`: read latest from storage → `reduce(state, action, now())` → if the result is the same reference, do nothing; else `revision + 1` → write → `channel.postMessage({ type: "state-changed", revision })` → notify subscribers; `reset` writes the seed with `revision = current + 1`;
  - receiver: ignore a notice whose `revision ≤` the current revision; otherwise re-read storage and notify;
  - `onExternalChange` hook lets the app re-read on `storage` events for the key and on `visibilitychange` to visible;
  - `channel: null` → skip posting.
  `getSnapshot()` must return a stable reference between changes (needed by `useSyncExternalStore`). — REQ: REQ-12, REQ-13, REQ-15 (A-10)
- [ ] T014 Create `frontend/src/test/store.persist.test.ts`: missing document, unparseable JSON and `schemaVersion: 2` each reseed with `revision: 0`; a guard-failing dispatch does not write or post; `reset` writes the seed with a higher revision. — REQ: REQ-12 (A-10)
- [ ] T015 Create `frontend/src/store/useAppState.ts` with a `StoreProvider` (React context holding the store) and `useAppState()` / `useDispatch()` built on `useSyncExternalStore` (research R-3). — REQ: REQ-12
- [ ] T016 [P] Create `frontend/src/store/role.ts`: `getRole(): Role | null` and `setRole(role)` over `sessionStorage` key `allergy-round-trip/role`; invalid values read as `null` (contracts/shared-state.md §Per-tab, research R-5). — REQ: REQ-09, REQ-10, REQ-11, REQ-14 (A-3, A-9)
- [ ] T017 [P] Create `frontend/src/routing/usePath.ts`: `usePath()` returns `{ path, navigate(path) }`, reads `window.location.pathname`, listens to `popstate`, and navigates with `history.pushState` (research R-2). No router dependency. — REQ: REQ-12 (A-10: `/server` and `/kitchen` as two tabs)

### Shell: role menu, header, app

- [ ] T018 Create `frontend/src/views/Header.tsx`: shows the current role, a "Change role" link to `/`, and a "Reset demo data" button that dispatches `reset` (contracts/ui.md §Routes). — REQ: REQ-12 (A-3, A-10)
- [ ] T019 Create `frontend/src/views/RoleMenu.tsx` with buttons "Server", "Station lead", "Expediter", "Reset demo data". Picking a role calls `setRole` and navigates: server → `/server`, station lead and expediter → `/kitchen`. No password or login (contracts/ui.md §Role menu, Constitution IV). — REQ: REQ-09, REQ-10, REQ-11, REQ-14 (A-3)
- [ ] T020 Replace `frontend/src/App.tsx` with the path switch: `/server` → server screen placeholder, `/kitchen` → kitchen screen placeholder, `/` and any unknown path → `RoleMenu`; opening `/server` or `/kitchen` with no role for this tab navigates to `/`. Update `frontend/src/main.tsx` to build the real store: `storage: window.localStorage`, `channel: typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("allergy-round-trip") : null`, `now: () => new Date()`, and an `onExternalChange` that subscribes to `window` `storage` events for the state key and `document` `visibilitychange` (visible). Wrap the app in `StoreProvider`. — REQ: REQ-12 (A-3, A-10)
- [ ] T021 Create test helpers: `frontend/src/test/fixtures.ts` (builders that return literal `AppState` values from `createSeed()` — `withAllergy(state, tableId, seat, partialAllergy)`, `withDraftItem(...)`, `withSentAllergyTicket(state, { tableId, items: [{ seat, dishId, kitchenStatus, signOff?, cannotConfirm? }] })` — **without** calling reducers, so each story can be tested on its own) and `frontend/src/test/renderApp.tsx` (`renderApp({ path, role, state?, store? })` creates a store over `memoryStorage` + fake channel + fixed clock, sets the role and path, and renders `<App/>` in `StoreProvider`; returns `{ store, user: userEvent.setup() }`). — REQ: test support for REQ-01–REQ-17 (Constitution V)
- [ ] T022 Create `frontend/src/test/app.shell.test.tsx`: the role menu shows the three role buttons and "Reset demo data"; "Server" opens `/server`, "Station lead" and "Expediter" open `/kitchen`; `/kitchen` with no role goes to `/`; "Reset demo data" in the header restores the seed. — REQ: REQ-09, REQ-10, REQ-11, REQ-14 (A-3, A-10)

**Checkpoint**: `npm test` passes the shell tests; the app opens the role menu and both placeholder screens.

---

## Phase 3: User Story 1 — Server records a guest's allergy on a seat (Priority: P1) 🎯 MVP

**Goal**: On the tablet, the server records an allergy for one seat in ≤ 4 taps; it is attached to that seat and all its items, and to no other seat; items on a seat with severe allergy, intolerance or unknown are allergy orders.

**Independent Test**: On `/server` alone, record allergies on seats of Table 12 and check which seats and items carry them and which items show "Allergy order".

### Tests for User Story 1 (write first, confirm they fail)

- [ ] T023 [P] [US1] Create `frontend/src/test/allergyOrder.test.ts`: `isAllergyOrder` is `true` for each of `severe`, `intolerance`, `unknown` (US1 scenario 4, A-5); `true` for a seat with one `preference` and one `severe` allergy (Edge Cases); `false` for `[]`. Add a `describe.skip("REQ-18 …")` block with the preference-only case (enabled in T071). — REQ: REQ-03
- [ ] T024 [P] [US1] Create `frontend/src/test/actions.test.ts` with a `recordAllergy` / `addItem` section: REQ-01 — empty allergens, missing severity or missing traces returns the same reference; note `"  "` is stored as `undefined` (scenario 2) and `" x "` as `"x"`; REQ-02 — an allergy recorded for `T12:3` appears only in `seats["T12:3"].allergies`, not in `T12:2` or `T12:4` (scenario 3); `addItem` with an unknown dish id returns the same reference; a new draft item has `ticketId: null` and `isAllergyOrder: null`. — REQ: REQ-01, REQ-02, REQ-03
- [ ] T025 [P] [US1] Create `frontend/src/test/us1.allergy-panel.test.tsx` (RTL via `renderApp`): scenario 1 — on seat 3 the 14 allergen chips, the 4 severity chips ("severe allergy", "intolerance", "preference", "unknown"), "Traces: yes" / "Traces: no" and "Note (optional)" are present; "Save allergy" is disabled until an allergen, a severity and a traces value are chosen; scenario 2 — saving with an empty note works; scenario 3 — with an allergy on seat 3 and two items on seat 3, the allergy shows on seat 3 and both its items and on no item of seats 2 and 4; scenario 4 — those items show "Allergy order". — REQ: REQ-01, REQ-02, REQ-03
- [ ] T026 [P] [US1] Create `frontend/src/test/us1.tap-count.test.tsx` (research R-11): wrap `user.click` and `user.type` in counters; starting from the seat view of Table 12 seat 3, record "Tree nuts" + "severe allergy" + "Traces: yes" + "Save allergy"; assert the allergy is saved, click count is exactly 4 (≤ 4 passes; boundary rows 3/4/5), type count is 0, and no navigation happened; add a guard test that the allergen chips are visible on the seat view with no other control pressed first. — REQ: REQ-17

### Implementation for User Story 1

- [ ] T027 [P] [US1] Create `frontend/src/domain/allergyOrder.ts` with `isAllergyOrder(allergies) = allergies.some(a => a.severity ∈ {"severe", "intolerance", "unknown"})` (data-model.md §Allergy order). — REQ: REQ-03 (REQ-18 behaviour follows but is tested only in Phase 9)
- [ ] T028 [US1] In `frontend/src/domain/actions.ts` implement `recordAllergy` (guard: `allergens` ≥ 1 and each from the fixed list, `severity` and `traces` present — **no default**; note trimmed, empty → `undefined`; `id` generated; `recordedAt = now.toISOString()`; appended only to `seats["<tableId>:<seatNumber>"]`), `addItem` (guard: known dish; creates a draft `OrderItem` with `ticketId: null`, `isAllergyOrder: null`, `allergySnapshot: null`, `kitchenStatus: null`, `review/cannotConfirm/signOff: null`) and `removeDraftItem` (guard: item exists and `ticketId === null`). — REQ: REQ-01, REQ-02, REQ-03
- [ ] T029 [P] [US1] Create `frontend/src/views/server/TablePicker.tsx` (buttons "Table 10", "Table 11", "Table 12") and `frontend/src/views/server/SeatStrip.tsx` (buttons "Seat 1"…"Seat n"; each seat with allergies shows its allergen names as text). — REQ: REQ-02
- [ ] T030 [US1] Create `frontend/src/views/server/AllergyPanel.tsx` (contracts/ui.md §Server tablet 3): 14 allergen toggle chips, 4 severity chips (single choice, no default), "Traces: yes" / "Traces: no" (single choice, no default), all as `<button aria-pressed>`; a collapsed "Note (optional)" text field that is never required; "Save allergy" enabled once ≥ 1 allergen, a severity and a traces value are chosen; on save dispatch `recordAllergy` and clear the panel. No step opens another screen or dialog. — REQ: REQ-01, REQ-17
- [ ] T031 [US1] Create `frontend/src/views/server/SeatView.tsx`: renders `AllergyPanel` always visible (no button opens it, research R-11) and lists the seat's recorded allergies below it (allergen names, severity display name, "Traces: yes/no", note). — REQ: REQ-01, REQ-02, REQ-17
- [ ] T032 [US1] Create `frontend/src/views/server/DishList.tsx` with one row per dish (dish name and an "Add" button that dispatches `addItem` for the selected seat). Labels are added in US2. — REQ: REQ-02, REQ-03
- [ ] T033 [US1] Create `frontend/src/views/server/OrderPanel.tsx`: items for the selected table grouped by seat; each draft item shows its seat's **current** allergies (data-model.md §OrderItem) and `LABEL.allergyOrder` when `isAllergyOrder(seat.allergies)` is true; a "Remove" button on draft items dispatches `removeDraftItem`. — REQ: REQ-02, REQ-03
- [ ] T034 [US1] Create `frontend/src/views/server/ServerScreen.tsx` composing `Header`, `TablePicker`, `SeatStrip`, `SeatView`, `DishList`, `OrderPanel` (selected table/seat in local component state), and route `/server` to it in `frontend/src/App.tsx`. Run T023–T026 until they pass. — REQ: REQ-01, REQ-02, REQ-03, REQ-17

**Checkpoint**: US1 acceptance tests pass; recording an allergy on Table 12 seat 3 takes 4 taps.

---

## Phase 4: User Story 2 — Server checks dishes against the seat's allergy (Priority: P1)

**Goal**: Each dish row and draft item shows "Contains <allergen>", "Cannot confirm" or "Not confirmed" — never "safe".

**Independent Test**: With the mock menu and a tree-nut allergy on seat 3 (fixture), check each dish's labels on `/server`; no kitchen display needed.

### Tests for User Story 2 (write first, confirm they fail)

- [ ] T035 [P] [US2] Create `frontend/src/test/labels.test.ts` with a `dishLabels` (menu row, no `item`) section: REQ-04 — tree-nut seat × walnut-salad and almond-tart → includes "Contains Tree nuts"; tree-nut seat × risotto → no label starting with "Contains" (scenarios 1, 2); a seat with two matching allergens gets one "Contains" per match; REQ-05 — tree-nut seat × steak-frites → `["Not confirmed"]` (scenario 3); a seat with no allergy × any complete dish → no "Not confirmed" (scenario 8, research R-9); REQ-16 — any allergy seat × daily-special → includes "Cannot confirm" and not "Not confirmed" (scenario 5); no-allergy seat × daily-special → no "Cannot confirm" (REQ-16 applies "for any seat with an allergy"); Edge case — a dish that lists the allergen and has `allergenInfo: "unverified"` (inline test record) shows both "Contains …" and "Cannot confirm" and not "Not confirmed". — REQ: REQ-04, REQ-05, REQ-16
- [ ] T036 [P] [US2] Create `frontend/src/test/us2.dish-labels.test.tsx` (RTL): with a fixture tree-nut allergy on Table 12 seat 3, the menu shows "Contains Tree nuts" on "Pear & walnut salad", "Not confirmed" on "Steak frites", "Cannot confirm" on "Daily special"; after adding those three, the draft items in the order panel show the same labels; adding a "Contains" dish is allowed with no block or warning (Clarifications). — REQ: REQ-04, REQ-05, REQ-16

### Implementation for User Story 2

- [ ] T037 [US2] In `frontend/src/domain/labels.ts` add `containsLabel(allergen)` → `` `Contains ${allergenName(allergen)}` `` and `dishLabels(dish, seatAllergies, item?)` implementing data-model.md §Tablet dish labels steps 1, 2 and 4 in that order: (1) one "Contains <name>" per allergen in `seatAllergies` that is in `dish.allergens` (deduplicated); (2) if `seatAllergies` is non-empty and `dish.allergenInfo ≠ "complete"`, add "Cannot confirm"; (4) if `seatAllergies` is non-empty and there is no "Contains" and no "Cannot confirm", add "Not confirmed" (a seat with no allergy gets no "Not confirmed"). Leave a clearly marked place for step 3 (kitchen status, US5); for now `item` is ignored. — REQ: REQ-04, REQ-05, REQ-16
- [ ] T038 [US2] Show `dishLabels(dish, seat.allergies)` on each row of `frontend/src/views/server/DishList.tsx` and on each draft item of `frontend/src/views/server/OrderPanel.tsx` (draft items use the seat's current allergies). Labels render as text. Run T035–T036 until they pass. — REQ: REQ-04, REQ-05, REQ-16

**Checkpoint**: US1 and US2 tests pass; the menu never says anything but "Contains …", "Cannot confirm" or "Not confirmed".

---

## Phase 5: User Story 3 — Kitchen notices and acknowledges the allergy ticket (Priority: P1)

**Goal**: "Send order" creates a ticket; on `/kitchen` an unacknowledged allergy ticket stays on top with "ALLERGY – NOT ACKNOWLEDGED", allergy items show allergen, severity, seat and cross-contact as text, and the station lead can acknowledge.

**Independent Test**: Load a fixture state with a sent allergy ticket (or send one from `/server`) and check position, labels and status after "Acknowledge" on `/kitchen`.

### Tests for User Story 3 (write first, confirm they fail)

- [ ] T039 [P] [US3] Create `frontend/src/test/kitchen.test.ts` with sections: REQ-06 — `kitchenItemText` for a sent item on seat 3 with snapshot tree nuts / severe gives lines containing "Tree nuts", "severe allergy", "seat 3" (scenario 1); REQ-07 — fish-chips and steak-frites give "Cross-contact: fryer", roast-chicken "Cross-contact: base", green-salad "Cross-contact: utensil", walnut-salad none (scenario 2); REQ-08 — `sortTickets` puts an unacknowledged allergy ticket before older and newer normal tickets, keeps it on top after a newer normal ticket is added, and drops it back into `sentAt` order once acknowledged (scenario 3); REQ-09 — `offeredActions` includes `"acknowledge"` only for role `"station lead"` on an unacknowledged allergy ticket. — REQ: REQ-06, REQ-07, REQ-08, REQ-09
- [ ] T040 [P] [US3] Add a `sendOrder` / `acknowledge` section to `frontend/src/test/actions.test.ts`: `sendOrder` with no drafts returns the same reference; with drafts it creates one ticket for the table (A-7) with `sentAt = now`, sets each item's `ticketId`, copies `allergySnapshot` from the seat, fixes `isAllergyOrder`, and sets `kitchenStatus: "Sent"` for allergy items (A-8) and `null` for normal items; `acknowledge` by the station lead sets `acknowledgedAt` and moves only `Sent` allergy items to `"Acknowledged"`, leaving normal items unchanged (scenario 4, Edge Cases); role ≠ station lead, already acknowledged, or a non-allergy ticket returns the same reference. — REQ: REQ-03, REQ-06, REQ-09
- [ ] T041 [P] [US3] Create `frontend/src/test/us3.kitchen.test.tsx` (RTL, role station lead, fixture with the two seeded normal tickets + one sent allergy ticket for T12): the allergy ticket is first and shows "ALLERGY – NOT ACKNOWLEDGED"; items show "Tree nuts", "severe allergy", "seat 3", and steak frites shows "Cross-contact: fryer"; a newer normal ticket dispatched into the store does not move it down; tapping "Acknowledge" removes the label and items show status "Acknowledged"; as expediter there is no "Acknowledge" button; normal items show dish name and seat only, never the allergy label. Also a tablet check: on `/server` "Send order" sends all drafts for the table. — REQ: REQ-06, REQ-07, REQ-08, REQ-09

### Implementation for User Story 3

- [ ] T042 [US3] In `frontend/src/domain/actions.ts` implement `sendOrder({ tableId })` (guard: ≥ 1 draft item for the table; one new `Ticket` appended to `tickets`; each draft gets `ticketId`, `allergySnapshot = structuredClone(seat.allergies)`, `isAllergyOrder = isAllergyOrder(seat.allergies)`, `kitchenStatus = isAllergyOrder ? "Sent" : null`) and `acknowledge({ ticketId, role })` (guard: role `"station lead"`, ticket exists, `acknowledgedAt === null`, ticket has an allergy item; sets `acknowledgedAt = now` and every allergy item with status `Sent` → `Acknowledged`). — REQ: REQ-03, REQ-06, REQ-09 (A-7, A-8)
- [ ] T043 [P] [US3] In `frontend/src/domain/labels.ts` add `crossContactLabel(eq)` → `` `Cross-contact: ${eq}` `` and `kitchenItemText(item, dish)` returning: each allergen name from `item.allergySnapshot`, each distinct severity display name, `` `seat ${item.seatNumber}` ``, and one `crossContactLabel` per `dish.sharedEquipment` entry (data-model.md §Kitchen item text). — REQ: REQ-06, REQ-07
- [ ] T044 [P] [US3] Create `frontend/src/domain/kitchen.ts` with `KitchenAction`, `isAllergyTicket(ticket, items)`, `sortTickets(tickets, items)` (key `(isAllergyTicket && acknowledgedAt === null) ? 0 : 1`, then `sentAt` ascending; stable), and `offeredActions(item, ticket, dish, role)` returning `["acknowledge"]` only when role is `"station lead"`, the ticket is an allergy ticket and not acknowledged (the confirm / cannotConfirm / signOff rows come in US4). — REQ: REQ-08, REQ-09
- [ ] T045 [US3] Add a "Send order" button to `frontend/src/views/server/OrderPanel.tsx` that dispatches `sendOrder` for the selected table (no block or warning for "Contains" dishes, Clarifications). Sent items stay listed under their seat (kitchen status labels come in US5). — REQ: REQ-03, REQ-06
- [ ] T046 [P] [US3] Create `frontend/src/views/kitchen/AllergyItemRow.tsx` (dish name, every `kitchenItemText` line as text, and the kitchen status as text) and `frontend/src/views/kitchen/NormalItemRow.tsx` (dish name and "seat <n>" only; never `LABEL.allergyNotAcknowledged` or `LABEL.allergyOrder`). — REQ: REQ-06, REQ-07
- [ ] T047 [US3] Create `frontend/src/views/kitchen/TicketCard.tsx`: shows the table and sent time; for an unacknowledged allergy ticket shows `LABEL.allergyNotAcknowledged` and, when `offeredActions` includes `"acknowledge"`, an "Acknowledge" button that dispatches `acknowledge` with the tab's role; renders `AllergyItemRow` / `NormalItemRow` per item. — REQ: REQ-08, REQ-09
- [ ] T048 [US3] Create `frontend/src/views/kitchen/TicketList.tsx` (renders `sortTickets(...)`) and `frontend/src/views/kitchen/KitchenScreen.tsx` (`Header` + a "Station lead" / "Expediter" role switch that calls `setRole` (research R-5) + `TicketList`), and route `/kitchen` to it in `frontend/src/App.tsx`. Run T039–T041 until they pass. — REQ: REQ-06, REQ-07, REQ-08, REQ-09

**Checkpoint**: US1–US3 tests pass; an allergy ticket sent from the tablet reaches the top of the kitchen display and can be acknowledged.

---

## Phase 6: User Story 4 — Station lead reviews; expediter signs off (Priority: P1)

**Goal**: The station lead can Confirm (only when acknowledged and the dish info is complete) or Cannot confirm with a required reason; the expediter can Sign off only a confirmed item.

**Independent Test**: On `/kitchen` with fixture tickets, switch roles and move items through Acknowledged → Confirmed / Cannot confirm → signed off, checking offered buttons and saved data.

### Tests for User Story 4 (write first, confirm they fail)

- [ ] T049 [P] [US4] Add an `offeredActions` review section to `frontend/src/test/kitchen.test.ts` covering every (role × kitchenStatus × allergenInfo) combination: REQ-10 — `"confirm"` only for station lead + `Acknowledged` + `allergenInfo: "complete"`; never for `Sent` (scenario 2) or for daily-special (scenario 3); REQ-11 — `"cannotConfirm"` for station lead + `Acknowledged` (including daily-special, scenario 3); REQ-14 — `"signOff"` only for expediter + `Confirmed` + `signOff === null`; never for `Sent`, `Acknowledged`, `Cannot confirm` (scenario 7). — REQ: REQ-10, REQ-11, REQ-14
- [ ] T050 [P] [US4] Add a `confirm` / `cannotConfirm` / `signOff` section to `frontend/src/test/actions.test.ts`: `confirm` → `"Confirmed"` with `review = { role: "station lead", at: now ISO }` (scenario 1); `confirm` on `Sent`, on daily-special, or with role expediter → same reference; `cannotConfirm` with reason `"  Supplier sheet missing "` → `"Cannot confirm"` with trimmed reason, role and time (scenario 4); blank / whitespace reason → same reference, status unchanged (scenario 5); `signOff` on `Confirmed` → `signOff = { role: "expediter", at }` (scenario 6); `signOff` on any other status, twice, or by station lead → same reference. — REQ: REQ-10, REQ-11, REQ-14
- [ ] T051 [P] [US4] Create `frontend/src/test/us4.review.test.tsx` (RTL): as station lead on an acknowledged ticket, steak frites shows "Confirm" and tapping it shows "Confirmed"; daily special shows no "Confirm" but shows "Cannot confirm"; tapping "Cannot confirm" opens an inline required "Reason" field and "Save"; "Save" with an empty reason leaves the status unchanged; with "Supplier sheet missing" the status becomes "Cannot confirm" and the reason is shown; switching to "Expediter", only the confirmed item offers "Sign off", and tapping it saves the sign-off. — REQ: REQ-10, REQ-11, REQ-14

### Implementation for User Story 4

- [ ] T052 [US4] In `frontend/src/domain/kitchen.ts` extend `offeredActions` with the rows of data-model.md §Kitchen state machine: `"confirm"` (station lead, `Acknowledged`, `dish.allergenInfo === "complete"`), `"cannotConfirm"` (station lead, `Acknowledged`), `"signOff"` (expediter, `Confirmed`, `signOff === null`). — REQ: REQ-10, REQ-11, REQ-14
- [ ] T053 [US4] In `frontend/src/domain/actions.ts` implement `confirm({ itemId, role })`, `cannotConfirm({ itemId, role, reason })` (`reason.trim() ≠ ""`; save the trimmed reason) and `signOff({ itemId, role })`, each re-checking the same guards as `offeredActions` against the freshly read state and returning the same reference when a guard fails (research R-4). — REQ: REQ-10, REQ-11, REQ-14
- [ ] T054 [P] [US4] Create `frontend/src/views/kitchen/CannotConfirmForm.tsx`: inline required "Reason" text field and a "Save" button; on save dispatch `cannotConfirm` (an empty reason dispatches nothing or is rejected by the reducer — either way the status stays unchanged); a "Cancel" closes it. — REQ: REQ-11
- [ ] T055 [US4] In `frontend/src/views/kitchen/AllergyItemRow.tsx` render only the buttons `offeredActions` returns: "Confirm" (dispatch `confirm`), "Cannot confirm" (opens `CannotConfirmForm`), "Sign off" (dispatch `signOff`); show the saved review (role and time), the cannot-confirm reason as `"Reason: <text>"`, and the sign-off (role and time) as text. Run T049–T051 until they pass. — REQ: REQ-10, REQ-11, REQ-14

**Checkpoint**: US1–US4 tests pass; the kitchen display walks an item from Sent to signed off with the right role at each step.

---

## Phase 7: User Story 5 — Server sees the kitchen's answer (Priority: P1)

**Goal**: The tablet shows each sent allergy item's kitchen status within 5 s, with the reason for "Cannot confirm"; "Confirmed" only when confirmed and "OK to serve" only when signed off.

**Independent Test**: With two stores sharing fake storage + channel (or two real tabs), change kitchen statuses on the kitchen side and check the tablet labels.

### Tests for User Story 5 (write first, confirm they fail)

- [ ] T056 [P] [US5] Add a kitchen-status section to `frontend/src/test/labels.test.ts` covering every row of data-model.md §Tablet kitchen status label for a sent allergy item: `Sent` → "Kitchen: Sent" (+ "Not confirmed" when step 4 applies); `Acknowledged` → "Kitchen: Acknowledged" (+ "Not confirmed"); `Confirmed` + no sign-off → "Confirmed" and **not** "OK to serve" (REQ-15 scenario 5); `Confirmed` + sign-off → "Confirmed" + "OK to serve" (scenario 4); `Cannot confirm` → "Cannot confirm" + "Reason: <reason>" (REQ-12 scenario 2). For every status except `Confirmed`, assert "Confirmed" is absent (REQ-13 scenario 3); for every case without `signOff`, assert "OK to serve" is absent. Sent items use `item.allergySnapshot` as the seat allergies. — REQ: REQ-12, REQ-13, REQ-15
- [ ] T057 [P] [US5] Create `frontend/src/test/store.sync.test.ts` (two stores over one `memoryStorage` and one `fakeChannelPair`, contracts/shared-state.md §Guarantees): a `confirm` in store B is visible in store A's snapshot after one notice (REQ-12 scenario 1); a notice with an old revision does not roll A back (REQ-13, REQ-15); `acknowledge` then `confirm` delivered quickly ends on `"Confirmed"` and never shows "OK to serve" before `signOff` (Edge Cases); `reset` in A reaches B; with `channel: null`, an `onExternalChange` callback still re-reads. — REQ: REQ-12, REQ-13, REQ-15 (A-10)
- [ ] T058 [P] [US5] Create `frontend/src/test/us5.status.test.tsx` (RTL): render `/server` (role server) and a second store for the kitchen over the same fake storage/channel; dispatch `acknowledge`, `confirm`, `cannotConfirm`, `signOff` on the kitchen store and assert the tablet order panel shows "Kitchen: Acknowledged", "Confirmed" (no "OK to serve"), "Cannot confirm" + "Reason: …", then "OK to serve". — REQ: REQ-12, REQ-13, REQ-15

### Implementation for User Story 5

- [ ] T059 [US5] In `frontend/src/domain/labels.ts` implement `dishLabels` step 3: when `item` is given and `item.isAllergyOrder === true`, add the kitchen status label from the table (`LABEL.kitchenSent`, `LABEL.kitchenAcknowledged`, `LABEL.confirmed`, `LABEL.cannotConfirm` + `` `${LABEL.reasonPrefix}${reason}` ``), add `LABEL.okToServe` **only** when `item.signOff !== null`, and make step 4 skip "Not confirmed" when the kitchen gave "Cannot confirm" or status is `Confirmed`. `LABEL.confirmed` is produced **only** for `kitchenStatus === "Confirmed"` (REQ-13). Deduplicate "Cannot confirm". — REQ: REQ-12, REQ-13, REQ-15
- [ ] T060 [US5] In `frontend/src/views/server/OrderPanel.tsx` render sent items with `dishLabels(dish, item.allergySnapshot ?? [], item)` and keep showing the seat allergies from the snapshot; draft items keep using the seat's current allergies. Labels are recomputed from the latest snapshot on every render. Run T056–T058 until they pass. — REQ: REQ-12, REQ-13, REQ-15

**Checkpoint**: US1–US5 tests pass; the round trip is complete on both screens.

---

## Phase 8: Cross-Cutting MUST Checks and MUST Gate

**Purpose**: Whole-app checks for SC-002 and SC-006, then the SC-007 gate before any SHOULD work.

- [ ] T061 [P] Create `frontend/src/test/no-safe-wording.test.tsx` (research R-13b, SC-002): render the role menu; the tablet for a tree-nut seat, a no-allergy seat and a preference seat with every dish as menu row and as draft; and for each dish a sent allergy item in every kitchen state (`Sent`, `Acknowledged`, `Confirmed`, `Confirmed` + sign-off, `Cannot confirm`) on the tablet and on the kitchen display as station lead and as expediter (including an open `CannotConfirmForm`). After each render assert `document.body.textContent` does not match `/safe|allergen[\s-]*free/i`. — REQ: REQ-05 (SC-002)
- [ ] T062 [P] Create `frontend/src/test/round-trip.test.tsx` (SC-006): two rendered apps (`/server` as server, `/kitchen` as station lead) sharing one fake storage + channel; follow quickstart.md §3 steps 2–8: record tree nuts / severe / traces yes on Table 12 seat 3 in 4 taps; check menu labels; add walnut salad, steak frites, daily special to seat 3 and green salad to seat 2; send; kitchen shows the ticket on top with labels; acknowledge; confirm steak frites; cannot-confirm daily special with an empty reason (no change) then "Supplier sheet missing"; tablet shows "Confirmed" without "OK to serve" and "Cannot confirm" + reason; switch to expediter, only steak frites offers "Sign off"; sign off; tablet shows "OK to serve". Green salad on seat 2 never shows the seat 3 allergy. — REQ: REQ-01, REQ-02, REQ-03, REQ-04, REQ-05, REQ-06, REQ-07, REQ-08, REQ-09, REQ-10, REQ-11, REQ-12, REQ-13, REQ-14, REQ-15, REQ-16, REQ-17 (SC-006)
- [ ] T063 **MUST gate**: in `frontend/`, run `npm test`, `npm run lint` and `npm run build`; all must pass with the SHOULD `describe.skip` blocks still skipped. Fix failures in the owning task's files. Record the result (date, test count) in the PR description. Do not start Phase 9 before this passes (Constitution IV, SC-007). — REQ: REQ-01–REQ-17 (all MUST; SC-007)
- [ ] T064 Run the manual two-tab walkthrough in quickstart.md §3 with `npm run dev`: time the 4-tap recording (≤ 10 s, SC-001) and every kitchen → tablet status change (≤ 5 s, SC-004); confirm no screen shows "safe" or "allergen-free". Note the timings in the PR description. — REQ: REQ-05, REQ-12, REQ-17 (SC-001, SC-002, SC-004, SC-006)

**Checkpoint**: All MUST requirements pass. SHOULD work may begin.

---

## Phase 9: SHOULD Requirements (only after T063 passes)

**Purpose**: REQ-18…REQ-22, built only because time allows (spec.md, Constitution IV). Each task keeps its user story label.

- [ ] T065 [US1] Enable the `REQ-18` block in `frontend/src/test/allergyOrder.test.ts` (seat 5 with only `preference` → `isAllergyOrder` is `false`, US1 scenario 6) and add an RTL case to `frontend/src/test/us1.allergy-panel.test.tsx`: an item for a preference-only seat shows no "Allergy order", and after "Send order" its ticket is not an allergy ticket (no "ALLERGY – NOT ACKNOWLEDGED", no kitchen status). Fix `frontend/src/domain/allergyOrder.ts` / `frontend/src/domain/actions.ts` only if the tests fail. — REQ: REQ-18
- [ ] T066 [P] [US2] Create `frontend/src/test/us2.should.test.tsx` with a REQ-19 case (US2 scenario 6): seat 3 has draft walnut salad and steak frites with no allergy; recording a tree-nut allergy changes their labels to "Contains Tree nuts" and "Not confirmed" without any other action. Fix `frontend/src/views/server/OrderPanel.tsx` only if it fails (labels are already computed live, research R-10). — REQ: REQ-19
- [ ] T067 [US2] Add REQ-20 (US2 scenario 7) to `frontend/src/test/us2.should.test.tsx` and implement it: in `frontend/src/views/server/DishList.tsx` and `frontend/src/views/server/OrderPanel.tsx`, under a dish that shows "Contains <allergen>", list only `dish.approvedChanges[allergen]` (e.g. walnut salad + tree nuts → "Without walnuts"); show nothing for allergens with no approved change and offer no free-text change. Test that almond tart (no approved changes) offers none and walnut salad offers exactly "Without walnuts". Keep the text out of `/safe|allergen[\s-]*free/i`. — REQ: REQ-20
- [ ] T068 [P] [US3] Create `frontend/src/test/us3.should.test.tsx` with REQ-21 cases using `vi.useFakeTimers()` and the injected clock: boundary 59 s → label does not flash, 60 s and 61 s → flashes (expose flashing as `data-flashing="true"` on the label); a newly seen allergy ticket plays the sound once (spy on the injected `playBeep`), a re-render does not replay it, a normal ticket never plays it and never gets the allergy label (US3 scenarios 5, 6). — REQ: REQ-21
- [ ] T069 [US3] Implement REQ-21: create `frontend/src/config.ts` with `ESCALATION_MS = 60_000` (A-4, changeable); add `isEscalated(ticket, items, nowMs, escalationMs = ESCALATION_MS)` to `frontend/src/domain/kitchen.ts` (`true` when an allergy ticket is not acknowledged and `nowMs − sentAt ≥ escalationMs`); create `frontend/src/views/kitchen/useNow.ts` (re-render every 1000 ms) and `frontend/src/views/kitchen/beep.ts` (one short Web Audio beep, no audio file or network); in `frontend/src/views/kitchen/TicketList.tsx` play the beep once per newly seen allergy ticket id and pass `isEscalated` to `TicketCard.tsx`, which sets `data-flashing` and a CSS flash animation in `frontend/src/index.css`. Run T068 until it passes. — REQ: REQ-21
- [ ] T070 [US3] Add REQ-22 cases to `frontend/src/test/us3.should.test.tsx` (US3 scenario 7): for every role and every kitchen status without `signOff`, the kitchen display offers no control that removes or hides an allergy item, and `removeDraftItem` on a sent item returns the same reference. If a "Clear" control is ever added, it must be offered only when `signOff !== null` (data-model.md §Clearing items); do not add one in this task unless spec.md is changed first (Constitution III). — REQ: REQ-22
- [ ] T071 **SHOULD gate**: run `npm test`, `npm run lint`, `npm run build` in `frontend/` with all tests enabled, including the SC-002 sweep (T061) so new SHOULD text (approved changes, flashing label) is checked. — REQ: REQ-05, REQ-18, REQ-19, REQ-20, REQ-21, REQ-22 (SC-002)

---

## Phase 10: Polish & Cross-Cutting Concerns

- [ ] T072 [P] Update `frontend/README.md` with run, test and two-tab demo instructions pointing to `specs/001-allergy-order-round-trip/quickstart.md`, and how to run one requirement's tests with `npx vitest run -t "REQ-xx"`. — REQ: REQ-01–REQ-17 (Constitution II, V)
- [ ] T073 Deploy to Vercel per quickstart.md §4 (Root Directory `frontend`, Vite preset, Output `dist`): load and reload `<url>/kitchen` and `<url>/server` directly (no 404), and check the Network tab shows only the app's own static files (Constitution IV). — REQ: REQ-12 (A-10)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: none.
- **Foundational (Phase 2)**: after Setup. BLOCKS every story.
- **US1 → US2 → US3 → US4 → US5 (Phases 3–7)**: each needs only Phase 2 for its tests (fixtures in T021 build state directly). In practice they share files, so the recommended order is the plan's: US1 → US2 → US3 → US4 → US5.
- **Phase 8 (MUST checks + gate)**: after all five stories.
- **Phase 9 (SHOULD)**: only after T063 passes (Constitution IV, SC-007).
- **Phase 10 (Polish)**: after Phase 8; T073 after Phase 9 if SHOULD work is shipped.

### User Story Dependencies (shared files)

| Story | Needs from earlier stories | Shared files it extends |
|---|---|---|
| US1 | — | `actions.ts`, `actions.test.ts` (creates sections) |
| US2 | US1 views `DishList.tsx`, `OrderPanel.tsx` exist | `labels.ts`, `labels.test.ts` |
| US3 | US1 `OrderPanel.tsx` (for "Send order") | `actions.ts`, `labels.ts`, `actions.test.ts`; creates `kitchen.ts`, `kitchen.test.ts` |
| US4 | US3 `AllergyItemRow.tsx`, `kitchen.ts` | `kitchen.ts`, `actions.ts`, their tests |
| US5 | US2 `dishLabels`, US3 `sendOrder` shape | `labels.ts`, `OrderPanel.tsx` |

Domain tests for US3, US4 and US5 use T021 fixtures, so they can be written and run before the earlier stories' views exist.

### Within Each User Story

- Tests first; confirm they fail.
- Domain (pure) → reducers → views → route wiring.
- Story checkpoint passes before the next story.

### Parallel Opportunities

- Setup: T003, T004 in parallel (after T001–T002 for T003's use).
- Foundational: T006, T007, T008, T009 after T005; T012, T016, T017 in parallel with them.
- Each story's test tasks are [P] with each other (different files).
- US3: T043 (`labels.ts`), T044 (`kitchen.ts`), T046 (row components) in parallel after T042.
- Phase 8: T061 and T062 in parallel.
- Phase 9: T066 and T068 in parallel (different files).

---

## Parallel Example: User Story 3

```bash
# Tests first (different files):
Task: "T039 [US3] kitchen.test.ts — kitchenItemText, sortTickets, acknowledge offer (REQ-06, REQ-07, REQ-08, REQ-09)"
Task: "T040 [US3] actions.test.ts — sendOrder / acknowledge section (REQ-03, REQ-06, REQ-09)"
Task: "T041 [US3] us3.kitchen.test.tsx — RTL kitchen display (REQ-06, REQ-07, REQ-08, REQ-09)"

# After T042 (reducers), in parallel:
Task: "T043 [US3] labels.ts — crossContactLabel, kitchenItemText (REQ-06, REQ-07)"
Task: "T044 [US3] kitchen.ts — sortTickets, offeredActions acknowledge (REQ-08, REQ-09)"
Task: "T046 [US3] AllergyItemRow.tsx, NormalItemRow.tsx (REQ-06, REQ-07)"
```

## Parallel Example: User Story 1

```bash
Task: "T023 [US1] allergyOrder.test.ts (REQ-03)"
Task: "T024 [US1] actions.test.ts recordAllergy/addItem (REQ-01, REQ-02, REQ-03)"
Task: "T025 [US1] us1.allergy-panel.test.tsx (REQ-01, REQ-02, REQ-03)"
Task: "T026 [US1] us1.tap-count.test.tsx (REQ-17)"
# then
Task: "T027 [US1] allergyOrder.ts (REQ-03)"
Task: "T029 [US1] TablePicker.tsx + SeatStrip.tsx (REQ-02)"
```

---

## Implementation Strategy

### MVP First (User Story 1)

1. Phase 1 Setup → Phase 2 Foundational.
2. Phase 3 US1 → **STOP and VALIDATE**: the tablet records allergies on the right seat in 4 taps.
3. Note: US1 alone is not a usable allergy round trip. The smallest demo that serves G-2 end to end is US1–US5 plus Phase 8 (SC-006).

### Incremental Delivery

1. Setup + Foundational → shell with role menu and shared store.
2. US1 → allergy recording (REQ-01, REQ-02, REQ-03, REQ-17).
3. US2 → dish labels (REQ-04, REQ-05, REQ-16).
4. US3 → kitchen ticket + acknowledge (REQ-06–REQ-09).
5. US4 → review + sign-off (REQ-10, REQ-11, REQ-14).
6. US5 → tablet status (REQ-12, REQ-13, REQ-15).
7. Phase 8 → SC-002 sweep, SC-006 round trip, **MUST gate** (SC-007).
8. Phase 9 → SHOULD (REQ-18–REQ-22) if time allows.

---

## Notes

- Every task names its REQ IDs; carry them into commit messages and PR titles (Constitution II).
- Code that disagrees with spec.md is a defect; change the spec first, then the plan, then the code (Constitution III).
- [P] = different files, no dependency on an incomplete task.
- Commit after each task or logical group.

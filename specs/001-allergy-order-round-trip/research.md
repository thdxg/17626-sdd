# Research: Allergy Order Round Trip

Phase 0 output for [plan.md](./plan.md). The Technical Context had no open NEEDS CLARIFICATION
items, because the user gave the stack. This file records the design decisions that follow from
that stack and from the spec. Library versions and APIs are from current knowledge. Library docs
(Context7) could not be checked during planning, so the setup task must confirm the versions
noted in R-6 and R-7 when it installs them.

---

## R-1: Sharing state between the tablet tab and the kitchen tab (A-10, REQ-12)

- **Decision**: Keep one JSON document in `localStorage` as the source of truth. After each write,
  post `{type: "state-changed", revision}` on a `BroadcastChannel` named `allergy-round-trip`.
  Receiving tabs re-read `localStorage`. Also listen to the `storage` event as a fallback, and
  re-read on `visibilitychange` when a tab becomes visible.
- **Rationale**: `localStorage` survives reloads and is readable synchronously, so each tab
  always renders a full, consistent snapshot. BroadcastChannel delivers the notice in
  milliseconds, far under the 5 s limit of REQ-12. Sending only a notice (not the state) means
  there is a single source of truth and no merge logic. The `storage` event fires natively in
  other same-origin tabs, so a missing BroadcastChannel still leaves updates working.
- **Alternatives considered**:
  - *BroadcastChannel only (state in memory)*: a reload loses everything, and a newly opened tab
    has no state.
  - *Polling `localStorage` on a timer*: works, but uses a timer in every tab, and the delay
    depends on the interval.
  - *SharedWorker / IndexedDB*: more machinery than two tabs need.
  - *Any backend or hosted realtime service*: forbidden (Constitution IV).

## R-2: Routing without a router library

- **Decision**: No router dependency. A `usePath()` hook reads `window.location.pathname`,
  listens to `popstate`, and exposes `navigate(path)` using `history.pushState`. `App.tsx`
  switches on three paths: `/`, `/server` and `/kitchen`. Any other path shows the role menu.
- **Rationale**: Three fixed paths with no parameters or nesting. The user asked for a router
  only if needed, and it is not needed.
- **Alternatives considered**: `react-router` (one dependency for three static paths); hash
  routes (`/#/server`) would avoid the Vercel rewrite but do not match the requested `/server`
  and `/kitchen` paths.

## R-3: Store shape and React binding

- **Decision**: `createStore({ storage, channel, now })` returns `getSnapshot`, `subscribe` and
  `dispatch(action)`. `dispatch` re-reads the latest document from storage, applies a **pure**
  reducer from `domain/actions.ts`, increments `revision`, writes the document back and posts the
  notice. React reads the store through `useSyncExternalStore`. Dependencies are injected so
  tests use in-memory fakes.
- **Rationale**: Reading again just before each write keeps changes from the other tab.
  `useSyncExternalStore` is React's built-in API for external stores, so no state library is
  needed. Pure reducers carry all the REQ rules, which keeps them testable without the DOM.
- **Alternatives considered**: Context + `useReducer` (state lives in one tab, so it would need
  syncing anyway); Zustand/Redux (extra dependency for one small document).

## R-4: Concurrency between two tabs

- **Decision**: Each dispatch is a synchronous read → reduce → write in one tab, so the last
  write wins. Reducers use guards (e.g. "Confirm" only from Acknowledged) against the freshly read
  state, so a stale UI cannot push an item backwards or skip a step.
- **Rationale**: A-9 says there is one tablet and one kitchen display. They write different
  fields (seat allergies and order items vs. kitchen status), and `localStorage` access is
  synchronous within a tab. The guards also protect REQ-13 and REQ-15 if a button was rendered
  from an old snapshot.
- **Alternatives considered**: Web Locks API or per-field merge: not needed at this scale.

## R-5: Role per tab (A-3, A-9)

- **Decision**: The role (server, station lead, expediter) is kept in `sessionStorage` for each
  tab, not in the shared document. The role menu at `/` sets it and navigates to the route: server
  → `/server`, station lead and expediter → `/kitchen`. The kitchen header has a role switch
  (station lead ↔ expediter) so one kitchen tab can walk through US4.
- **Rationale**: Two tabs need different roles at the same time. Saving the role in shared state
  would make one tab's choice change the other.
- **Alternatives considered**: A role in the URL query (`/kitchen?role=expediter`): this works
  too, but it is easy to share a link with the wrong role. A role in shared state: rejected for
  the reason above.

## R-6: Test tooling

- **Decision**: Add these devDependencies: `vitest`, `jsdom`, `@testing-library/react`,
  `@testing-library/dom` and `@testing-library/user-event`. Configure Vitest in `vite.config.ts`
  (`test: { environment: "jsdom", setupFiles: "src/test/setup.ts" }`) and add an
  `"test": "vitest run"` script. Skip `@testing-library/jest-dom`; plain `expect` checks on
  `textContent` and `queryByRole` are enough.
- **Version check (setup task)**: use the Vitest major that lists Vite 8 as a supported peer, and
  the Testing Library versions that support React 19. Pin the exact versions in `package.json`
  after `npm install`.
- **Rationale**: The user asked for Vitest + RTL. `user-event` gives realistic taps for the
  REQ-17 tap count. jsdom does not provide `BroadcastChannel`, so the store gets an injected
  channel and tests use an in-memory fake. Tests do not rely on the environment providing one.
- **Alternatives considered**: Playwright for real two-tab tests: valuable but adds a browser
  download. The two-tab check is a manual quickstart step instead (quickstart.md §3).

## R-7: Deployment to Vercel as static files

- **Decision**: Vercel project with Root Directory `frontend`, the Vite framework preset, build
  `npm run build`, and output `dist`. Add `frontend/vercel.json` with
  `{"rewrites": [{"source": "/(.*)", "destination": "/index.html"}]}` so a reload on `/server` or
  `/kitchen` serves the app. Static files are matched before rewrites.
- **Rationale**: Without the rewrite, a direct load of `/kitchen` returns 404 on a static host.
- **Version check (setup task)**: confirm that the `vercel.json` rewrite syntax is current when
  you add it.

## R-8: Mock dish data (A-1, A-2)

- **Decision**: `src/data/dishes.ts` exports 8 read-only dish records typed by `DishRecord`
  (data-model.md). The set covers what A-2 asks for:

  | id | Name | Allergens | Info | Shared equipment | Chef-approved changes |
  |---|---|---|---|---|---|
  | `walnut-salad` | Pear & walnut salad | tree nuts, mustard | complete | — | tree nuts → "Without walnuts" |
  | `almond-tart` | Almond tart | tree nuts, gluten, eggs, milk | complete | — | — |
  | `fish-chips` | Fish & chips | fish, gluten | complete | fryer | — |
  | `steak-frites` | Steak frites | — | complete | fryer | — |
  | `risotto` | Mushroom risotto | milk, celery | complete | — | milk → "Olive oil instead of butter and parmesan" |
  | `roast-chicken` | Roast chicken | celery, sulphites | complete | base (shared stock) | — |
  | `green-salad` | Green salad | — | complete | utensil (shared tongs) | — |
  | `daily-special` | Daily special | — | **missing** | — | — |

- **Allergen list** (`src/data/allergens.ts`): the 14 EU-declared allergens: gluten, crustaceans,
  eggs, fish, peanuts, soybeans, milk, tree nuts, celery, mustard, sesame, sulphites, lupin,
  molluscs. They are shown as display names ("Tree nuts" etc.) and have fixed ids.
- **Rationale**: Each dish is there to test something. Tree nuts → REQ-04. Fryer → REQ-07.
  Chef-approved change → REQ-20. Missing info → REQ-10 and REQ-16. Steak frites has no listed
  allergen but uses the fryer, which tests the edge case where a dish has no conflict but has
  cross-contact. No dish name or description contains the word "safe".

## R-9: Where "Not confirmed" is shown (REQ-05 interpretation)

- **Decision**: On the tablet, for a seat with an allergy, every dish row and every order item
  that is not "Confirmed" (REQ-13) and that shows neither "Contains" nor "Cannot confirm" gets
  "Not confirmed". For a seat with no allergy, "Not confirmed" is not shown (US2 scenario 8).
- **Rationale**: The spec was clarified (Clarifications, 2026-11-16): REQ-05 now starts with
  "WHEN the server views a dish for a seat with an allergy". The kitchen never reviews dishes for
  seats with no allergy, so the label would never change there and Kayla could stop reading it
  (C-1).
- **Alternatives considered**: Showing it on every seat (the first version of this decision,
  based on the original REQ-05 wording). Replaced when the spec changed.

## R-10: Allergy snapshot when the order is sent

- **Decision**: When "Send order" runs, each sent item copies the seat's allergies at that moment
  (`allergySnapshot`) and computes `isAllergyOrder` once. The kitchen display shows the snapshot
  (REQ-06).
- **Rationale**: Changes after sending are out of scope. A snapshot means the kitchen sees what
  was sent and cannot be changed silently afterwards. Allergies recorded later still update
  unsent items, because labels are computed live (REQ-19 behaviour falls out for free, but it is
  tested only in the SHOULD phase).

## R-11: Meeting the 4-tap limit (REQ-17, SC-001)

- **Decision**: The seat view always shows an inline allergy panel; no button opens it. It has
  three chip rows: allergens (14 chips), severity (4 chips), traces (Yes / No). Below them is a
  "Save allergy" button that is enabled once at least one allergen, a severity and a traces value
  are chosen. The note field is optional and collapsed under the chips. Severity and traces have
  **no defaults**. Recording one allergen takes exactly 4 taps: allergen, severity, traces, Save.
- **Rationale**: A button that opens the panel would add a 5th tap, and a separate screen is not
  allowed. No default severity means the system never guesses a severity (Constitution I).
- **Test**: an RTL test counts `user.click` calls from the seat view to the saved allergy and
  asserts the count is ≤ 4 and that no `type` call was made. Boundary rows 3/4/5 in the spec are
  covered by asserting the exact count is 4 (≤ 4 passes) and by a guard test that fails if the
  panel is hidden behind an extra control.

## R-12: Timing, clock, sound and flash (REQ-12, REQ-21)

- **Decision**: All timestamps are ISO strings from an injected `now()`. The kitchen view
  re-renders once per second through a `useNow(1000)` hook. A ticket flashes when it is not
  acknowledged and `now − sentAt ≥ ESCALATION_MS` (60 000, a constant in `config.ts`, A-4). The
  sound is one short Web Audio beep played once per newly seen allergy ticket id. (Both are
  SHOULD and are built last.)
- **Rationale**: An injected clock makes the 59/60/61 s and 4/5/6 s boundary tests deterministic
  with `vi.useFakeTimers`. Web Audio needs no audio file and no network. The click on the role menu
  unlocks audio playback in the kitchen tab.
- **REQ-12 test**: the store test changes the status in store A and asserts that store B's
  snapshot shows it after the fake channel delivers the notice. The 5 s limit is checked
  manually in two real tabs (quickstart.md §3).

## R-13: Enforcing "no safe wording" (REQ-05, SC-002, Constitution I)

- **Decision**: (a) All status text comes from the closed set in contracts/ui.md, defined as
  constants in `domain/labels.ts`. (b) A sweep test renders the role menu, the tablet and the
  kitchen display for every dish in every kitchen status, as every role, and asserts that
  `document.body.textContent` does not match `/safe|allergen[\s-]*free/i`. (c) A data test
  checks the same regex against every string in `dishes.ts` and `allergens.ts`.
- **Rationale**: The rule applies to every screen, so the check has to look at rendered output,
  not only at the label functions.

## R-14: Persisted document versioning and reset (A-10)

- **Decision**: Key `allergy-round-trip/state`. The document has `schemaVersion: 1` in V1 and
  `schemaVersion: 2` in V2 (new `pickedChange` field, R-16). If the
  document is missing, cannot be parsed, or has another version, the store writes the seed.
  "Reset demo data" (role menu and both screen headers) writes the seed with a new `revision` and
  broadcasts, so all tabs reset together.
- **Rationale**: Changes to the data shape during the sprint will not break a tab that holds an
  old document; it simply reseeds.

---

## V2 decisions (2026-11-17)

These follow the V2 spec changes (spec.md §Clarifications, Session 2026-11-17). Where the spec
leaves a detail open, the decision below picks the stricter or simpler reading.

## R-15: No "Confirm" for a dish that lists the seat's allergen (REQ-10, C-12)

- **Decision**: `offeredActions` leaves out `confirm` when any allergen in the item's
  `allergySnapshot` is in `dish.allergens`. Every allergy in the snapshot counts, whatever its
  severity. The `confirm` reducer already checks `offeredActions`, so the same rule guards it (R-4).
  "Cannot confirm" is still offered, so the item can end as "Cannot confirm" with a reason.
- **Rationale**: The snapshot is what the kitchen sees (R-10), so the rule uses the same data.
  Counting a preference-severity allergen too is the stricter reading, and it can only matter on a
  seat that is already an allergy order because of another allergy (Constitution I).
- **Alternatives considered**: Using the seat's current allergies (can differ from what was sent);
  allowing "Confirm" when a change was picked (rejected by the spec, C-12).

## R-16: Picking a chef-approved change (REQ-20)

- **Decision**: `OrderItem` gets `pickedChange: string | null`. The server picks on a **draft**
  order item: under an item that shows "Contains <allergen>", each offered change
  (`approvedChangesFor(dish, current seat allergies)`) is a toggle button named by the change text
  (`aria-pressed`). Tapping it picks it; tapping the picked one again clears it; picking another
  replaces it (one change per item). The menu rows keep listing the offered changes as text (V1).
  The item then shows "Chef-approved change: <text>" on the tablet. At "Send order" the change is
  kept only if it is still offered for the seat's allergies at that moment; otherwise it is set to
  `null`. The kitchen display shows the same line on the allergy item. Picking a change does not
  change any label: the item still shows "Contains <allergen>", and the kitchen still gets no
  "Confirm" (R-15).
- **Rationale**: The spec says the order item "can hold one chef-approved change picked by the
  server" and that the kitchen sees it when the order is sent, so the pick belongs to the draft
  item. Dropping a change that no longer applies keeps the kitchen from seeing a change for an
  allergy that was removed (REQ-19). Showing the pick on the tablet too lets the server check what
  was sent; it is not required by the spec but adds no new claim.
- **Alternatives considered**: Picking on the menu row before "Add" (the pick would have to move
  to the item anyway, and adds a step); a free-text change (REQ-20 allows only chef-approved ones).
- **Tap count**: REQ-17 counts only recording an allergy, so the picker does not affect it.

## R-17: Traces on the kitchen item (REQ-06)

- **Decision**: `kitchenItemText` adds one line after the severity: "Traces: yes" if any allergy
  in the snapshot has `traces: true`, otherwise "Traces: no".
- **Rationale**: The tablet already uses the "Traces: yes" / "Traces: no" wording (contracts/ui.md),
  and US3 scenario 8 expects "Traces: yes" as text. With several allergies on one seat, "yes" wins
  because the kitchen should take the stricter care (Constitution I).
- **Alternatives considered**: One traces line per allergy (longer, and the allergens are already
  merged into one list on the item).

## R-18: Ticket order after "Acknowledge" (REQ-08, C-3)

- **Decision**: `sortTickets` ranks each ticket, then sorts by rank, then `sentAt`, then the
  original index (stable):
  - **0**: an allergy ticket that is not acknowledged (label "ALLERGY – NOT ACKNOWLEDGED", as V1);
  - **1**: an acknowledged allergy ticket with an **open** allergy item, meaning an allergy item
    with `signOff = null` whose status is not "Cannot confirm";
  - **2**: every other ticket (normal tickets, and allergy tickets with no open item).
  Rank 1 gets no new label; the spec does not name one, and the status of each item is already
  shown as text.
- **Rationale**: This is the second sentence of REQ-08 and US3 scenario 9. "Above all normal
  tickets" is met because normal tickets are always rank 2. Keeping unacknowledged tickets above
  acknowledged ones keeps the V1 rule ("at the top") true.
- **Alternatives considered**: Keeping every allergy ticket above normal tickets forever (a done
  ticket would block the view, and REQ-22 never lets it be cleared).

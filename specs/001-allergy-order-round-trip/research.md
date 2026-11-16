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

- **Decision**: On the tablet, every dish row and every order item that is not "Confirmed"
  (REQ-13) and that shows neither "Contains" nor "Cannot confirm" gets "Not confirmed". This
  applies to every seat, including seats with no allergy.
- **Rationale**: REQ-05 is written without a seat condition. Showing "Not confirmed" more often
  can never mislead (Constitution I), while hiding it could look like an all-clear.
- **Alternatives considered**: Showing it only on seats with an allergy reads more cleanly but
  depends on a condition the spec does not state.

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

- **Decision**: Key `allergy-round-trip/state`. The document has `schemaVersion: 1`. If the
  document is missing, cannot be parsed, or has another version, the store writes the seed.
  "Reset demo data" (role menu and both screen headers) writes the seed with a new `revision` and
  broadcasts, so all tabs reset together.
- **Rationale**: Changes to the data shape during the sprint will not break a tab that holds an
  old document; it simply reseeds.

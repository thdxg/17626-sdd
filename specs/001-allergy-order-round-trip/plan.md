# Implementation Plan: Allergy Order Round Trip

**Branch**: `plan-and-tasks` (V1), `v2-plan` (V2) (feature dir `001-allergy-order-round-trip`) | **Date**: 2026-11-16, V2 update 2026-11-17 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/001-allergy-order-round-trip/spec.md`

## Summary

Build one allergy order round trip (table → tablet → kitchen → tablet → pass) as a static
single-page app in the existing `frontend/` Vite + React 19 + TypeScript project. Three screens
share one state: a role menu (`/`, A-3), the server tablet (`/server`) and the kitchen display
(`/kitchen`). Mock dish data lives in TypeScript files (A-1, A-2). The two screens run as two tabs
of one browser and share state through `localStorage`, with `BroadcastChannel` sending change
notices (A-10). A "Reset demo data" control restores the seed. There is no backend, login or
external service (Constitution IV).

The safety rules live in pure, unit-tested domain functions: dish labels (REQ-04, REQ-05,
REQ-16), allergy-order rule (REQ-03, REQ-18), kitchen state transitions with guards (REQ-09,
REQ-10, REQ-11, REQ-14), and tablet status labels (REQ-12, REQ-13, REQ-15). The React views only
render what these functions return, so the forbidden words "safe" and "allergen-free" cannot
come from view code (Constitution I, REQ-05).

## V2 update (2026-11-17)

The spec was revised after the V1 evaluation (spec.md §Clarifications, Session 2026-11-17). The
stack, structure and store do not change. Four requirements change, and each maps to one small
design change:

| REQ | Spec change | Design change | Research |
|---|---|---|---|
| REQ-06 | The kitchen item also shows whether traces matter | `kitchenItemText` adds a "Traces: yes" or "Traces: no" line | R-17 |
| REQ-10 | No "Confirm" when the dish lists one of the seat's allergens | `offeredActions` (and so the `confirm` reducer guard) also checks the allergy snapshot against `dish.allergens` | R-15 |
| REQ-20 | Now MUST: the server picks one chef-approved change, and the kitchen sees it | New `pickedChange` field on `OrderItem`, a `pickChange` action, toggle buttons on draft order items, and a "Chef-approved change: <text>" line on both screens. "Confirm" is still not offered (C-12). | R-16 |
| REQ-08 | An acknowledged allergy ticket stays above normal tickets until every allergy item is signed off or marked "Cannot confirm" | `sortTickets` uses three ranks instead of two | R-18 |

`pickedChange` changes the stored document, so `schemaVersion` goes from 1 to 2 and a tab that
holds a V1 document reseeds (R-14). The V2 tasks are Phase 11 of tasks.md. All V1 tests stay,
except V1 tests that expected the old REQ-08 order or REQ-20 as text only; those are updated to
the V2 wording.

## Technical Context

**Language/Version**: TypeScript ~7.0 (already in `frontend/package.json`), ES2023 target, JSX via `react-jsx`

**Primary Dependencies**: React 19 + React DOM 19 (existing), Vite 8 + `@vitejs/plugin-react` (existing). **No router**: a ~30-line `usePath()` hook over `window.location` + `history.pushState` serves three fixed paths (research R-2).

**Storage**: Browser `localStorage`, one versioned JSON document (contracts/shared-state.md). Per-tab role in `sessionStorage`. No server.

**Testing**: Vitest + jsdom + `@testing-library/react` + `@testing-library/user-event` (+ its `@testing-library/dom` peer). No `jest-dom`; plain assertions keep dependencies minimal (research R-6).

**Target Platform**: Current desktop/tablet browsers with `BroadcastChannel` (Chrome, Edge, Firefox, Safari 15.4+). Deployed to Vercel as static files from `frontend/dist`, with a rewrite to `index.html` for `/server` and `/kitchen` (research R-7).

**Project Type**: Static single-page web app (frontend only).

**Performance Goals**: Kitchen status change visible on the tablet within 5 s (REQ-12, SC-004); expected to be well under 1 s because updates are event-driven. One allergen recorded in ≤ 4 taps and ≤ 10 s (REQ-17, SC-001).

**Constraints**: No "safe" / "allergen-free" text on any screen (REQ-05, Constitution I); mock data only, no login, no external calls (Constitution IV); MUST requirements before any SHOULD (Constitution IV, SC-007); every task names REQ IDs (Constitution II).

**Scale/Scope**: One tablet tab + one kitchen tab (A-9); 3 tables, ≤ 6 seats each; ~8 mock dishes (A-2); a handful of tickets per demo.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Pre-research | Post-design |
|---|---|---|---|
| I. Safety Over Speed | No "safe"/"allergen-free" wording; unverifiable → "Not confirmed"/"Cannot confirm" | PASS: labels come only from `domain/labels.ts`; a render-every-state test (SC-002) scans all screens | PASS: label set is closed (contracts/ui.md §Allowed status text); `allergenInfo ≠ complete` → "Cannot confirm" and no "Confirm" button (data-model §Rules) |
| II. Traceability | Every task/commit names REQ IDs | PASS: plan, contracts and test names carry REQ IDs; `/speckit-tasks` must keep them | PASS: each contract row and each test file is tagged with REQ IDs |
| III. Spec First | spec.md is the source of truth | PASS: no requirement changed; A-10 was added to the spec before this plan | PASS: design decisions that read the spec (R-9…R-11) are recorded as interpretations, not changes |
| IV. Simple Prototype | Mock data, no login, no external services; MUST before SHOULD | PASS: TS mock data, role menu, localStorage + BroadcastChannel; no backend | PASS: SHOULD items (REQ-18…22) are a separate final phase; sound uses Web Audio, no asset fetch |
| V. Testable | Acceptance examples per REQ; done = examples pass | PASS: every acceptance scenario maps to a Vitest test (quickstart.md §Scenario map) | PASS: boundary examples (4/5 taps, 4/5/6 s, 59/60/61 s) use an injected clock and counted clicks |

No violations. Complexity Tracking is empty.

**V2 re-check (2026-11-17)**: PASS. REQ-10 makes "Confirm" stricter and a picked change never
lifts it (I, C-12). The new text ("Traces: yes/no", "Chef-approved change: <text>") is added to
the closed set in contracts/ui.md and covered by the SC-002 sweep (I). Every Phase 11 task names
REQ-06, REQ-08, REQ-10 or REQ-20 (II). The plan changed only after the spec (III). No new
dependency or service (IV). Every new acceptance scenario (US2 9, US3 8–9, US4 8, SC-008) maps to
a test (V, quickstart.md §2).

## Project Structure

### Documentation (this feature)

```text
specs/001-allergy-order-round-trip/
├── plan.md              # This file
├── research.md          # Phase 0 decisions
├── data-model.md        # Phase 1 entities, rules, state machine
├── quickstart.md        # Phase 1 run + validation guide
├── contracts/
│   ├── shared-state.md  # localStorage document + BroadcastChannel message
│   ├── domain-api.md    # Pure functions and store actions (TypeScript signatures)
│   └── ui.md            # Routes, role menu, visible text, actions per role/status
├── checklists/          # Existing
└── tasks.md             # Phase 2 (/speckit-tasks), not created here
```

### Source Code (repository root)

```text
frontend/
├── index.html
├── vercel.json                  # SPA rewrite (R-7)
├── vite.config.ts               # + Vitest `test` block (jsdom)
├── package.json                 # + test script, test devDependencies
└── src/
    ├── main.tsx
    ├── App.tsx                  # Path switch: / → RoleMenu, /server, /kitchen
    ├── routing/usePath.ts       # pushState + popstate hook (no router dependency)
    ├── data/
    │   ├── allergens.ts         # Fixed allergen list (REQ-01)
    │   ├── dishes.ts            # ~8 mock dish records (A-1, A-2)
    │   └── seed.ts              # Tables, seats, seeded normal tickets
    ├── domain/
    │   ├── types.ts             # Entities from data-model.md
    │   ├── allergyOrder.ts      # REQ-03, REQ-18
    │   ├── labels.ts            # REQ-04, REQ-05, REQ-16; tablet status REQ-12/13/15
    │   ├── kitchen.ts           # Transitions + offered actions: REQ-09/10/11/14, sort REQ-08
    │   └── actions.ts           # Pure reducers: recordAllergy, addItem, sendOrder, …
    ├── store/
    │   ├── store.ts             # createStore({storage, channel, now}) (A-10)
    │   └── useAppState.ts       # useSyncExternalStore hook
    ├── views/
    │   ├── RoleMenu.tsx         # A-3 + Reset demo data
    │   ├── server/              # TablePicker, SeatView, AllergyPanel, DishList, OrderStatus
    │   └── kitchen/             # TicketList, TicketCard, AllergyItemRow, CannotConfirmForm
    └── test/
        ├── setup.ts
        ├── fakes.ts             # In-memory storage, channel, clock
        └── *.test.ts(x)         # Named by REQ IDs (quickstart.md)
```

**Structure Decision**: Single frontend project in the existing `frontend/` directory; no
backend directory. Rules are kept in `domain/` (pure TS, no React) so tests can cover every REQ
without rendering, and views stay thin. Tests live next to the code under `src/test/` so
`tsconfig.app.json`'s `include: ["src"]` already covers them.

## Implementation Order (input for /speckit-tasks)

1. **Setup**: test tooling, `vercel.json`, path switch, store with fakes. (A-10, Constitution IV)
2. **Foundation**: types, mock data (A-2), domain functions + unit tests.
3. **US1** REQ-01, REQ-02, REQ-03, REQ-17 → **US2** REQ-04, REQ-05, REQ-16 → **US3** REQ-06–09 →
   **US4** REQ-10, REQ-11, REQ-14 → **US5** REQ-12, REQ-13, REQ-15.
4. **Cross-cutting MUST checks**: SC-002 forbidden-word sweep, SC-006 full round-trip test.
5. **Gate**: all MUST acceptance tests green (SC-007).
6. **SHOULD** (only after 5): REQ-18, REQ-19, REQ-20, REQ-21, REQ-22.
7. **V2** (after the V1 tag): schema bump → tests for REQ-06, REQ-08, REQ-10, REQ-20 → domain
   changes → tablet change picker → V2 gate → manual walkthrough and deploy.

## Complexity Tracking

No Constitution Check violations; nothing to justify.

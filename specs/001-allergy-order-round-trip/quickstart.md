# Quickstart: Allergy Order Round Trip

This guide shows how to run and check the feature. Design references: [plan.md](./plan.md),
[data-model.md](./data-model.md), [contracts/](./contracts/).

## 1. Prerequisites and setup

- Node.js version as used by the existing `frontend/` scaffold (Vite 8 needs a current LTS).
- No accounts, keys or services are needed (Constitution IV).

```sh
cd frontend
npm install
```

## 2. Automated checks

```sh
npm test            # vitest run: all acceptance tests
npm run lint        # oxlint
npm run build       # tsc -b && vite build → dist/
```

Expected: every test passes. Test names start with the REQ IDs they cover, so
`npx vitest run -t "REQ-10"` runs the tests for one requirement.

### Scenario map (spec acceptance scenario → test)

| Story | Scenarios | REQ | Test file (`frontend/src/test/`) | Kind |
|---|---|---|---|---|
| US1 | 1, 2 | REQ-01 | `us1.allergy-panel.test.tsx` | RTL |
| US1 | 3 | REQ-02 | `us1.allergy-panel.test.tsx`, `actions.test.ts` | RTL + unit |
| US1 | 4 | REQ-03 | `allergyOrder.test.ts` | unit |
| US1 | 5 + boundary 3/4/5 taps | REQ-17 | `us1.tap-count.test.tsx` | RTL (counted `user.click`, zero `user.type`) |
| US1 | 6 | REQ-18 (SHOULD) | `allergyOrder.test.ts` (`describe.skip` until MUST gate) | unit |
| US2 | 1, 2 | REQ-04 | `labels.test.ts` | unit |
| US2 | 3 | REQ-05 | `labels.test.ts` | unit |
| US2 | 4 | REQ-05 | `no-safe-wording.test.tsx` (SC-002 sweep) | RTL |
| US2 | 5 | REQ-16 | `labels.test.ts` | unit |
| US2 | 6, 7 | REQ-19, REQ-20 (SHOULD) | `us2.should.test.tsx` | RTL |
| US3 | 1 | REQ-06 | `kitchen.test.ts`, `us3.kitchen.test.tsx` | unit + RTL |
| US3 | 2 | REQ-07 | `kitchen.test.ts` | unit |
| US3 | 3 | REQ-08 | `kitchen.test.ts` (`sortTickets`), `us3.kitchen.test.tsx` | unit + RTL |
| US3 | 4 | REQ-09 | `actions.test.ts`, `us3.kitchen.test.tsx` | unit + RTL |
| US3 | 5, 6 + boundary 59/60/61 s | REQ-21 (SHOULD) | `us3.should.test.tsx` (fake timers) | RTL |
| US3 | 7 | REQ-22 (SHOULD) | `us3.should.test.tsx` | RTL |
| US4 | 1, 2, 3 | REQ-10 | `kitchen.test.ts` (`offeredActions`), `actions.test.ts` | unit |
| US4 | 4, 5 | REQ-11 | `actions.test.ts`, `us4.review.test.tsx` | unit + RTL |
| US4 | 6, 7 | REQ-14 | `kitchen.test.ts`, `actions.test.ts` | unit |
| US5 | 1, 2 + boundary 4/5/6 s | REQ-12 | `store.sync.test.ts` (two stores, fake channel); timing manual §3 | unit + manual |
| US5 | 3 | REQ-13 | `labels.test.ts` (every status) | unit |
| US5 | 4, 5 | REQ-15 | `labels.test.ts` | unit |
| — | SC-006 full round trip | all MUST | `round-trip.test.tsx` (two rendered apps sharing fake storage + channel) | RTL |

SC-007 gate: all non-SHOULD tests pass before the SHOULD test files are enabled.

## 3. Manual two-tab walkthrough (SC-001, SC-004, SC-006)

```sh
npm run dev         # open the printed URL
```

1. **Tab A** → `/` → "Reset demo data" → "Server". **Tab B** (same browser) → `/` →
   "Station lead". Put the tabs side by side.
2. Tab A: "Table 12" → "Seat 3". Start a stopwatch, then tap **Tree nuts → severe allergy →
   Traces: yes → Save allergy**. Expected: 4 taps, no typing, < 10 s; the allergy is shown on
   seat 3 only (REQ-17, REQ-02, SC-001).
3. Tab A menu for seat 3: "Pear & walnut salad" shows "Contains Tree nuts"; "Steak frites" shows
   "Not confirmed"; "Daily special" shows "Cannot confirm" (REQ-04, REQ-05, REQ-16). Add the
   salad, steak frites and the daily special to seat 3, and add "Green salad" to seat 2.
   "Send order".
4. Tab B: the Table 12 ticket is at the top with "ALLERGY – NOT ACKNOWLEDGED", above the seeded
   normal tickets. Items show "Tree nuts", "severe allergy" and "seat 3"; steak frites shows
   "Cross-contact: fryer" (REQ-06, REQ-07, REQ-08). Tap "Acknowledge" (REQ-09).
5. **Timing check (REQ-12, SC-004)**: watch tab A while tapping in tab B. Every change below
   must appear in tab A within 5 s (expected: almost at once).
6. Tab B: steak frites → "Confirm" (REQ-10). Daily special: no "Confirm" button; "Cannot
   confirm" → reason "Supplier sheet missing" → "Save" (REQ-10, REQ-11). Try "Save" with an
   empty reason first: nothing changes (REQ-11).
7. Tab A: steak frites shows "Confirmed" but not "OK to serve"; the daily special shows "Cannot
   confirm" and "Reason: Supplier sheet missing" (REQ-12, REQ-13, REQ-15).
8. Tab B: switch the role to "Expediter". Only the confirmed item offers "Sign off" (REQ-14).
   Tap it. Tab A: steak frites now shows "OK to serve" (REQ-15). This completes SC-006.
9. At every step, check that no screen shows "safe" or "allergen-free" (SC-002).
10. "Reset demo data" in either tab: both tabs go back to the seed.

## 4. Deployment check (Vercel, static)

- Vercel project settings: Root Directory `frontend`, Framework preset Vite, Output `dist`.
- After deploy, load `<url>/kitchen` directly and reload it. The app loads, not a 404, because of
  the `frontend/vercel.json` rewrite (research R-7).
- In the browser devtools Network tab, there are no requests other than the app's own static
  files (Constitution IV).

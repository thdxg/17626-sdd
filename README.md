# 17-626 Assignment 3: Spec-Driven Development

**Allergy Order Round Trip.** A prototype for a 90-seat bistro that carries a guest's food allergy from the table to the kitchen and back. It has two screens: a **server tablet** and a **kitchen display**. Both use mock dish data and share state between two tabs of one browser, with no backend.

We built it with [GitHub Spec Kit](https://github.github.io/spec-kit/): goal model → spec → plan → tasks → implementation. Then we evaluated Prototype V1 and revised the spec for V2.

## Deliverables

| # | Deliverable | Link |
|---|---|---|
| 1 | GitHub Version 1 (goal model, spec, Spec Kit artifacts, source) | [`v1`](https://github.com/thdxg/17626-sdd/tree/v1) |
| 2 | GitHub Version 2 (revised goal model, spec, Spec Kit artifacts, source) | [`v2`](https://github.com/thdxg/17626-sdd/tree/v2) |
| 3 | Prototype V1 URL | https://17626-sdd-v1.vercel.app/ |
| 4 | Prototype V2 URL | https://17626-sdd-v2.vercel.app/ |
| 5 | Requirements Analysis and Learning Log | [`docs/learning-log.md`](docs/learning-log.md) |

Supporting documents for deliverable 5:
- [`docs/goal-model.md`](docs/goal-model.md): team goal model, sprint scope, goal relationships, and conflict decisions
- [`docs/traceability.md`](docs/traceability.md): Requirements Traceability Matrix (interview evidence → goal → REQ → code → status) for V1 and V2
- [`docs/initial-spec.md`](docs/initial-spec.md): the initial requirements (REQ-01 to REQ-22) before Spec Kit

## Trying the prototype

1. Open the prototype URL in **two tabs of the same browser**.
2. In one tab, pick **Server**. In the other, pick **Station lead** or **Expediter**. You can switch roles at any time with "Change role".
3. On the server tablet, record an allergy for a seat, add dishes and send the order. Then acknowledge, confirm or reject, and sign off on the kitchen display, and watch the status change on the tablet.
4. "Reset demo data" restores the mock data in every open tab.

The screens share state only within one browser (spec assumption A-10). A second device or browser won't see the same orders.

## What changed from V1 to V2

We evaluated V1 against every acceptance scenario ([`docs/traceability.md`](docs/traceability.md)). Four findings were requirements issues, not code defects, so we changed the spec first ([Clarifications, Session 2026-11-17](specs/001-allergy-order-round-trip/spec.md#session-2026-11-17-v2-from-the-v1-evaluation)), then the plan and tasks (Phase 11 of [`tasks.md`](specs/001-allergy-order-round-trip/tasks.md)), then the code. The requirement IDs did not change.

| REQ | V1 | V2 |
|---|---|---|
| REQ-10 | A dish that lists the seat's allergen (walnut salad for a tree-nut seat) could be confirmed and reach "OK to serve" | The kitchen gets no "Confirm" for that dish, only "Cannot confirm" with a reason. New success criterion SC-008 |
| REQ-20 | Chef-approved changes were shown as text only (SHOULD) | Now MUST. The server picks one change, and the kitchen ticket shows it. The kitchen still cannot confirm the dish, because the dish record does not say the change removes the allergen (conflict C-12) |
| REQ-06 | The server recorded whether traces matter, but the kitchen never saw it | Each allergy item on the kitchen display shows "Traces: yes" or "Traces: no" |
| REQ-08 | An allergy ticket dropped to its sent-time place once acknowledged | It stays above normal tickets until every allergy item is signed off or marked "Cannot confirm" |

The goal model was updated to match (G-25, G-30, G-32, new G-89; see [`docs/goal-model.md`](docs/goal-model.md)). Compare the two versions: [`v1...v2`](https://github.com/thdxg/17626-sdd/compare/v1...v2). What we learned from these changes is in the learning log, [Section 3](docs/learning-log.md#3-revisions-and-learning).

## Repository structure

```
frontend/                              # Prototype source (Vite + React + TypeScript)
specs/001-allergy-order-round-trip/    # Spec Kit artifacts: spec, plan, research, data model, contracts, tasks
.specify/                              # Spec Kit templates, scripts, and the project constitution
docs/
├── goal-model.md                      # Goal model and decisions (diagrams in docs/goal-model/)
├── traceability.md                    # Requirements Traceability Matrix
├── learning-log.md                    # Requirements analysis and reflection
└── initial-spec.md                    # Initial requirements
README.md
```

Run locally:

```bash
cd frontend
npm install
npm run dev      # development server
npx vitest run   # tests; each test name starts with its REQ ID
```

## Roles and Responsibilities

_TODO: each member to review and edit their own entry._

- **Steven Chen, Requirements lead.** Merged the three goal models into the team goal model and set the sprint scope and its justification. Wrote the constitution and the specification (REQ IDs, acceptance scenarios, assumptions, conflict decisions). Reviewed the plan and tasks for drift from the spec and revised the spec for V2.
- **Ethan Lee, Build lead.** Set up the repository, Spec Kit, and the Vercel deployments for V1 and V2. Reviewed the spec for buildability (added assumption A-10, shared state between tabs). Ran Spec Kit plan, tasks, and implement, then reviewed and verified the generated code (build, lint, 202 tests, browser checks). Implemented and deployed V2. Wrote the README.
- **Yuting Wang, Evaluation lead.** Compared the conflicts in the three Assignment 2 goal models to inform the sprint scope, and built the Requirements Traceability Matrix. Reviewed the spec for testability and raised the issues that became V2 changes. Yuting wrote the V1 evaluation checklist from the acceptance scenarios and Section 2 of the learning log.

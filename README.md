# 17-626 Assignment 3: Spec-Driven Development

**Allergy Order Round Trip.** A prototype for a 90-seat bistro that carries a guest's food allergy from the table to the kitchen and back. It has two screens: a **server tablet** and a **kitchen display**. Both use mock dish data and share state between two tabs of one browser, with no backend.

We built it with [GitHub Spec Kit](https://github.github.io/spec-kit/): goal model → spec → plan → tasks → implementation. Then we evaluated Prototype V1 and revised the spec for V2.

## Deliverables

| # | Deliverable | Link |
|---|---|---|
| 1 | GitHub Version 1 (goal model, spec, Spec Kit artifacts, source) | [`v1`](https://github.com/thdxg/17626-sdd/tree/v1) |
| 2 | GitHub Version 2 (revised goal model, spec, Spec Kit artifacts, source) | [`v2`](https://github.com/thdxg/17626-sdd/tree/v2) _(TODO: tag after V2 is merged)_ |
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

_TODO: summary of the requirements-level change(s), with links to the spec diff and the learning log, Section 3._

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
- **Yuting Wang, Evaluation lead.** Indexed the interview transcripts and built the Requirements Traceability Matrix. Wrote the V1 evaluation checklist, evaluated Prototype V1 against every acceptance scenario, and classified each observation as an implementation defect or a requirements issue. Re-evaluated V2 and compiled the learning log.

# Allergy Order Round Trip Constitution

A prototype for a bistro: a server tablet and a kitchen display that carry a guest's food
allergy from the table to the kitchen and back.

## Core Principles

### I. Safety Over Speed

- The system MUST NOT label any dish "safe", "allergen-free", or any equivalent wording.
- When the system cannot verify an allergy status, it MUST show "Not confirmed" or
  "Cannot confirm", never a guess or a default positive.
- When safety and speed conflict, safety wins.

Rationale: a false assurance about an allergen can harm a guest; an honest "not confirmed"
cannot.

### II. Traceability

- Every requirement MUST have a REQ ID that links to a goal ID in the team goal model.
- Every task and every code change (commit or pull request) MUST name the REQ IDs it implements.

Rationale: any line of work can be traced back to the goal that justifies it.

### III. Spec First

- `spec.md` is the source of truth for behavior.
- A change MUST go into the spec first, then the plan, then the code. Code that disagrees with
  the spec is a defect.

### IV. Simple Prototype

- The prototype MUST use mock dish data, MUST NOT use real login, and MUST NOT call external
  services.
- All MUST requirements MUST be built before work starts on any SHOULD requirement.

### V. Testable

- Every requirement MUST have acceptance examples.
- Work is done only when it passes the acceptance examples of the REQ IDs it names.

## Prototype Scope

This constitution does not choose a tech stack; that decision belongs in the plan. Anything not
needed to carry an allergy from table to kitchen and back is out of scope unless the spec adds it.

## Development Workflow

Reviewers check each pull request against these principles: no "safe" wording, REQ IDs named,
spec updated before code, prototype limits respected, and acceptance examples passing.

## Governance

- This constitution overrides other project practices where they conflict.
- It changes only through a pull request reviewed and approved by all three team members.
- Versioning: MAJOR for removing or redefining a principle, MINOR for adding a principle or
  section, PATCH for wording fixes.

**Version**: 1.0.0 | **Ratified**: 2026-11-16 | **Last Amended**: 2026-11-16

# Feature Specification: Allergy Order Round Trip

**Feature Branch**: `add-spec-and-constitution`

**Created**: 2026-11-16

**Status**: Draft

**Input**: User description: "Create the feature spec for "Allergy Order Round Trip" from
docs/initial-spec.md."

## Problem

At a 90-seat bistro, a guest's food allergy has to travel from the table to the kitchen and back.
Today this depends on notes and verbal checks. So an allergy can be attached to the wrong guest,
missed on a busy kitchen line, or described to the guest as "safe" before anyone in the kitchen
has checked the dish. This affects the server (Kayla), the kitchen line led by the head chef
(Antoine), and guests with severe allergies (Sofia).

This sprint builds one allergy order from the table to the kitchen and back. It has two screens:
the **server tablet** and the **kitchen display**. Both read the same mock dish data. The dish data
is mock data, so this sprint does not edit dish records.

Each requirement has an ID (REQ-xx), a priority, and the goal it comes from in our team goal model
(G-xx). MUST requirements are built in V1. SHOULD requirements are built only if time allows.

## Goals

- **G-2**: Never serve an allergen to an allergic guest. This is the main goal in all three of our
  models.
- **G-3**: Serve an allergy-safe plate when the allergy is known before the order is sent. This
  sprint builds its steps, from recording the allergy to releasing the plate.

Each requirement below names the goal it comes from (G-xx). The full list of goals is in the team
goal model.

## Glossary

- **Allergy order**: an item for a seat whose severity is severe allergy, intolerance, or unknown.
- **Acknowledged**: someone in the kitchen has seen the allergy ticket. It does not mean the dish
  is safe.
- **Confirmed**: the station lead checked the ingredients and preparation for this order. The
  system saved the reviewer's role name and the time.
- **Cannot confirm**: the kitchen cannot say the dish is safe, because the dish information is
  missing or unverified, or because the kitchen rejected it.
- **Not confirmed**: the label for a dish with no known conflict that the kitchen has not confirmed
  yet.
- **OK to serve**: the expediter signed off the allergy item at the pass.
- **Kitchen status**: one of Sent, Acknowledged, Confirmed, or Cannot confirm.

## Clarifications

### Session 2026-11-16

- Q: C-5 — must the kitchen review the dish before ordering? → A: No change for V1. V1 reviews
  after the order is sent; a check before ordering stays out of scope as a follow-up. C-5 stays
  unresolved until the stakeholders answer.
- Q: May the station lead confirm a dish whose allergen information is missing or unverified? →
  A: No. A sentence was added to the end of REQ-10 (ID kept; now traces to G-38 and G-70), in
  this spec and in `docs/initial-spec.md`.
- Q: Should the tablet block, warn, or allow sending a dish that shows "Contains <allergen>"? →
  A: Allow it. The kitchen review is the safeguard, and the guest decides. No requirement added.

## User Scenarios & Testing *(mandatory)*

The five stories follow the order of the round trip: table → tablet → kitchen → tablet → pass.
Each story contains MUST requirements, so all five are P1 for V1. SHOULD requirements inside a
story are built only after every MUST requirement in every story passes (Constitution IV). Each
acceptance scenario names the REQ ID it tests.

### User Story 1 - Server records a guest's allergy on a seat (Priority: P1)

Kayla is taking an order. A guest at seat 3 says they have a severe tree-nut allergy and traces
matter. From the seat view, Kayla picks the allergen, the severity, and the trace setting with a
few taps, optionally types a note, and the allergy is attached to seat 3 and every item ordered
for seat 3, and to no other seat.

**Requirements**: REQ-01, REQ-02, REQ-03, REQ-17 (MUST); REQ-18 (SHOULD)

**Why this priority**: Every later step depends on the allergy being recorded on the right seat.
A wrong-seat allergy defeats G-2 before the kitchen ever sees the order.

**Independent Test**: On the tablet alone, record allergies on seats and check which seats and
items carry them and which items become allergy orders.

**Acceptance Scenarios**:

1. **Given** the server is on the seat view for seat 3, **When** they open allergy recording,
   **Then** they can choose allergens from a fixed list, a severity (severe allergy, intolerance,
   preference, or unknown), and traces (yes or no), and may add a free-text note. (REQ-01)
2. **Given** the server records an allergy and leaves the note empty, **When** they save it,
   **Then** the allergy is saved without a note. (REQ-01)
3. **Given** seat 3 has a recorded allergy and two items, **When** the server views seats 2, 3 and
   4, **Then** the allergy appears on seat 3 and both of its items, and on no item of seat 2 or 4.
   (REQ-02)
4. **Given** seat 3's severity is severe allergy, intolerance, or unknown, **When** the server
   adds any item for seat 3, **Then** that item is an allergy order. (REQ-03)
5. **Given** the server is on the seat view, **When** they record one allergen with its severity
   and trace setting, **Then** it takes 4 taps or fewer, no extra screen, no typing, and can be
   done within 10 seconds. (REQ-17)
6. **Given** seat 5's only recorded severity is preference, **When** the server adds an item for
   seat 5, **Then** the item is a normal modification and not an allergy order. (REQ-18, SHOULD)

**Boundary examples (REQ-17, limit: 4 taps)**:

```gherkin
Scenario Outline: Recording one allergen within the tap limit (REQ-17)
  Given the server is on the seat view for seat 3
  When the server records one allergen with its severity and trace setting in <taps> taps
  Then the recording <result> REQ-17

  Examples:
    | taps | result |
    | 3    | passes |
    | 4    | passes |
    | 5    | fails  |
```

---

### User Story 2 - Server checks dishes against the seat's allergy (Priority: P1)

Before sending the order, Kayla looks at dishes for seat 3. Dishes whose record lists tree nuts
show "Contains Tree nuts". Dishes with no known conflict show "Not confirmed", never "safe". The
daily special with missing allergen information shows "Cannot confirm".

**Requirements**: REQ-04, REQ-05, REQ-16 (MUST); REQ-19, REQ-20 (SHOULD)

**Why this priority**: This is where the system is most tempted to reassure the guest. It must
inform the server without ever claiming a dish is safe (Constitution I).

**Independent Test**: With the mock menu (A-2) and a seat with an allergy, view each dish and
check its label; no kitchen display is needed.

**Acceptance Scenarios**:

1. **Given** seat 3 has a tree-nut allergy, **When** the server views or adds a dish whose record
   lists tree nuts, **Then** the dish shows "Contains Tree nuts". (REQ-04)
2. **Given** seat 3 has a tree-nut allergy, **When** the server views a dish whose record lists
   none of seat 3's allergens, **Then** "Contains" is not shown on it. (REQ-04)
3. **Given** a dish has no conflict and the kitchen has not confirmed it, **When** the server views
   it, **Then** it is labelled "Not confirmed". (REQ-05)
4. **Given** any screen in any state of the round trip, **When** it is displayed, **Then** the
   words "safe" and "allergen-free" do not appear. (REQ-05)
5. **Given** a dish record marks its allergen information as missing or unverified (the daily
   special), **When** it is viewed for any seat with an allergy, **Then** it is labelled "Cannot
   confirm". (REQ-16)
6. **Given** seat 3 already has dishes, **When** the server records a new allergy for seat 3,
   **Then** those dishes are checked again and their labels follow REQ-04, REQ-05 and REQ-16.
   (REQ-19, SHOULD)
7. **Given** a dish shows "Contains <allergen>", **When** the server looks for changes, **Then**
   only the changes the dish record lists as chef-approved for that allergen are offered. (REQ-20,
   SHOULD)

---

### User Story 3 - Kitchen notices and acknowledges the allergy ticket (Priority: P1)

Kayla sends the order. On the kitchen display, the ticket jumps to the top labelled "ALLERGY – NOT
ACKNOWLEDGED". Each allergy item shows the allergen, severity, and seat number as text, and the
fried dish shows "Cross-contact: fryer". The station lead taps "Acknowledge".

**Requirements**: REQ-06, REQ-07, REQ-08, REQ-09 (MUST); REQ-21, REQ-22 (SHOULD)

**Why this priority**: An allergy that is missed on a busy line defeats G-2 even if it was
recorded correctly.

**Independent Test**: Send an allergy order (or load one into the kitchen display) and check the
ticket's position, labels, and status after "Acknowledge".

**Acceptance Scenarios**:

1. **Given** an allergy order for seat 3 (tree nuts, severe allergy) is sent, **When** it appears
   on the kitchen display, **Then** each allergy item shows "Tree nuts", "severe allergy", and
   "seat 3" as text. (REQ-06)
2. **Given** a dish record lists the shared fryer, **When** that dish appears as an allergy item,
   **Then** it shows "Cross-contact: fryer". (REQ-07)
3. **Given** an allergy ticket and several normal tickets, **When** the allergy ticket is not
   acknowledged, **Then** it stays at the top with the label "ALLERGY – NOT ACKNOWLEDGED", even as
   newer tickets arrive. (REQ-08)
4. **Given** an unacknowledged allergy ticket, **When** the station lead taps "Acknowledge",
   **Then** the kitchen status of its allergy items becomes "Acknowledged". (REQ-09)
5. **Given** a new allergy ticket arrives, **When** it appears, **Then** one sound plays; **and
   when** it is not acknowledged within 60 seconds, **Then** the "ALLERGY – NOT ACKNOWLEDGED" label
   flashes. (REQ-21, SHOULD)
6. **Given** a non-allergy change arrives, **When** it appears, **Then** the allergy label is not
   used for it. (REQ-21, SHOULD)
7. **Given** an allergy item is not signed off, **When** any user tries to clear it, **Then** it
   stays on the kitchen display. (REQ-22, SHOULD)

**Boundary examples (REQ-21, SHOULD, escalation time: 60 seconds, A-4)**:

```gherkin
Scenario Outline: Unacknowledged allergy label starts flashing at 60 seconds (REQ-21)
  Given a new allergy ticket arrived on the kitchen display
  And the ticket has not been acknowledged
  When <elapsed> seconds have passed since it arrived
  Then the "ALLERGY – NOT ACKNOWLEDGED" label <state>

  Examples:
    | elapsed | state              |
    | 59      | does not flash     |
    | 60      | flashes            |
    | 61      | flashes            |
```

---

### User Story 4 - Station lead reviews; expediter signs off (Priority: P1)

Antoine's station lead checks the ingredients and preparation for the acknowledged item and taps
"Confirm", or taps "Cannot confirm" and enters a reason. At the pass, the expediter taps
"Sign off" on a confirmed item.

**Requirements**: REQ-10, REQ-11, REQ-14 (MUST)

**Why this priority**: This is the only place the system records that a person checked the dish.
Without it the tablet can only ever say "Not confirmed".

**Independent Test**: On the kitchen display alone, move allergy items through Acknowledged →
Confirmed / Cannot confirm → signed off, using the role menu (A-3), and check which buttons are
offered at each step and what is saved.

**Acceptance Scenarios**:

1. **Given** an acknowledged allergy item, **When** the station lead taps "Confirm", **Then** its
   kitchen status becomes "Confirmed" and the reviewer's role name and the time are saved.
   (REQ-10)
2. **Given** an allergy item that is not acknowledged, **When** the station lead views it,
   **Then** "Confirm" is not offered. (REQ-10)
3. **Given** an acknowledged allergy item for the daily special, whose dish record marks its
   allergen information as missing, **When** the station lead views it, **Then** "Confirm" is not
   offered and "Cannot confirm" is. (REQ-10, REQ-11)
4. **Given** an acknowledged allergy item, **When** the station lead taps "Cannot confirm" and
   enters a reason, **Then** its kitchen status becomes "Cannot confirm" and the reason is saved.
   (REQ-11)
5. **Given** the station lead taps "Cannot confirm" and leaves the reason empty, **When** they try
   to save, **Then** "Cannot confirm" is not saved and the status is unchanged. (REQ-11)
6. **Given** a confirmed allergy item, **When** the expediter taps "Sign off", **Then** the
   sign-off and the time are saved. (REQ-14)
7. **Given** an allergy item whose status is Sent, Acknowledged, or Cannot confirm, **When** the
   expediter views it, **Then** "Sign off" is not offered. (REQ-14)

---

### User Story 5 - Server sees the kitchen's answer (Priority: P1)

Back at the table, Kayla's tablet shows each allergy item's kitchen status as it changes, with the
reason if the kitchen cannot confirm. "Confirmed" appears only when the kitchen confirmed, and
"OK to serve" only after the expediter signed off.

**Requirements**: REQ-12, REQ-13, REQ-15 (MUST)

**Why this priority**: This closes the round trip. The server tells the guest only what the
kitchen has actually said.

**Independent Test**: Change kitchen statuses on the kitchen display and watch the tablet, timing
each update.

**Acceptance Scenarios**:

1. **Given** an allergy item on the tablet, **When** its kitchen status changes, **Then** the
   tablet shows the new status within 5 seconds. (REQ-12)
2. **Given** the station lead saves "Cannot confirm" with a reason, **When** the tablet updates,
   **Then** it shows "Cannot confirm" together with the reason. (REQ-12)
3. **Given** an allergy item whose kitchen status is Sent, Acknowledged, or Cannot confirm,
   **When** the server views it, **Then** "Confirmed" is not shown for it. (REQ-13)
4. **Given** an allergy item is signed off, **When** the server views it, **Then** it shows "OK to
   serve". (REQ-15)
5. **Given** an allergy item is Confirmed but not signed off, **When** the server views it,
   **Then** "OK to serve" is not shown. (REQ-15)

**Boundary examples (REQ-12, limit: 5 seconds)**:

```gherkin
Scenario Outline: Kitchen status reaches the tablet within 5 seconds (REQ-12)
  Given an allergy item is shown on the server tablet
  When its kitchen status changes on the kitchen display
  And the new status appears on the tablet after <delay> seconds
  Then the update <result> REQ-12

  Examples:
    | delay | result |
    | 4     | passes |
    | 5     | passes |
    | 6     | fails  |
```

---

### Edge Cases

- **Several allergens and severities on one seat**: if any recorded severity on the seat is
  severe allergy, intolerance, or unknown, every item for the seat is an allergy order (REQ-03),
  even if another allergy on the same seat is a preference (REQ-18).
- **Dish lists an allergen and also has missing/unverified information**: REQ-04 ("Contains
  <allergen>") and REQ-16 ("Cannot confirm") both apply; both labels are shown. Neither may be
  replaced by "Not confirmed".
- **Unknown severity**: handled as an allergy order (REQ-03, A-5), so the item goes through the
  full kitchen review.
- **Trace setting "yes" with a cross-contact dish**: the kitchen display shows "Cross-contact:
  <equipment>" (REQ-07); the tablet's label still follows REQ-04/REQ-05/REQ-16 and never says the
  dish is safe.
- **Ticket mixes allergy and normal items**: "Acknowledge" sets only the allergy items to
  "Acknowledged" (REQ-09); normal items get no allergy label (REQ-21).
- **Kitchen cannot confirm an item**: the tablet shows "Cannot confirm" and the reason (REQ-12);
  the item can never reach "OK to serve" because "Sign off" needs "Confirmed" (REQ-14, REQ-15).
  Changing the order after it is sent is out of scope.
- **Dish record with missing or unverified allergen information is sent anyway**: the tablet
  labels it "Cannot confirm" (REQ-16), and the kitchen display does not offer "Confirm" for it
  (REQ-10). The station lead can only mark it "Cannot confirm" with a reason (REQ-11), so it can
  never reach "OK to serve" (REQ-14, REQ-15).
- **Server sends a dish that shows "Contains <allergen>"**: the system allows it, with no block
  or warning. The kitchen review (REQ-10, REQ-11) is the safeguard, and the guest decides.
- **Status changes faster than the tablet updates** (e.g., Acknowledged then Confirmed within 5
  seconds): the tablet must end on the latest status and must never show "Confirmed" or "OK to
  serve" before they are true (REQ-13, REQ-15).
- **Role picked by mistake**: there is no real login (A-3), so anyone can pick any role. Per
  A-9, kitchen actions appear only for the role each requirement names (station lead for REQ-09,
  REQ-10, REQ-11; expediter for REQ-14). The prototype does not protect against a wrong role pick.

### Dependencies

- D-1: REQ-06 needs REQ-02. The kitchen can show the seat only if the allergy is attached to the
  seat and its items.
- D-2: REQ-10 and REQ-11 need REQ-09. The kitchen confirms or rejects an item only after it is
  acknowledged.
- D-3: REQ-15 needs REQ-14, and REQ-14 needs REQ-10. "OK to serve" needs a sign-off, and a
  sign-off needs a confirmed item.
- D-4: REQ-12, REQ-13 and REQ-15 need the kitchen status changes from REQ-09, REQ-10, REQ-11 and
  REQ-14.
- D-5: REQ-04, REQ-05, REQ-07 and REQ-16 read the mock dish records, so they depend on assumption
  A-1.
- D-6 (SHOULD): REQ-19 needs REQ-04, REQ-05 and REQ-16. REQ-20 needs REQ-04. REQ-22 needs REQ-14.

## Requirements *(mandatory)*

All requirements use the EARS form. "SHALL" is used for every requirement; the priority tag says
whether it is built in V1. The IDs, priorities, goal IDs, and wording below are copied unchanged
from `docs/initial-spec.md`.

### Functional Requirements

#### Server tablet: recording the allergy

- **REQ-01** [MUST] (G-9): WHEN the server records an allergy for a seat, THE SYSTEM SHALL let the server choose the allergens from a fixed list, the severity (severe allergy, intolerance, preference, or unknown), and whether traces matter (yes or no). THE SYSTEM SHALL let the server add a free-text note, and SHALL NOT require it.
- **REQ-02** [MUST] (G-10): WHEN an allergy is recorded for a seat, THE SYSTEM SHALL attach it to that seat and to every item ordered for that seat, and SHALL NOT attach it to any other seat.
- **REQ-03** [MUST] (G-12): IF the severity is severe allergy, intolerance, or unknown, THEN THE SYSTEM SHALL handle every item for that seat as an allergy order.
- **REQ-17** [MUST] (G-84): WHEN the server records one allergen with its severity and trace setting, THE SYSTEM SHALL need 4 taps or fewer, starting from the seat view, with no extra screen and no typing, so that it can be done within 10 seconds.
- **REQ-18** [SHOULD] (G-13): IF the severity is preference, THEN THE SYSTEM SHALL handle the item as a normal modification and SHALL NOT handle it as an allergy order.

#### Server tablet: checking dishes

- **REQ-04** [MUST] (G-22): WHEN the server views or adds a dish for a seat with an allergy, IF the dish record lists one of that seat's allergens, THEN THE SYSTEM SHALL show "Contains <allergen>" on the dish. IF the dish record lists none of that seat's allergens, THEN THE SYSTEM SHALL NOT show "Contains".
- **REQ-05** [MUST] (G-23): IF a dish has no conflict and the kitchen has not confirmed it, THEN THE SYSTEM SHALL label it "Not confirmed". THE SYSTEM SHALL NOT show the words "safe" or "allergen-free" on any screen.
- **REQ-16** [MUST] (G-70): IF a dish record marks its allergen information as missing or unverified, THEN THE SYSTEM SHALL label the dish "Cannot confirm" for any seat with an allergy.
- **REQ-19** [SHOULD] (G-17): WHEN an allergy is recorded for a seat that already has dishes, THE SYSTEM SHALL check those dishes again under REQ-04, REQ-05 and REQ-16.
- **REQ-20** [SHOULD] (G-25): WHEN a dish shows "Contains <allergen>", THE SYSTEM SHALL offer only the changes that the dish record lists as chef-approved for that allergen.

#### Kitchen display: noticing the ticket

- **REQ-06** [MUST] (G-30): WHEN an allergy order is sent, THE SYSTEM SHALL show the allergen name, the severity, and the seat number as text on each allergy item on the kitchen display.
- **REQ-07** [MUST] (G-31): IF a dish record lists shared equipment (fryer, base, or utensil), THEN THE SYSTEM SHALL show "Cross-contact: <equipment>" on that allergy item on the kitchen display.
- **REQ-08** [MUST] (G-32): WHILE an allergy ticket is not acknowledged, THE SYSTEM SHALL show it at the top of the kitchen display with the label "ALLERGY – NOT ACKNOWLEDGED".
- **REQ-09** [MUST] (G-34): WHEN the station lead taps "Acknowledge" on an allergy ticket, THE SYSTEM SHALL set the kitchen status of its allergy items to "Acknowledged".
- **REQ-21** [SHOULD] (G-33): WHEN a new allergy ticket arrives, THE SYSTEM SHALL play one sound. IF the ticket is not acknowledged within 60 seconds, THEN THE SYSTEM SHALL make the "ALLERGY – NOT ACKNOWLEDGED" label flash. THE SYSTEM SHALL NOT use the allergy label for non-allergy changes.
- **REQ-22** [SHOULD] (G-53): IF an allergy item is not signed off, THEN THE SYSTEM SHALL NOT let any user clear it from the kitchen display.

#### Kitchen display: review and sign-off

- **REQ-10** [MUST] (G-38, G-70): WHEN the station lead taps "Confirm" on an acknowledged allergy item, THE SYSTEM SHALL set its kitchen status to "Confirmed" and save the reviewer's role name and the time. IF the item is not acknowledged, THEN THE SYSTEM SHALL NOT offer "Confirm". IF the dish record marks its allergen information as missing or unverified, THEN THE SYSTEM SHALL NOT offer "Confirm".
- **REQ-11** [MUST] (G-39): WHEN the station lead taps "Cannot confirm" on an acknowledged allergy item and enters a reason, THE SYSTEM SHALL set its kitchen status to "Cannot confirm" and save the reason. THE SYSTEM SHALL NOT save "Cannot confirm" without a reason.
- **REQ-14** [MUST] (G-50): WHEN the expediter taps "Sign off" on a confirmed allergy item, THE SYSTEM SHALL save the sign-off and the time. IF the item is not "Confirmed", THEN THE SYSTEM SHALL NOT offer "Sign off".

#### Server tablet: kitchen status

- **REQ-12** [MUST] (G-41): WHEN the kitchen status of an allergy item changes, THE SYSTEM SHALL show the new kitchen status on the server tablet within 5 seconds, together with the reason if it is "Cannot confirm".
- **REQ-13** [MUST] (G-43): IF the kitchen status of an allergy item is not "Confirmed", THEN THE SYSTEM SHALL NOT show "Confirmed" for it on the tablet.
- **REQ-15** [MUST] (G-51): WHEN an allergy item is signed off, THE SYSTEM SHALL show "OK to serve" for it on the tablet. IF it is not signed off, THEN THE SYSTEM SHALL NOT show "OK to serve".

### Key Entities

- **Seat**: a guest position at a table, identified by seat number. Holds zero or more allergies
  and the items ordered for it.
- **Allergy**: recorded for one seat. Allergens (from the fixed list), severity (severe allergy,
  intolerance, preference, unknown), traces matter (yes/no), optional note.
- **Dish record (mock)**: read-only. Listed allergens, allergen information status (complete,
  missing, or unverified), shared equipment (fryer, base, utensil), and chef-approved changes per
  allergen.
- **Order item**: a dish ordered for a seat. It is an allergy order when REQ-03 applies.
- **Allergy ticket**: a sent order as shown on the kitchen display, containing one or more
  allergy items. Has an acknowledged / not acknowledged state.
- **Kitchen status**: per allergy item; one of Sent, Acknowledged, Confirmed, Cannot confirm.
- **Review record**: per allergy item; reviewer role name and time (Confirmed), or reason
  (Cannot confirm).
- **Sign-off**: per confirmed allergy item; the sign-off and its time. Drives "OK to serve".
- **Role**: server, station lead, or expediter, picked from a menu (A-3).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A server records one allergen with its severity and trace setting in 4 taps or fewer
  and within 10 seconds, starting from the seat view, in every timed trial. (REQ-17)
- **SC-002**: In a full walkthrough of every dish in the mock menu, in every status, the words
  "safe" and "allergen-free" appear on no screen. (REQ-05)
- **SC-003**: In every test order, the allergy appears on the right seat and its items, and on no
  other seat. (REQ-02)
- **SC-004**: Every kitchen status change appears on the server tablet within 5 seconds in every
  timed trial. (REQ-12)
- **SC-005**: No allergy item shows "Confirmed" or "OK to serve" on the tablet before the kitchen
  has confirmed or signed it off, across all acceptance scenarios. (REQ-13, REQ-15)
- **SC-006**: One allergy order completes the full round trip — record, check, send, acknowledge,
  confirm, sign off, "OK to serve" on the tablet — using only the mock data and the role menu.
- **SC-007**: Every acceptance scenario for a MUST requirement passes before work starts on any
  SHOULD requirement.

## Assumptions

From `docs/initial-spec.md` (unchanged):

- A-1: The mock dish records are correct and approved, and both screens read the same record for
  each dish (G-63).
- A-2: The mock menu has about 8 dishes. At least one contains tree nuts, one uses the shared
  fryer, one has a chef-approved change, and one is a daily special with missing allergen
  information.
- A-3: The user picks a role (server, station lead, or expediter) from a simple menu. There is no
  real login.
- A-4: The escalation time in REQ-21 is 60 seconds and can be changed.
- A-5: An intolerance and an unknown severity are handled as allergy orders (REQ-03).
- A-6: The 5-second limit in REQ-12 is our own number. No stakeholder gave a time.

Added while writing this spec (do not change any requirement):

- A-7: An "allergy ticket" is one sent order for a table; "Acknowledge" applies to all allergy
  items on that ticket at once (REQ-09).
- A-8: A newly sent allergy item has kitchen status "Sent" until it is acknowledged.
- A-9: One tablet and one kitchen display are used at a time; the role menu decides which actions
  are offered, following the role named in each requirement.
- A-10: The server tablet and the kitchen display run as two tabs or windows of one browser and
  share state in that browser; there is no server. A "Reset demo data" control restores the mock
  data. (Needed so REQ-12 can be met without external services, Constitution IV.)

## Conflict Decisions

- C-1: The tablet shows "Not confirmed" instead of "safe" (REQ-05, REQ-13).
- C-2: Fixed-list choices on one screen, with an optional note (REQ-01, REQ-17).
- C-3: The ticket stays at the top until acknowledged (REQ-08). The sound limit is SHOULD
  (REQ-21).
- C-4: One tap saves the reviewer's name and the time (REQ-10).
- C-5 (unresolved): The guest wants the kitchen to review the dish before ordering, but the
  kitchen reviews after the order is sent. V1 reviews after the order is sent. We need to ask the
  stakeholders. A kitchen check before ordering stays out of scope for V1 and is a follow-up for
  a later version.
- C-6: "Acknowledged" and "Confirmed" are separate kitchen statuses (Glossary, REQ-09, REQ-10).
- C-7: An intolerance is handled as an allergy order for now (REQ-03). We need to ask the
  stakeholders.
- C-8: Only chef-approved changes are offered (REQ-20, SHOULD).

## Out of Scope

Changes after the order is sent, editing dish records, kitchen questions before ordering, the
guest menu app and privacy, cooking steps at the station, and offline or broken-tablet handling.

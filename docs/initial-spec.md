# Allergy Order Round Trip

## Problem

At a 90-seat bistro, a guest's food allergy has to travel from the table to the kitchen and back. Today this depends on notes and verbal checks. So an allergy can be attached to the wrong guest, missed on a busy kitchen line, or described to the guest as "safe" before anyone in the kitchen has checked the dish. This affects the server (Kayla), the kitchen line led by the head chef (Antoine), and guests with severe allergies (Sofia).

This sprint builds one allergy order from the table to the kitchen and back. It has two screens: the **server tablet** and the **kitchen display**. Both read the same mock dish data. The dish data is mock data, so this sprint does not edit dish records.

Each requirement has an ID (REQ-xx), a priority, and the goal it comes from in our team goal model (G-xx). MUST requirements are built in V1. SHOULD requirements are built only if time allows.

## Goals

- **G-2**: Never serve an allergen to an allergic guest. This is the main goal in all three of our models.
- **G-3**: Serve an allergy-safe plate when the allergy is known before the order is sent. This sprint builds its steps, from recording the allergy to releasing the plate.

Each requirement below names the goal it comes from (G-xx). The full list of goals is in the team goal model.

## Glossary

- **Allergy order**: an item for a seat whose severity is severe allergy, intolerance, or unknown.
- **Acknowledged**: someone in the kitchen has seen the allergy ticket. It does not mean the dish is safe.
- **Confirmed**: the station lead checked the ingredients and preparation for this order. The system saved the reviewer's role name and the time.
- **Cannot confirm**: the kitchen cannot say the dish is safe, because the dish information is missing or unverified, or because the kitchen rejected it.
- **Not confirmed**: the label for a dish with no known conflict that the kitchen has not confirmed yet.
- **OK to serve**: the expediter signed off the allergy item at the pass.
- **Kitchen status**: one of Sent, Acknowledged, Confirmed, or Cannot confirm.

## Requirements

All requirements use the EARS form. "SHALL" is used for every requirement; the priority tag says whether it is built in V1.

### Server tablet: recording the allergy

- **REQ-01** [MUST] (G-9): WHEN the server records an allergy for a seat, THE SYSTEM SHALL let the server choose the allergens from a fixed list, the severity (severe allergy, intolerance, preference, or unknown), and whether traces matter (yes or no). THE SYSTEM SHALL let the server add a free-text note, and SHALL NOT require it.
- **REQ-02** [MUST] (G-10): WHEN an allergy is recorded for a seat, THE SYSTEM SHALL attach it to that seat and to every item ordered for that seat, and SHALL NOT attach it to any other seat.
- **REQ-03** [MUST] (G-12): IF the severity is severe allergy, intolerance, or unknown, THEN THE SYSTEM SHALL handle every item for that seat as an allergy order.
- **REQ-17** [MUST] (G-84): WHEN the server records one allergen with its severity and trace setting, THE SYSTEM SHALL need 4 taps or fewer, starting from the seat view, with no extra screen and no typing, so that it can be done within 10 seconds.
- **REQ-18** [SHOULD] (G-13): IF the severity is preference, THEN THE SYSTEM SHALL handle the item as a normal modification and SHALL NOT handle it as an allergy order.

### Server tablet: checking dishes

- **REQ-04** [MUST] (G-22): WHEN the server views or adds a dish for a seat with an allergy, IF the dish record lists one of that seat's allergens, THEN THE SYSTEM SHALL show "Contains <allergen>" on the dish. IF the dish record lists none of that seat's allergens, THEN THE SYSTEM SHALL NOT show "Contains".
- **REQ-05** [MUST] (G-23): WHEN the server views a dish for a seat with an allergy, IF the dish has no conflict and the kitchen has not confirmed it, THEN THE SYSTEM SHALL label it "Not confirmed". THE SYSTEM SHALL NOT show the words "safe" or "allergen-free" on any screen.
- **REQ-16** [MUST] (G-70): IF a dish record marks its allergen information as missing or unverified, THEN THE SYSTEM SHALL label the dish "Cannot confirm" for any seat with an allergy.
- **REQ-19** [SHOULD] (G-17): WHEN an allergy is recorded for a seat that already has dishes, THE SYSTEM SHALL check those dishes again under REQ-04, REQ-05 and REQ-16.
- **REQ-20** [SHOULD] (G-25): WHEN a dish shows "Contains <allergen>", THE SYSTEM SHALL offer only the changes that the dish record lists as chef-approved for that allergen.

### Kitchen display: noticing the ticket

- **REQ-06** [MUST] (G-30): WHEN an allergy order is sent, THE SYSTEM SHALL show the allergen name, the severity, and the seat number as text on each allergy item on the kitchen display.
- **REQ-07** [MUST] (G-31): IF a dish record lists shared equipment (fryer, base, or utensil), THEN THE SYSTEM SHALL show "Cross-contact: <equipment>" on that allergy item on the kitchen display.
- **REQ-08** [MUST] (G-32): WHILE an allergy ticket is not acknowledged, THE SYSTEM SHALL show it at the top of the kitchen display with the label "ALLERGY – NOT ACKNOWLEDGED".
- **REQ-09** [MUST] (G-34): WHEN the station lead taps "Acknowledge" on an allergy ticket, THE SYSTEM SHALL set the kitchen status of its allergy items to "Acknowledged".
- **REQ-21** [SHOULD] (G-33): WHEN a new allergy ticket arrives, THE SYSTEM SHALL play one sound. IF the ticket is not acknowledged within 60 seconds, THEN THE SYSTEM SHALL make the "ALLERGY – NOT ACKNOWLEDGED" label flash. THE SYSTEM SHALL NOT use the allergy label for non-allergy changes.
- **REQ-22** [SHOULD] (G-53): IF an allergy item is not signed off, THEN THE SYSTEM SHALL NOT let any user clear it from the kitchen display.

### Kitchen display: review and sign-off

- **REQ-10** [MUST] (G-38, G-70): WHEN the station lead taps "Confirm" on an acknowledged allergy item, THE SYSTEM SHALL set its kitchen status to "Confirmed" and save the reviewer's role name and the time. IF the item is not acknowledged, THEN THE SYSTEM SHALL NOT offer "Confirm". IF the dish record marks its allergen information as missing or unverified, THEN THE SYSTEM SHALL NOT offer "Confirm".
- **REQ-11** [MUST] (G-39): WHEN the station lead taps "Cannot confirm" on an acknowledged allergy item and enters a reason, THE SYSTEM SHALL set its kitchen status to "Cannot confirm" and save the reason. THE SYSTEM SHALL NOT save "Cannot confirm" without a reason.
- **REQ-14** [MUST] (G-50): WHEN the expediter taps "Sign off" on a confirmed allergy item, THE SYSTEM SHALL save the sign-off and the time. IF the item is not "Confirmed", THEN THE SYSTEM SHALL NOT offer "Sign off".

### Server tablet: kitchen status

- **REQ-12** [MUST] (G-41): WHEN the kitchen status of an allergy item changes, THE SYSTEM SHALL show the new kitchen status on the server tablet within 5 seconds, together with the reason if it is "Cannot confirm".
- **REQ-13** [MUST] (G-43): IF the kitchen status of an allergy item is not "Confirmed", THEN THE SYSTEM SHALL NOT show "Confirmed" for it on the tablet.
- **REQ-15** [MUST] (G-51): WHEN an allergy item is signed off, THE SYSTEM SHALL show "OK to serve" for it on the tablet. IF it is not signed off, THEN THE SYSTEM SHALL NOT show "OK to serve".

## Other Notes

### Assumptions

- A-1: The mock dish records are correct and approved, and both screens read the same record for each dish (G-63).
- A-2: The mock menu has about 8 dishes. At least one contains tree nuts, one uses the shared fryer, one has a chef-approved change, and one is a daily special with missing allergen information.
- A-3: The user picks a role (server, station lead, or expediter) from a simple menu. There is no real login.
- A-4: The escalation time in REQ-21 is 60 seconds and can be changed.
- A-5: An intolerance and an unknown severity are handled as allergy orders (REQ-03).
- A-6: The 5-second limit in REQ-12 is our own number. No stakeholder gave a time.

### Conflict decisions

- C-1: The tablet shows "Not confirmed" instead of "safe" (REQ-05, REQ-13).
- C-2: Fixed-list choices on one screen, with an optional note (REQ-01, REQ-17).
- C-3: The ticket stays at the top until acknowledged (REQ-08). The sound limit is SHOULD (REQ-21).
- C-4: One tap saves the reviewer's name and the time (REQ-10).
- C-5 (unresolved): The guest wants the kitchen to review the dish before ordering, but the kitchen reviews after the order is sent. V1 reviews after the order is sent. We need to ask the stakeholders.
- C-6: "Acknowledged" and "Confirmed" are separate kitchen statuses (Glossary, REQ-09, REQ-10).
- C-7: An intolerance is handled as an allergy order for now (REQ-03). We need to ask the stakeholders.
- C-8: Only chef-approved changes are offered (REQ-20, SHOULD).

### Out of scope

Changes after the order is sent, editing dish records, kitchen questions before ordering, the guest menu app and privacy, cooking steps at the station, and offline or broken-tablet handling.

### Dependencies

- D-1: REQ-06 needs REQ-02. The kitchen can show the seat only if the allergy is attached to the seat and its items.
- D-2: REQ-10 and REQ-11 need REQ-09. The kitchen confirms or rejects an item only after it is acknowledged.
- D-3: REQ-15 needs REQ-14, and REQ-14 needs REQ-10. "OK to serve" needs a sign-off, and a sign-off needs a confirmed item.
- D-4: REQ-12, REQ-13 and REQ-15 need the kitchen status changes from REQ-09, REQ-10, REQ-11 and REQ-14.
- D-5: REQ-04, REQ-05, REQ-07 and REQ-16 read the mock dish records, so they depend on assumption A-1.
- D-6 (SHOULD): REQ-19 needs REQ-04, REQ-05 and REQ-16. REQ-20 needs REQ-04. REQ-22 needs REQ-14.

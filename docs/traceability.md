# Requirements Traceability Matrix

Traces each sprint requirement in `specs/001-allergy-order-round-trip/spec.md` back to stakeholder interview evidence and the team goal model, and forward to the prototype.

**How to read this table**

- **Interview Evidence**: `Kayla [01:05:42] (Y)` is a timestamp in Yuting's interview transcript; `Sofia L56 (S)` is a line in Steven's. One quote per stakeholder, up to three.
- **Goal Model Reference**: the team goal ID (see `docs/goal-model.md`), then the Assignment 2 goals it was merged from (E = Ethan, S = Steven, Y = Yuting).
- ★ = goal not stated directly by a stakeholder (refinement pattern or conflict resolution).
- **Status**: Fully satisfied / Partially satisfied / Not satisfied. SHOULD requirements that were not built are "Not implemented / Not satisfied".

## Version 1

| Requirement | Interview Evidence | Goal Model Reference | Code / Implementation | Status |
|---|---|---|---|---|
| **REQ-01** [MUST]: Choose allergens, severity and traces from fixed lists; note optional | Antoine [02:13:19] (Y): "The server reports the allergy and its severity when taking the order"<br>Kayla L86 (S): "mark how severe it is"<br>Sofia L21 (S): "even trace exposure or cross-contact could be dangerous"<br>_★ Not stated directly; refinement or conflict resolution_ | G-9 ★<br>from E G-95, G-74; S G-10, G-76; Y G-5 | _TBD_ | _TBD_ |
| **REQ-02** [MUST]: Allergy attached to the seat and all its items, and to no other seat | Kayla [01:08:28] (Y): "It needs to be tied to the specific seat, not just the table"<br>Kayla [01:11:33] (Y): "The allergy also has to stay attached to the right seat and order item" | G-10 <br>from E G-46, G-47, G-42; S G-9; Y G-52, G-105, G-106 | _TBD_ | _TBD_ |
| **REQ-03** [MUST]: Severe allergy, intolerance or unknown → every item is an allergy order | Kayla L116 (S): "I usually talk directly to the cook or chef after sending it, especially for a severe allergy"<br>Kayla L68 (S): "Until she could tell me that, I treated it cautiously" | G-12 <br>from E G-60; S G-13, G-15 | _TBD_ | _TBD_ |
| **REQ-04** [MUST]: "Contains &lt;allergen&gt;" shown iff the dish lists one of the seat's allergens | Kayla [01:06:52] (Y): "checked the dishes for peanuts and cross-contact notes" | G-22 <br>from E G-51, G-56; Y G-55 | _TBD_ | _TBD_ |
| **REQ-05** [MUST]: For a seat with an allergy, a no-conflict dish is labelled "Not confirmed"; "safe"/"allergen-free" never shown on any screen | Kayla [01:06:52] (Y): "told her which ones looked safe"<br>Kayla L100 (S): "see safe or modifiable dishes without leaving the table" | G-23 <br>from E G-51; S G-16; Y G-60 | _TBD_ | _TBD_ |
| **REQ-06** [MUST]: Kitchen item shows allergen, severity and seat number as text | Antoine [02:13:19] (Y): "and that information comes through on the ticket."<br>Antoine [02:12:21] (Y): "the ticket gets an allergy flag" | G-30 <br>from E G-23; S G-36; Y G-6, G-4 | _TBD_ | _TBD_ |
| **REQ-07** [MUST]: "Cross-contact: &lt;equipment&gt;" shown for shared equipment | Antoine L30 (S): "we treat the shared oil with shrimp as a cross-contact risk"<br>Antoine [02:12:46] (Y): "A high-risk order is one with a severe allergy or a serious cross-contact risk"<br>Sofia L9 (S): "may contain traces because the fryer is shared" | G-31 <br>from E G-30; S G-39, G-40; Y G-6 | _TBD_ | _TBD_ |
| **REQ-08** [MUST]: Unacknowledged allergy ticket stays on top with "ALLERGY – NOT ACKNOWLEDGED" | Antoine [02:18:40] (Y): "A ticket should also become more prominent if nobody acknowledges it after a"<br>Antoine L73 (S): "keep it prominent until the expediter acknowledges it" | G-32 <br>from E G-22, G-24; S G-38; Y G-10 | _TBD_ | _TBD_ |
| **REQ-09** [MUST]: "Acknowledge" sets allergy items to Acknowledged | Antoine [02:21:10] (Y): "They acknowledge the allergy ticket"<br>Sofia L27 (S): "whether someone in the kitchen has actually read it" | G-34 <br>from S G-83; Y G-8 | _TBD_ | _TBD_ |
| **REQ-10** [MUST]: "Confirm" saves role name and time; not offered before acknowledgment or for missing/unverified info | Antoine [02:17:49] (Y): "the server should be able to send the question to the kitchen and receive a clear"<br>Sofia [19:05:13] (Y): "I’d want a clear status such as “allergy received by the kitchen,”" | G-38, G-70 <br>from E G-83, G-94; S G-81, G-84; Y G-42, G-84 | _TBD_ | _TBD_ |
| **REQ-11** [MUST]: "Cannot confirm" requires and saves a reason | Antoine [02:16:55] (Y): "if we can’t verify it, we say so plainly and let the guest decide."<br>Sofia L74 (S): "telling me the dish couldn’t be confirmed safe" | G-39 <br>from E G-87; S G-82; Y G-43 | _TBD_ | _TBD_ |
| **REQ-12** [MUST]: Kitchen status (and reason) shown on the tablet within 5 seconds | Sofia [19:05:13] (Y): "I’d want a clear status such as “allergy received by the kitchen,”"<br>Sofia L27 (S): "whether someone in the kitchen has actually read it" | G-41 <br>from E G-85; S G-83; Y G-84 | _TBD_ | _TBD_ |
| **REQ-13** [MUST]: "Confirmed" never shown on the tablet unless the status is Confirmed | Sofia L82 (S): "the order shouldn’t be presented as confirmed until someone responsible in the kitchen ackno..." | G-43 <br>from E G-85; S G-88 | _TBD_ | _TBD_ |
| **REQ-14** [MUST]: "Sign off" saves sign-off and time; offered only for Confirmed items | Antoine [02:21:10] (Y): "confirm the final plate check"<br>Antoine [02:21:10] (Y): "Before marking it complete, the cook checks the allergen details against the" | G-50 <br>from E G-31, G-32; S G-43, G-44; Y G-17, G-18 | _TBD_ | _TBD_ |
| **REQ-15** [MUST]: "OK to serve" shown iff the item is signed off | Kayla [01:13:16] (Y): "I’d want some kind of clear signal on the tablet that it’s been checked and is okay to"<br>Kayla L121 (S): "if they haven’t acknowledged it yet, I should know that before I run the plate" | G-51 <br>from S G-21; Y G-70, G-101, G-102 | _TBD_ | _TBD_ |
| **REQ-16** [MUST]: Missing/unverified dish info labelled "Cannot confirm" | Antoine [02:10:52] (Y): "and I update the dish record before service."<br>Sofia L78 (S): "the system should show when information is missing or hasn’t been confirmed" | G-70 <br>from E G-20, G-16; S G-89, G-58; Y G-31 | _TBD_ | _TBD_ |
| **REQ-17** [MUST]: One allergen recorded in ≤4 taps, no extra screen or typing, within 10 s | Kayla [01:07:53] (Y): "instead of making me run to the kitchen for every question."<br>Kayla [01:09:53] (Y): "Right, that’d save me a lot of time." | G-84 <br>from E G-62, G-63, G-45; S G-29; Y G-71, G-72 | _TBD_ | _TBD_ |
| **REQ-18** [SHOULD]: Preference-only severity handled as a normal modification | Kayla L64 (S): "the kitchen needs to treat those situations differently"<br>_★ Not stated directly; refinement or conflict resolution_ | G-13 ★<br>from E G-61; S G-14 | _TBD_ | _TBD_ |
| **REQ-19** [SHOULD]: Existing dishes rechecked when an allergy is added later | **No transcript evidence yet** (see Open evidence gaps) | G-17 <br>from E G-57 | _TBD_ | _TBD_ |
| **REQ-20** [SHOULD]: Only chef-approved changes offered for a flagged dish | Kayla [01:06:52] (Y): "checked the dishes for peanuts and cross-contact notes"<br>_★ Not stated directly; refinement or conflict resolution_ | G-25 ★<br>from E G-93, G-55, G-54; Y G-55 | _TBD_ | _TBD_ |
| **REQ-21** [SHOULD]: One sound per allergy ticket; label flashes after 60 s unacknowledged | Antoine [02:18:40] (Y): "A ticket should also become more prominent if nobody acknowledges it after a"<br>Antoine [02:18:40] (Y): "push an alert for a new allergy order, a server changing or cancelling one, or a"<br>_★ Not stated directly; refinement or conflict resolution_ | G-33 ★<br>from E G-96; S G-98; Y G-10, G-46 | _TBD_ | _TBD_ |
| **REQ-22** [SHOULD]: Allergy item cannot be cleared before sign-off | **No transcript evidence yet** (see Open evidence gaps)<br>_★ Not stated directly; refinement or conflict resolution_ | G-53 ★<br>from E G-26, G-27, G-33 | _TBD_ | _TBD_ |

### Assumption (not built; mock data stands in)

| Goal | Interview Evidence | Goal Model Reference | How V1 handles it |
|---|---|---|---|
| A-1: one allergen record per dish, read by both screens | Antoine L59 (S): "the server needs to see the same information as the kitchen" | G-63 <br>from E G-6, G-86, G-17, G-68; S G-54 | Both screens import the same mock `dishes.ts` |

## Version 2

| Requirement | Change from V1 | Code / Implementation | V1 Status | V2 Status |
|---|---|---|---|---|
| _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ |

## Open evidence gaps

- REQ-19 (G-17) and REQ-22 (G-53) come only from Ethan's Assignment 2 model, which has no transcript references. Both are SHOULD.
- REQ-12's 5-second limit is the team's own number (spec A-6); no stakeholder gave a time.

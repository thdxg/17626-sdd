# Learning Log

## 1. Sprint Planning and Requirements Selection

We chose taking allergy order from the table to the kitchen and serving the order back as our sprint scenario. We chose it for the following reasons. First, it is core because the whole system is mainly about carrying a guest's allergen request to the kitchen, so this is most of the goals about. Second, it is user-facing because the server and kitchen staffs' tasks are both mainly involved in this sprint scenario. Third, it is uncertain because we did not know if our goals really help them at the beginning. For example, we did not know if a "Not confirmed" label really helps Kayla. So building it first tells us more unknown information.

Also, some of the goals are not included in the sprint. First, changes after the order is sent are important, but they need an order to exist first, so this is outside our scenario. Second, updating the dish records is not involved in the ordering or serving process, so we should use mock data for it. Third, the guest's menu app is a different agent than the order managing system used by the server or chef.

In general, we combined our models with 231 goals to 88 goals. Then we narrowed down the goals to 22, with 17 MUST and 5 SHOULD requirements. And combining the goal model helped us in three ways. First, it showed overlaps, so we knew the goals that should be merged. Second, it showed the order of the steps, so it help us list the dependencies clearly. Third, the conflicts help us realize the real needs of different stakeholders. Finally, we solved 6 conflicts in the sprint. And left 2 unresolved, because we need more information to make the decisions. 

## 2. Prototype Evaluation

We tested V1 (commit `53c5965`) on 11/17 by running the two-tab walkthrough: one tab as the server's tablet and one as the kitchen display, with a tree-nut allergy seat. We found six things, O-01 to O-06. None of them were code defects. Five were requirements issues, where the problem was in the spec. We fixed four of them in V2 (see Section 3) and left O-03 open. O-05 looked like a problem at first, but we decided it was intended behaviour.

1. O-01: The kitchen could confirm a walnut salad for a tree-nut seat, and the tablet then showed "OK to serve". REQ-10 never said the kitchen can't confirm a dish with the guest's allergen, because we assumed the kitchen would catch it. But Antoine and Sofia both want the kitchen to say plainly when something can't be verified, so this rule needs to be in the system, not just in the cook's head.

2. O-02: The server recorded "traces", but the kitchen ticket never showed it. REQ-06 just didn't list it. Sofia's worry about trace exposure is really for the cooks, not the server, so we had put the information on the wrong screen.

3. O-03: For an allergy seat, almost every dish says "Not confirmed". This is what REQ-05 asks for, and it comes from C-1: Kayla wants a "safe" label, but Sofia says nothing is safe until the kitchen checks it. We still don't want to show "safe". But seeing the whole menu say "Not confirmed" made us realize the label may not help Kayla at all, and she might just stop reading it. We can't answer this from the transcripts, so we kept it as an open question to ask Kayla. It showed us that a conflict can look resolved on paper while one stakeholder still pays the cost.

4. O-04: Chef-approved changes like "Without walnuts" were only shown as text. The server couldn't pick one and the kitchen never saw it. REQ-20 only said to "offer" them, so we read Kayla too literally. She wanted something she could actually offer the guest and send with the order.

5. O-05: A seat with only a "preference" is sent as a normal order, and the kitchen doesn't see the preference. At first this looked like the same problem as O-02. But REQ-18 says a preference should be handled as a normal modification, because a preference doesn't need a kitchen check. Flagging preferences would also add more alerts, which Antoine said makes cooks ignore them. So we decided it was intended. No stakeholder said this directly, though. REQ-18 is our own refinement, so it's a judgment call we should confirm with Antoine. It also reminded us that everything depends on the server choosing the right severity.

6. O-06: The allergy ticket dropped back among the normal tickets after "Acknowledge". REQ-08 said "until acknowledged", so the code was right. But when we reread the interview, Antoine meant the expediter's acknowledgment at the end, not our "Acknowledge" button at the start. Same word, different meaning.

Overall, all of our tests passed, so we would not have found any of these by testing alone. We found them by walking through a real order and comparing it with what the stakeholders said. Most of the issues were on the kitchen side, which told us we had focused on what the server records and not enough on what the kitchen needs to see.

## 3. Revisions and Learning

We found four requirements issues from v1. The followings are the four revisions. We revised the spec and goal model, then implemented the updated code.

1. Traces should also be shown in kitchen (REQ-06, G-30)
   In v1, the server recorded the traces, but only the server's tablet would show it. However, the kitchen is actually the one that handles most of the cross stage communication, so it needs the trace the most. Now each allergy item on the kitchen ticket shows the trace. So Sofia’s need on allergen trace now can be viewed by the people who cook her food.

2. The kitchen should not confirm a dish with the customer's allergen (REQ-10, new G-89)
   In V1, the server could send a dish that shows “Contains”, and we thought the kitchen's review would catch it. But in some test cases, it did not. For example, a nuts salad for a customer with a nut allergy was confirmed and can be accidentally served. So the kitchen shouldn't confirm a dish that contains the customer’s allergen. The kitchen staff can only tap “cannot confirm”. This is more likely to work when the kitchen is busy. Because the kitchen cannot accidentally confirm a allergen. 

3. The server should be able to use a chef-approved change (REQ-20, G-25)
   In V1, this was SHOULD, but the tablet only showed the chef-approved allergen customized changes, the server can't use them. So the server in fact could not pick one. So, the kitchen would never see the change request. Now REQ-20 is MUST. The server picks one change approved, like "Without nuts", and the kitchen ticket shows it. But the kitchen still can't confirm the dish with approved change, because the record only says the change is approved not the dish is fully safe. For example, the salad may still touch the same cutting board with nuts. We chose this small version to avoid weakening revision 2. This is our unresolved tradeoff, it's documented in goal model as conflict C-12.

4. The allergy ticket should stay on top after acknowledged (REQ-08, G-32)
   In v1, the allergy ticket stayed on top until it's acknowledged. After that, it dropped and mixed with the other normal tickets. However, acknowledge can only indicate that the kitchen saw the ticket, it does not imply that the allergen is solved. We still need it be signed off by the expediter, so it should be easy to track and review. Also, based on the interview, we think Antoine meant that it should be prominent until the expediter signing off it. Additionally, this could lead to our O-1, AllergyTicketMissedOrClearedDuringRush in the goal model. The allergen could be unsolved when the kitchen is busy. Now the ticket stays above normal tickets until every allergy is signed off or marked as Cannot confirm. It's now easier for kitchen to review the orders.
<!-- ### Prototype changes -->

<!-- For each change, we updated the spec first, then the plan and tasks (Phase 11 of `tasks.md`), then wrote failing tests, then changed the code. V1 is commit `53c5965` and V2 is the `v2` tag. The numbers follow the list above. -->

<!-- 1. **Traces (REQ-06, observation O-02).** The trace setting was already stored in the allergy snapshot, but `kitchenItemText` never printed it. It now adds "Traces: yes" or "Traces: no" after the severity, using the same `tracesLabel` helper as the tablet, so both screens use the same words. If a seat's allergies disagree, I chose "yes", the stricter reading. -->

<!-- 2. **No "Confirm" for a listed allergen (REQ-10, observation O-01).** `offeredActions` no longer offers "Confirm" when the dish lists an allergen from the snapshot taken at send. The `confirm` reducer re-checks `offeredActions`, so a stale tap on an old button does nothing. I used the snapshot, not the seat's current allergies, because that is what the kitchen sees. I also counted every severity, because the stricter reading only matters on a seat that is already an allergy order. A round-trip test checks SC-008. -->

<!-- 3. **Chef-approved change (REQ-20, observation O-04).** Order items have a new `pickedChange` field. On a draft item that shows "Contains", the server taps one approved change, and tapping it again clears it. Both screens show "Chef-approved change: <text>". `pickChange` only accepts text from the chef's list, and `sendOrder` drops a change that no longer applies, for example if the allergy was removed before sending. Because the data shape changed, `schemaVersion` went to 2, so a tab still holding V1 data reloads fresh data instead of breaking. A test checks that a picked change does not bring "Confirm" back (C-12). -->

<!-- 4. **Ticket order (REQ-08).** `sortTickets` now has three ranks: not acknowledged, acknowledged with an open allergy item, and everything else. An item is open until it is signed off or marked "Cannot confirm". I did not add a label for the middle rank, because the spec does not name one and each item already shows its own status. -->

<!-- **How I checked it.** All V1 tests still pass except the two that asserted the old behaviour (the ticket dropping back after "Acknowledge", and REQ-20 as text only), which commit `eaea1f2` replaces. The suite went from 202 to 241 tests, and lint and build pass. I then did the two-tab walkthrough from `quickstart.md` on the V2 URL. V1 and V2 stay on separate URLs, so they can be compared side by side. -->

### Reflection

**1. Which decisions required your judgment rather than relying solely on AI?**

When we were working on our v2 update, we decided whether to make it available for the server to use the chef's approved change for the allergen when ordering. We decided whether to let the server use it and not modify the procedure after that (fully trust this approval) or whether we should have a guard; we decided we should not fully trust it cause, it does not guarantee that other allergens outside the approval are satisfied

**2. How did prototyping change your understanding of stakeholder needs?**

It helped us understand that we can't fully satisfy all three stakeholders' needs. Because some of them are actually in conflict with each other. So, in the process, we went back to the transcript and evaluated the stakeholders' needs and priorities. For example, in C-2, the customer wants every single detail of their allergen to be recorded; however, the server wants to avoid complicated typing. In this case, we have to go back to the transcript to analyze it more deeply and understand what the stakeholders really mean; they might have priorities. Like here, actually, the server's priority is not that she does not want to record the details, but she does not want the recording to slow her down when ordering.

**3. How did spec-driven development help maintain consistency between the requirements and implementation?**

In the spec, we wrote the requirements in detail, including test cases and different scenarios. And we use this spec to develop the code, so when we implement, we can use the exact scenario to check, since it's documented. And we can do this by versioned each interation of the spec, make sure that the specifications are well documanted. And spec is also acting as a source of truth for validating the implementation, whcih we can check if spec and code are align.

**4. What evidence from your work would you present to management to demonstrate the value you contributed beyond AI-generated specifications and code?**

Have the same example in Question 2; this is actually a logic bug, and for AI it might tend to satisfy all aspects by trying to add more features to make everything look perfect, but it's actually over-engineering, which could lead to extra cost for development and maintenance, so with humans, we can distinguish which defects are defects that can be tolerated, which do not need to be perfect, and thus can be done in a simpler way and do not harm the requirements

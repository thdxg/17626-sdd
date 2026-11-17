"""
Team goal model (Assignment 3, Step 1-2): merges the three Assignment 2 combined models
  E = goal_model_combined_ethan.py
  S = goal_model_combined_steven.py
  Y = goal_model_combined_yuting.py
Stakeholders: Antoine (head chef), Kayla (server), Sofia (guest with a severe peanut/tree-nut allergy).

ID RANGES (numbered top-down in tree order, area by area)
  G-1..G-5      Top-level goals
  G-6..G-19     Recording the allergy
  G-20..G-28    Checking dishes before ordering
  G-29..G-36    The kitchen notices the ticket
  G-37..G-44    Kitchen review and status
  G-45..G-48    Preparation at the station
  G-49..G-53    Release at the pass
  G-54..G-58    Changes after the order is sent
  G-59..G-61    No connection
  G-62..G-71    Dish allergen records
  G-72..G-76    Guest-facing
  G-77..G-82    Privacy
  G-83..G-88    Non-functional and soft goals

Graph Info (Mermaid)
  thick green border  = in the sprint scope (MUST or SHOULD), built in Prototype V1
  thin green border   = human step inside the in-scope flow (environment agent, not built)
  dashed green border = assumed true in the sprint (assumption A-1), not built
  grey text           = outside the sprint scope (kept in the model, deferred)
  yellow fill         = not stated in any transcript (refinement pattern, heuristic or conflict resolution)
  yellow + dashed     = a sprint assumption from the spec (A-3 to A-6), drawn as a domain hypothesis
"""

from goalmodeling.schema import *

# ----------------------------------------------------------------------------- agents
TABLET = "Server Tablet"           # E: Ordering Tablet | S: OrderingSystem | Y: ServerHandheld
KDS = "Kitchen Display System"     # E: KDS | S: KitchenDisplay | Y: KitchenDisplaySystem
REC = "Dish Record System"         # E: Allergen Record System | Y: DishRecordSystem
WEB = "Guest Menu App"             # E: Online Menu | Y: GuestMenuApp
SERVER, GUEST = "Server", "Guest"
LEAD = "Station Lead"              # S: StationLead | Y: LineCook | E: Chef de Partie
PASS = "Expediter"                 # S/Y: Expediter; E: Head Chef signs off (see decision D-7)
HEAD = "Head Chef"
SOFTWARE = {TABLET, KDS, REC, WEB}

META = {}       # "G-n" -> {"goal", "src", "ev", "scope", "tacit"}


def by(agent):
    kind = AgentType.SOFTWARE_AGENT if agent in SOFTWARE else AgentType.ENVIRONMENT_AGENT
    return [PerformanceLink(Agent(agent, kind), None)]


def reg(goal, src, ev="", scope="OUT", tacit=False):
    """Register traceability metadata. scope: MUST | SHOULD | ENV | ASSUME | PARENT | OUT."""
    gid = goal.name.split(":")[0]
    META[gid] = dict(goal=goal, src=src, ev=ev, scope=scope, tacit=tacit)
    return goal


# =============================================================================
# 1. CAPTURING THE ALLERGY  (Kayla, Sofia, Antoine)
# =============================================================================
g7 = reg(AchieveGoal("G-7: AllergyStatedToServer <b>If</b> GuestSeated", performs=by(GUEST), leaf=True),
          "Y G-80; E G-88", "Y: S[19:06:56]", "ENV")
g8 = reg(AchieveGoal("G-8: AllergyEnteredByServer <b>Before</b> RestOfTableOrdered", performs=by(SERVER), leaf=True),
          "E G-50; S G-2 (note); Y G-5", "S: Kayla L24 | Y: K[01:05:42], A[02:13:19]", "ENV")
g16 = reg(AchieveGoal("G-16: AllergyEnteredByGuestOnTablet <b>If</b> PromptedBeforeOrderSent",
                      performs=by(GUEST), leaf=True),
          "S G-78, G-79, G-80; Y G-79", "S: Sofia L60, L63 | Y: S[19:06:56]", "OUT")
g9 = reg(AchieveGoal("G-9: AllergensSeverityAndTraceSensitivityChosenFromStructuredList",
                      performs=by(TABLET), leaf=True),
          "E G-95, G-74; S G-10, G-76; Y G-5", "S: Kayla L86, Sofia L21 | Y: A[02:13:19]", "MUST", tacit=True)
g10 = reg(MaintainGoal("G-10: AllergyAttachedToSeatAndEachOrderItem", performs=by(TABLET), leaf=True),
          "E G-46, G-47, G-42; S G-9; Y G-52, G-105, G-106", "S: Kayla L58, L60, L130 | Y: K[01:08:28], K[01:11:33]", "MUST")
g12 = reg(AchieveGoal("G-12: HandledAsAllergyOrder <b>If</b> SevereAllergy <b>Or</b> Intolerance <b>Or</b> SeverityUnknown",
                      performs=by(TABLET), leaf=True),
          "E G-60; S G-13, G-15", "S: Kayla L68, L116", "MUST")
g13 = reg(AchieveGoal("G-13: HandledAsOrdinaryModification <b>If</b> PreferenceOnly", performs=by(TABLET), leaf=True),
          "E G-61; S G-14", "S: Kayla L64", "SHOULD", tacit=True)
dp_sev = DomainProperty("Each restriction is a SevereAllergy, Intolerance, Preference or Unknown", leaf=True)
g14 = reg(AchieveGoal("G-14: SeverityClarifiedWithGuest <b>If</b> GuestUnsure", performs=by(SERVER), leaf=True),
          "S G-11", "S: Kayla L64, L68", "ENV")
hyp_a5 = DomainProperty("A-5: An intolerance or an unknown severity is handled like a severe allergy until the stakeholders answer (C-7)", leaf=True)
g11 = reg(AchieveGoal("G-11: RestrictionHandledPerSeverity <b>If</b> GuestMentionsRestriction",
                      refinements=[Refinement(True, [g12, g13, g14, dp_sev, hyp_a5], "P3")]),
          "E G-58, G-59; S G-10", "S: Kayla L86", "PARENT")
g15 = reg(AchieveGoal("G-15: AllergyRepeatedBackByServer <b>If</b> AllergyRecorded", performs=by(SERVER), leaf=True),
          "E G-25; S G-77; Y G-81", "S: Sofia L27 | Y: S[19:06:56], S[19:00:32]", "ENV")
g17 = reg(AchieveGoal("G-17: ChosenDishesRechecked <b>If</b> AllergyAddedAfterDishChosen", performs=by(TABLET), leaf=True),
          "E G-57", "", "SHOULD")
g18 = reg(AchieveGoal("G-18: AllergyMovedWithGuest <b>If</b> GuestChangesSeat", performs=by(TABLET), leaf=True),
          "E G-49", "", "OUT", tacit=True)
g19 = reg(MaintainGoal("G-19: UnsentAllergyNoteRecoverable <b>If</b> DeviceFails", performs=by(TABLET), leaf=True),
          "S G-12, G-26, G-27", "S: Kayla L27, L46, L54", "OUT")

# OR-refinement: the server enters the allergy (chosen for the sprint) or the guest enters it (deferred) - C-9
g6 = reg(AchieveGoal("G-6: AllergyAndSeverityRecordedForSeat <b>If</b> GuestDisclosesAllergy",
                      refinements=[Refinement(False, [g7, g8, g9, g10, g11, g15, g18, g19], "H5"),
                                   Refinement(False, [g16, g9, g10, g11, g15], "H7")]),
          "E G-74; S G-4; Y G-78", "S: Kayla L58, L60 | Y: S[19:06:56]", "PARENT")

# =============================================================================
# 2. CHECKING DISHES BEFORE PROMISING THE GUEST  (Kayla vs Sofia, Antoine)
# =============================================================================
# Merged in the sprint review: the converse "no flag if no conflict" (E G-56, H9) is folded into Iff
g22 = reg(MaintainGoal("G-22: DishFlagged <b>Iff</b> DishConflictsWithRecordedAllergy", performs=by(TABLET), leaf=True),
          "E G-51, G-56; Y G-55", "Y: K[01:10:40], K[01:12:19], A[02:16:55]", "MUST")
g23 = reg(AchieveGoal("G-23: NonConflictingDishesShownAsUnconfirmedCandidates", performs=by(TABLET), leaf=True),
          "S G-16 (weakened); Y G-60 (weakened, see C-1); E G-51", "S: Kayla L12, L38, L100 | Y: K[01:06:52]", "MUST")
g25 = reg(AchieveGoal("G-25: OnlyChefPreApprovedModificationsOffered <b>If</b> DishFlagged",
                      performs=by(TABLET), leaf=True),
          "E G-93, G-55, G-54; Y G-55", "S: Kayla L38 | Y: K[01:07:53]", "SHOULD", tacit=True)
g64 = reg(AchieveGoal("G-64: RecordRevisedByAuthorizedChef <b>If</b> SupplierRecipeOrEquipmentChanges",
                      performs=by(HEAD), leaf=True),
          "E G-7, G-10..G-13, G-82; S G-55, G-56; Y G-31, G-47", "S: Antoine L53, L62 | Y: A[02:08:48], A[02:10:52]", "OUT")
g24 = reg(AchieveGoal("G-24: ModificationSafetyDecidedByChef <b>If</b> DishModifiedForAllergy",
                      refinements=[Refinement(False, [g25, g64], "H8 H11")]),
          "E G-65", "", "PARENT")
g21 = reg(AchieveGoal("G-21: DishCheckedOnTablet <b>If</b> DishInfoClear",
                      refinements=[Refinement(False, [g22, g23, g24, g17], "H7")]),
          "Y G-55; S G-5; E G-43", "S: Kayla L12 | Y: K[01:07:53]", "PARENT")
g27 = reg(AchieveGoal("G-27: QuestionSentToChefViaTabletAndItemHeld <b>Until</b> KitchenAnswers",
                      performs=by(TABLET), leaf=True),
          "Y G-40, G-42, G-64, G-103, G-104", "Y: A[02:20:25], K[01:07:53], K[01:08:28], K[01:11:33]", "OUT")
g28 = reg(AchieveGoal("G-28: ChefAskedInPerson <b>If</b> DishInfoUnclear <b>And</b> (Rush <b>Or</b> SevereAllergy)",
                      performs=by(SERVER), leaf=True),
          "Y G-41; S G-70", "Y: A[02:20:25], K[01:06:08] | S: Sofia L19", "OUT")
g26 = reg(AchieveGoal("G-26: KitchenAnswerObtained <b>Before</b> PromisingGuest <b>If</b> DishInfoUnclear",
                      refinements=[Refinement(False, [g27, g28], "H5")]),
          "Y G-39; S G-70; E G-87", "Y: A[02:16:55], K[01:05:42], S[19:00:32]", "OUT")
dp_clear = DomainProperty("DishInfoClear <b>Or</b> DishInfoUnclear", leaf=True)
g20 = reg(AchieveGoal("G-20: DishSafetyDetermined <b>Before</b> PromisingGuest <b>If</b> AllergyRecorded",
                      refinements=[Refinement(True, [g21, g26, dp_clear], "P3")]),
          "E G-43, G-52, G-53; S G-5; Y G-54", "Y: K[01:05:42] | S: Kayla L12", "PARENT")

# =============================================================================
# 3. GETTING THE KITCHEN TO NOTICE THE ALLERGY ORDER  (Antoine, Kayla)
# =============================================================================
g30 = reg(AchieveGoal("G-30: AllergenSeverityAndSeatNamedPlainlyOnTicketItem", performs=by(KDS), leaf=True),
          "E G-23; S G-36; Y G-6, G-4", "S: Antoine L66 | Y: A[02:07:16], A[02:08:15]", "MUST")
g31 = reg(AchieveGoal("G-31: CrossContactWarningShownOnTicket <b>If</b> DishUsesSharedFryerBaseOrUtensil",
                      performs=by(KDS), leaf=True),
          "E G-30; S G-39, G-40; Y G-6", "S: Antoine L30, L76 | Y: A[02:10:16]", "MUST")
g32 = reg(MaintainGoal("G-32: AllergyTicketVisuallyProminent <b>Unless</b> Acknowledged", performs=by(KDS), leaf=True),
          "E G-22, G-24; S G-38; Y G-10", "S: Antoine L73 | Y: A[02:08:15], A[02:18:40]", "MUST")
g33 = reg(AchieveGoal("G-33: OneSoundPerAllergyTicketAndEscalation <b>Only If</b> UnacknowledgedPastThreshold",
                      performs=by(KDS), leaf=True),
          "E G-96; S G-98; Y G-10, G-46", "S: Antoine L30, L113 | Y: A[02:18:40]", "SHOULD", tacit=True)
g34 = reg(AchieveGoal("G-34: AllergyTicketAcknowledgedOnKDS <b>If</b> AllergyTicketDisplayed",
                      performs=by(LEAD), leaf=True),
          "Y G-8; S G-83 (acknowledge part)", "Y: A[02:21:10] | S: Sofia L27, Kayla L121", "MUST")
g35 = reg(AchieveGoal("G-35: CallOutRepeatedBackByStationLead", performs=by(LEAD), leaf=True),
          "S G-37", "S: Antoine L87", "ENV")
g36 = reg(AchieveGoal("G-36: IngredientsSharedBasesAndEquipmentChecked <b>Before</b> Acknowledging",
                      performs=by(LEAD), leaf=True),
          "Y G-11; S G-33, G-39, G-40", "Y: A[02:12:21] | S: Antoine L30, L76", "ENV")
hyp_a4 = DomainProperty("A-4: The kitchen waits 60 seconds before an unacknowledged ticket gets louder", leaf=True)
g29 = reg(AchieveGoal("G-29: AllergyOrderNoticedByKitchen <b>If</b> AllergyOrderSent",
                      refinements=[Refinement(True, [g30, g31, g32, g33, g34, g35, g36, hyp_a4], "H4 H11")]),
          "E G-3; S G-6, G-32; Y G-4, G-8", "S: Kayla L15, Antoine L30 | Y: A[02:07:16]", "PARENT")

# =============================================================================
# 4. KITCHEN REVIEW AND STATUS BACK TO THE SERVER  (Sofia, Kayla, Antoine)
# =============================================================================
g38 = reg(AchieveGoal("G-38: DishConfirmedWithReviewerAndTime <b>If</b> PreparationVerifiedSafe",
                      performs=by(LEAD), leaf=True),
          "E G-83, G-94; S G-81, G-84; Y G-42, G-84", "S: Sofia L80, L82 | Y: S[19:05:13], A[02:17:49]", "MUST")
g39 = reg(AchieveGoal("G-39: DishRejectedWithReason <b>If</b> SafetyCannotBeConfirmed", performs=by(LEAD), leaf=True),
          "S G-82; Y G-43; E G-87", "S: Sofia L74, L78 | Y: A[02:16:55]", "MUST")
dp_rev = DomainProperty("Each reviewed dish is VerifiedSafe <b>Or</b> CannotBeConfirmed", leaf=True)
hyp_a3 = DomainProperty("A-3: The reviewer name is the role picked from a menu. There is no real login", leaf=True)
g37 = reg(AchieveGoal("G-37: DishConfirmedOrRejectedByKitchen <b>If</b> AllergyTicketAcknowledged",
                      refinements=[Refinement(True, [g38, g39, dp_rev, hyp_a3], "P3")]),
          "S G-67; E G-83, G-73; Y G-42, G-82", "S: Sofia L82", "PARENT")
g41 = reg(MaintainGoal("G-41: KitchenStatusShownPerItemOnTablet", performs=by(TABLET), leaf=True),
          "E G-85; S G-83 (shown to server); Y G-84", "S: Kayla L121 | Y: S[19:05:13]", "MUST")
g42 = reg(AchieveGoal("G-42: OnlyConfirmedStatusRelayedToGuest", performs=by(SERVER), leaf=True),
          "E G-84; Y G-43; S G-95", "Y: A[02:16:55], S[19:00:32] | S: Sofia L72", "ENV")
g43 = reg(AvoidGoal("G-43: DishShownConfirmed <b>If</b> KitchenNotReviewed", performs=by(TABLET), leaf=True),
          "S G-88; E G-85", "S: Sofia L82", "MUST")
hyp_a6 = DomainProperty("A-6: A kitchen status change reaches the tablet within 5 seconds", leaf=True)
g40 = reg(AchieveGoal("G-40: KitchenConfirmationVisibleToServerAndGuest <b>If</b> AllergyOrderPlaced",
                      refinements=[Refinement(False, [g41, g42, g43, hyp_a6], "H5")]),
          "E G-73; S G-85; Y G-84", "S: Sofia L70 | Y: S[19:05:13]", "PARENT")
g44 = reg(AchieveGoal("G-44: KitchenReviewedDish <b>Before</b> GuestOrders", performs=by(LEAD), leaf=True),
          "Y G-82", "Y: S[19:08:57]", "OUT")

# =============================================================================
# 5. PREPARATION AND RELEASE AT THE PASS  (Antoine, Kayla)
# =============================================================================
dp_risk = DomainProperty("HighRiskOrder <b>Iff</b> SevereAllergy <b>Or</b> SeriousCrossContactRisk", leaf=True)
g46 = reg(AchieveGoal("G-46: CleanDedicatedEquipmentReadied <b>If</b> HighRiskOrder", performs=by(HEAD), leaf=True),
          "Y G-99; E G-28", "Y: A[02:13:56]", "OUT", tacit=True)
g47 = reg(AchieveGoal("G-47: DedicatedEquipmentUsedAndPlatedSeparately <b>If</b> EquipmentReady",
                      performs=by(LEAD), leaf=True),
          "E G-28, G-29; S G-34, G-42; Y G-100", "S: Antoine L35 | Y: A[02:12:21]", "OUT")
g48 = reg(AchieveGoal("G-48: DedicatedEquipmentUseConfirmedOnKDS <b>Before</b> DishSent",
                      performs=by(KDS), leaf=True),
          "S G-41", "S: Antoine L35", "OUT")
g45 = reg(AvoidGoal("G-45: CrossContactDuringAllergyPrep",
                    refinements=[Refinement(True, [dp_risk, g46, g47, g48], "P7")]),
          "E G-4; S G-31, G-34; Y G-12", "S: Antoine L35, L103 | Y: A[02:21:10]", "OUT")

g50 = reg(AchieveGoal("G-50: PassSignOffRecordedOnKDS <b>If</b> PlateCheckedAgainstSeatTicket",
                      performs=by(PASS), leaf=True),
          "E G-31, G-32; S G-43, G-44; Y G-17, G-18", "S: Antoine L14, L21 | Y: A[02:21:10]", "MUST")
g51 = reg(MaintainGoal("G-51: OkToServeShownOnTablet <b>Iff</b> PassSignOffRecorded", performs=by(TABLET), leaf=True),
          "Y G-70, G-101, G-102; S G-21", "Y: K[01:13:16], A[02:11:46] | S: Kayla L121", "MUST")
g52 = reg(MaintainGoal("G-52: PlateHeldAtPass <b>Unless</b> OkToServeShown", performs=by(SERVER), leaf=True),
          "S G-22; E G-33", "S: Kayla L121", "ENV", tacit=True)
g53 = reg(AvoidGoal("G-53: AllergyFlagCleared <b>If</b> NoPassSignOff", performs=by(KDS), leaf=True),
          "E G-26, G-27, G-33", "", "SHOULD", tacit=True)
g49 = reg(AchieveGoal("G-49: AllergyPlateReleased <b>Only If</b> SignedOffAtPass",
                      refinements=[Refinement(True, [g50, g51, g52, g53], "P4")]),
          "E G-5; S G-35, G-8; Y G-16, G-20", "S: Antoine L14, L21 | Y: A[02:07:16]", "PARENT")

# =============================================================================
# 6. CHANGES AFTER SEND, OFFLINE FALLBACK  (Antoine, Kayla) - deferred
# =============================================================================
g55 = reg(AchieveGoal("G-55: OldTicketReplacedAndChangeHighlighted <b>If</b> OrderChangedAfterSend",
                      performs=by(KDS), leaf=True),
          "S G-46, G-47; E G-22, G-44; Y G-34, G-44", "S: Antoine L45 | Y: A[02:18:40], A[02:15:43]", "OUT")
g56 = reg(MaintainGoal("G-56: AllergyLinkPreserved <b>If</b> OrderModifiedAfterSend", performs=by(TABLET), leaf=True),
          "E G-48", "", "OUT")
g57 = reg(AchieveGoal("G-57: ChangedDishReleased <b>Only If</b> ChangeReacknowledged", performs=by(PASS), leaf=True),
          "S G-49", "S: Antoine L93", "OUT")
g58 = reg(AchieveGoal("G-58: PreparationStoppedAndPlateRemade <b>If</b> ChangedAfterPrepStarted",
                      performs=by(HEAD), leaf=True),
          "S G-48", "S: Antoine L49", "OUT")
g54 = reg(AvoidGoal("G-54: StaleAllergyTicketFollowed",
                    refinements=[Refinement(False, [g55, g56, g57, g58], "H8")]),
          "S G-45, G-3; E G-22; Y G-34", "S: Antoine L107, Kayla L81", "OUT")

g60 = reg(AchieveGoal("G-60: OfflineWarningAndLastAllergenUpdateShown <b>If</b> DevicesDisconnected",
                      performs=by(KDS), leaf=True),
          "Y G-24, G-25", "Y: A[02:19:11], A[02:19:47]", "OUT")
g61 = reg(AchieveGoal("G-61: VerbalAndPaperAllergyProtocolUsed <b>If</b> OfflineWarningShown",
                      performs=by(HEAD), leaf=True),
          "Y G-26", "Y: A[02:19:47]", "OUT")
g59 = reg(AchieveGoal("G-59: AllergyOrderHandledOnPaper <b>If</b> DevicesDisconnected",
                      refinements=[Refinement(True, [g60, g61], "H4")]),
          "Y G-23", "Y: A[02:19:47]", "OUT")

# =============================================================================
# 7. ALLERGEN RECORDS  (Antoine, Sofia) - mock data in the sprint
# =============================================================================
g63 = reg(MaintainGoal("G-63: OneAllergenRecordPerDishReadByServerAndKitchen", performs=by(REC), leaf=True),
          "E G-6, G-86, G-17, G-68; S G-54", "S: Antoine L59", "ASSUME")
g65 = reg(AchieveGoal("G-65: RecordChangePropagatedQuietly <b>Unless</b> ActiveAllergyOrderAffected",
                      performs=by(REC), leaf=True),
          "S G-52; E G-14; Y G-32, G-33, G-34", "S: Antoine L53 | Y: A[02:18:40]", "OUT")
g66 = reg(AchieveGoal("G-66: SpecialOrderable <b>Only If</b> AllergenInfoApprovedBeforeService",
                      performs=by(TABLET), leaf=True),
          "E G-9, G-18, G-19; S G-53, G-59; Y G-31", "S: Antoine L53, L56 | Y: A[02:08:48]", "OUT")
g67 = reg(MaintainGoal("G-67: EditorAndLastVerifiedTimeRecorded", performs=by(REC), leaf=True),
          "E G-79, G-15; S G-75; Y G-35", "S: Sofia L9 | Y: A[02:21:52]", "OUT")
g68 = reg(AvoidGoal("G-68: UnauthorizedAllergenRecordEdit", performs=by(REC), leaf=True), "E G-21", "", "OUT")
g70 = reg(AchieveGoal("G-70: CannotConfirmStatusShown <b>If</b> DishAllergenInfoMissingOrUnverified",
                      performs=by(TABLET), leaf=True),
          "E G-20, G-16; S G-89, G-58; Y G-31", "S: Sofia L78, Antoine L59 | Y: A[02:17:49], S[19:04:30]", "MUST")
g69 = reg(AvoidGoal("G-69: UnapprovedAllergenInfoUsedInService",
                    refinements=[Refinement(False, [g70, g66], "H8")]),
          "E G-8", "", "PARENT")
g71 = reg(MaintainGoal("G-71: AllergenRecordsAvailableForInspection", performs=by(REC), leaf=True), "E G-36", "", "OUT")
g62 = reg(MaintainGoal("G-62: AllergenRecordsCurrentApprovedAndVerified",
                       refinements=[Refinement(False, [g63, g64, g65, g66, g67, g68, g69], "H4")]),
          "E G-2; S G-50, G-51; Y G-27", "S: Antoine L53 | Y: A[02:09:18]", "PARENT")

# =============================================================================
# 8. GUEST-FACING AND PRIVACY  (Sofia) - deferred except what the server relays
# =============================================================================
g73 = reg(AchieveGoal("G-73: AllergenFilteredMenuAvailableBeforeVisit", performs=by(WEB), leaf=True),
          "E G-70, G-75, G-76; S G-69, G-72; Y G-87", "S: Sofia L9, L56 | Y: S[19:06:56]", "OUT")
g74 = reg(AchieveGoal("G-74: CrossContactAndSubstitutionsDisclosedPerDishToGuest", performs=by(WEB), leaf=True),
          "E G-71, G-78, G-81; S G-73, G-71, G-74; Y G-87", "S: Sofia L9, L11, L15 | Y: S[19:02:12]", "OUT")
g75 = reg(AvoidGoal("G-75: UnverifiedReassuranceOrAllergenFreeClaim",
                    refinements=[Refinement(True, [g23, g43, g42], "H8")]),
          "Y G-93, G-43; S G-95; E G-87", "Y: S[19:00:32], S[18:59:53], A[02:15:43] | S: Sofia L72", "PARENT")
g76 = reg(AchieveGoal("G-76: OrderDecisionMadeByGuest <b>If</b> RiskAndKitchenStatusKnown", performs=by(GUEST), leaf=True),
          "Y G-92", "Y: S[19:06:56], S[19:04:30]", "ENV")
g72 = reg(AchieveGoal("G-72: InformedOrderingDecision <b>If</b> GuestHasSevereAllergy",
                      refinements=[Refinement(False, [g6, g73, g74, g40, g44, g75, g76], "P1 H4")]),
          "E G-67; S G-65; Y G-37", "S: Sofia L24 | Y: S[19:09:37], A[02:15:43]", "PARENT")

g78 = reg(AchieveGoal("G-78: ConsentObtained <b>Before</b> AllergyProfileSaved", performs=by(TABLET), leaf=True),
          "E G-89, G-90; S G-91; Y G-98", "S: Sofia L65 | Y: S[19:10:22]", "OUT")
g79 = reg(AchieveGoal("G-79: SavedDataAndRetentionDisclosed <b>Before</b> ConsentGiven", performs=by(WEB), leaf=True),
          "E G-92; S G-93", "S: Sofia L65", "OUT")
g80 = reg(MaintainGoal("G-80: OrderAllergyDataKeptOnlyForCurrentOrder <b>Unless</b> ConsentGiven",
                       performs=by(REC), leaf=True),
          "S G-97", "", "OUT", tacit=True)
g81 = reg(AchieveGoal("G-81: ProfileReviewedOrDeleted <b>If</b> GuestRequests", performs=by(REC), leaf=True),
          "E G-91", "", "OUT")
g82 = reg(AvoidGoal("G-82: AllergyInfoSharedBeyondFoodPreparation", performs=by(REC), leaf=True),
          "S G-92", "S: Sofia L65", "OUT")
g77 = reg(MaintainGoal("G-77: AllergyInfoConfidential",
                      refinements=[Refinement(False, [g78, g79, g80, g81, g82], "H3")]),
         "E G-69 (profile part); S G-90; Y G-98", "S: Sofia L65 | Y: S[19:10:22]", "OUT")

# =============================================================================
# 9. NON-FUNCTIONAL LEAVES AND SOFT GOALS
# =============================================================================
# Merged in the sprint review: "no extra screens or typing" (E G-63, Y G-71) is folded into the 4-tap goal
g84 = reg(AchieveGoal("G-84: AllergyRecordedWithin4TapsAnd10Seconds <b>Without</b> ExtraScreenOrRequiredTyping",
                       performs=by(TABLET), leaf=True),
           "E G-62, G-63, G-45; S G-29; Y G-71, G-72", "S: Kayla L86, L118 | Y: K[01:11:33]", "MUST")
g85 = reg(SoftGoal("G-85: Minimize[ServerTripsToKitchen]",
                    refinements=[Refinement(False, [g23, g41], "H6")]),
           "S G-28; Y G-71", "S: Kayla L104 | Y: K[01:07:53]", "PARENT")
g88 = reg(MaintainGoal("G-88: TabletBatteryLastsEveningShift", performs=by(TABLET), leaf=True), "E G-64", "", "OUT")
g87 = reg(SoftGoal("G-87: Minimize[SystemCost]", leaf=True), "E G-37", "", "OUT")

g83 = reg(SoftGoal("G-83: Minimize[AllergyHandlingTimeDuringRush]",
                  refinements=[Refinement(False, [g84, g85, g38], "H6 H7")]),
         "E G-34; S G-60, G-30; Y G-71", "S: Antoine L96, Kayla L104 | Y: K[01:11:33]", "PARENT")
g86 = reg(SoftGoal("G-86: Reduce[NonCriticalAlertNoise]",
                  refinements=[Refinement(False, [g33, g65], "H6")]),
         "E G-35; S G-61; Y G-45", "S: Antoine L30, L113 | Y: A[02:08:15]", "PARENT")
g5 = reg(SoftGoal("G-5: Increase[StaffTrustInAllergySystem]",
                  refinements=[Refinement(False, [g83, g86, g87, g88], "H6")]),
         "E G-39", "", "PARENT")
g4 = reg(SoftGoal("G-4: Increase[GuestTrustInAllergyHandling]",
                  refinements=[Refinement(False, [g72, g77], "H12")]),
         "E G-66, G-38; S G-87, G-94; Y G-97", "S: Sofia L3, L7 | Y: S[19:10:22]", "PARENT")

# =============================================================================
# ROOTS
# =============================================================================
g3 = reg(AchieveGoal("G-3: AllergySafePlateServed <b>If</b> AllergyDisclosedBeforeOrderSent",
                     refinements=[Refinement(True, [g6, g20, g29, g37, g40, g45, g49], "P1")]),
         "S G-2; Y G-2, G-3; E G-41, G-3, G-5", "S: Kayla L24 | Y: A[02:12:21]", "PARENT")
g2 = reg(AvoidGoal("G-2: AllergenServedToAllergicGuest",
                   refinements=[Refinement(False, [g62, g3, g54, g59], "H4 H8")]),
         "E G-1; S G-96, G-63; Y G-1, G-49, G-73", "S: (G-96 inferred) | Y: A[02:07:42], S[18:59:22]", "PARENT", tacit=True)
g1 = reg(SoftGoal("G-1: Improve[BistroReputationForAllergySafety]",
                  refinements=[Refinement(False, [g2, g4, g5, g71], "H12")]),
         "E G-40; Y G-107", "Y: S[18:56:31]", "PARENT", tacit=True)

# =============================================================================
# OBSTACLES
# =============================================================================
o1 = Obstacle("O-1: AllergyTicketMissedOrClearedDuringRush")            # E O-1; Y O-1
o2 = Obstacle("O-2: AllergyAttachedToTableInsteadOfSeat")              # E O-2
o3 = Obstacle("O-3: NoNutsInRecipeTreatedAsSafeDespiteSharedEquipment") # E O-3
o4 = Obstacle("O-4: ServerAssumesDishSafeWithoutKitchenCheck")         # Y O-8
o5 = Obstacle("O-5: AllergenRecordOutOfSyncWithPlate")                 # Y O-3
o6 = Obstacle("O-6: AllergyChangeLostDuringConnectionLoss")            # Y O-4

# =============================================================================
# CONFLICTS  (see docs/goal-model.md for the decision on each)
# =============================================================================
CONFLICTS = {
    "C-1": ConflictLink(g23, g43),    # Kayla 'show safe dishes' vs Sofia 'nothing confirmed before kitchen review'
    "C-2": ConflictLink(g6, g84),   # Sofia full allergy detail vs Kayla no extra screens / free text
    "C-3": ConflictLink(g32, g86),     # Antoine: prominent until acknowledged vs no pointless alarms
    "C-4": ConflictLink(g38, g83),     # Sofia named, timestamped review vs Antoine/Kayla speed in a rush
    "C-5": ConflictLink(g44, g34),    # Sofia review BEFORE ordering vs Antoine acknowledge AFTER send (UNRESOLVED)
    "C-6": ConflictLink(g34, g38),    # terminology: 'acknowledged' (saw it) vs 'confirmed' (reviewed prep)
    "C-7": ConflictLink(g12, g13),    # members disagree where an intolerance belongs (E: allergy, S: modification)
    "C-8": ConflictLink(g84, g24),   # Kayla quick modification vs Antoine chef decides if a modification is safe
    "C-9": ConflictLink(g16, g8),    # Sofia enters allergy herself vs server enters it
    "C-10": ConflictLink(g28, g85),  # Antoine ask me in person in a rush vs Kayla fewer trips to the kitchen
    "C-11": ConflictLink(g19, g77),    # Kayla keep notes across devices vs Sofia no stored data without consent
}

LINKS = [
    ObstructionLink(g29, o1), ResolutionLink(g32, o1), ResolutionLink(g53, o1),
    ObstructionLink(g10, o2),
    ObstructionLink(g72, o3), ResolutionLink(g31, o3),
    ObstructionLink(g20, o4), ResolutionLink(g23, o4),
    ObstructionLink(g62, o5), ResolutionLink(g65, o5),
    ObstructionLink(g2, o6), ResolutionLink(g59, o6),
] + list(CONFLICTS.values())

# =============================================================================
# SPEC TRACE  (specs/001-allergy-order-round-trip/spec.md)
# REQ-01..REQ-17 are MUST, REQ-18..REQ-22 are SHOULD.
# REQ-10 also traces to G-70: found while reviewing the spec on 11/16, because the tablet said
# "Cannot confirm" for a dish with missing information while the kitchen could still "Confirm" it.
# =============================================================================
REQS = {
    "REQ-01": ["G-9"],  "REQ-02": ["G-10"], "REQ-03": ["G-12"], "REQ-04": ["G-22"],
    "REQ-05": ["G-23"], "REQ-06": ["G-30"], "REQ-07": ["G-31"], "REQ-08": ["G-32"],
    "REQ-09": ["G-34"], "REQ-10": ["G-38", "G-70"], "REQ-11": ["G-39"], "REQ-12": ["G-41"],
    "REQ-13": ["G-43"], "REQ-14": ["G-50"], "REQ-15": ["G-51"], "REQ-16": ["G-70"],
    "REQ-17": ["G-84"], "REQ-18": ["G-13"], "REQ-19": ["G-17"], "REQ-20": ["G-25"],
    "REQ-21": ["G-33"], "REQ-22": ["G-53"],
}

# Sprint assumptions from the spec, shown as domain hypotheses (A-1 is goal G-63, marked ASSUME).
# None of them was stated by a stakeholder, so they are yellow with a dashed border.
ASSUMPTIONS = [hyp_a3, hyp_a4, hyp_a5, hyp_a6]

ROOTS = [g1]


# =============================================================================
# RENDERING
# =============================================================================
def reachable(roots):
    seen, stack = set(), list(roots)
    while stack:
        v = stack.pop()
        if id(v) in seen:
            continue
        seen.add(id(v))
        for r in getattr(v, "disjunctions", []):
            stack.extend(r.children)
    return seen


def styles(nodes=None):
    out = ""
    for gid, m in META.items():
        g = m["goal"]
        if nodes is not None and id(g) not in nodes:
            continue
        parts = []
        if m["tacit"]:
            parts.append("fill:#ffff00")
        if m["scope"] in ("MUST", "SHOULD", "PARENT"):
            parts.append("stroke:#2e7d32,stroke-width:4px")
        elif m["scope"] == "ENV":
            parts.append("stroke:#2e7d32,stroke-width:2px")
        elif m["scope"] == "ASSUME":
            parts.append("stroke:#2e7d32,stroke-width:2px,stroke-dasharray:5 5")
        else:
            parts.append("color:#888,stroke:#aaa")
        out += f"style {g.get_node_id()} {','.join(parts)}\n"
    for h in ASSUMPTIONS:
        if nodes is None or id(h) in nodes:
            out += f"style {h.get_node_id()} fill:#ffff00,stroke:#2e7d32,stroke-width:2px,stroke-dasharray:5 5\n"
    return out


def G(gid):
    return META[gid]["goal"]


def render_view(roots, keep=None, cut=()):
    """Render part of the model with the goalmodeling framework.
    keep: vertices that may be drawn (None = all). cut: goals drawn as a box, without their refinements.
    Refinements are hidden only for this render and restored afterwards."""
    cut_ids = {id(g) for g in cut}
    saved = []
    for m in META.values():
        g = m["goal"]
        saved.append((g, g.disjunctions, [list(r.children) for r in g.disjunctions]))
        if id(g) in cut_ids:
            g.disjunctions = []
            continue
        if keep is None:
            continue
        kept, seen = [], set()
        for r in g.disjunctions:
            ch = [c for c in r.children if id(c) in keep or (isinstance(c, DomainProperty) and any(id(x) in keep for x in r.children))]
            goals = {id(c) for c in ch if not isinstance(c, DomainProperty)}
            if not goals or goals <= seen:      # nothing left, or only repeats of an alternative already drawn
                continue
            seen |= goals
            r.children = ch
            kept.append(r)
        g.disjunctions = kept
    try:
        nodes = reachable(roots)
        links = [l for l in LINKS if isinstance(l, ConflictLink) and id(l.goal1) in nodes and id(l.goal2) in nodes]
        obstructions = [l for l in LINKS if isinstance(l, ObstructionLink) and id(l.goal) in nodes]
        shown = {id(l.obstacle) for l in obstructions}
        links += obstructions + [l for l in LINKS if isinstance(l, ResolutionLink)
                                 and id(l.goal) in nodes and id(l.obstacle) in shown]
        text = generate_graph(roots, links) + styles(nodes)
    finally:
        for g, disj, children in saved:
            g.disjunctions = disj
            for r, ch in zip(disj, children):
                r.children = ch
    expanded = {id(v) for v in nodes if getattr(v, "disjunctions", None) and id(v) not in cut_ids}
    return text, nodes, expanded


def sprint_keep():
    """Sprint goals, the person steps under them, every goal above them, and the assumptions."""
    parents = {}
    for m in META.values():
        for r in m["goal"].disjunctions:
            for c in r.children:
                parents.setdefault(id(c), []).append(m["goal"])
    keep = {id(m["goal"]) for m in META.values() if m["scope"] in ("MUST", "SHOULD", "ASSUME")}
    keep |= {id(h) for h in ASSUMPTIONS}
    stack = [m["goal"] for m in META.values() if id(m["goal"]) in keep]
    while stack:
        for p in parents.get(id(stack.pop()), []):
            if id(p) not in keep:
                keep.add(id(p))
                stack.append(p)
    for m in META.values():  # person steps directly under a kept goal
        if m["scope"] == "ENV" and any(id(p) in keep for p in parents.get(id(m["goal"]), [])):
            keep.add(id(m["goal"]))
    keep.add(id(G("G-44")))  # Sofia's goal, so the unresolved conflict C-5 stays visible
    return keep


# Legible views. The full model is split by area; each view is drawn by the framework, with agents.
VIEWS = {
    "sprint-a-table": dict(title="Sprint view A: at the table", roots=["G-6", "G-20", "G-62"], keep="sprint"),
    "sprint-b-kitchen": dict(title="Sprint view B: in the kitchen and back", roots=["G-29", "G-37", "G-40", "G-49", "G-44"], keep="sprint"),
    "sprint-c-soft": dict(title="Sprint view C: soft goals", roots=["G-83", "G-86"], keep="sprint"),
    "1-top": dict(title="Top-level goals", roots=["G-1"],
                  cut=["G-62", "G-3", "G-54", "G-59", "G-72", "G-77", "G-83", "G-86"]),
    "2-order": dict(title="Recording the allergy and checking dishes", roots=["G-6", "G-20"]),
    "3-kitchen": dict(title="Kitchen, review, status and the pass", roots=["G-29", "G-37", "G-40", "G-45", "G-49"]),
    "4-records": dict(title="Dish records, changes after send, no connection", roots=["G-62", "G-54", "G-59"]),
    "5-guest": dict(title="Guest, privacy and soft goals", roots=["G-72", "G-77", "G-83", "G-86"], cut=["G-6", "G-40"]),
}


def build_view(name):
    v = VIEWS[name]
    keep = sprint_keep() if v.get("keep") == "sprint" else None
    return render_view([G(r) for r in v["roots"]], keep, [G(c) for c in v.get("cut", [])])


def build_full():
    return generate_graph(ROOTS, LINKS) + styles()


if __name__ == "__main__":
    cfg = {"theme": "default", "themeVariables": {"fontFamily": "Helvetica"}}
    # The split views are drawn right-to-left (child on the right, parent on the left), so they are
    # tall instead of very wide and stay readable on a page. Shapes and links are unchanged.
    outputs = [("mermaid_team", build_full())] + [
        (f"mermaid_{n}", build_view(n)[0].replace("flowchart BT", "flowchart RL", 1)) for n in VIEWS]
    for fname, text in outputs:
        link = generate_pako_link(text, "edit", config=cfg)
        with open(fname + ".txt", "w") as f:
            f.write(link + "\n")
        with open(fname + ".mmd", "w") as f:
            f.write(text)
        print(fname, link[:60] + "...")

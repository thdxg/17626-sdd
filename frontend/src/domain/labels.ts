// The closed set of status text (contracts/ui.md §Allowed status text, Constitution I).
// Every status string that reaches a screen comes from here.
import type { AllergenId, Allergy, DishRecord, Equipment, OrderItem } from './types'
import { SEVERITY_DISPLAY } from './types'
import { allergenName } from '../data/allergens'

// REQ-05, REQ-08, REQ-13, REQ-15, REQ-16
export const LABEL = {
  notConfirmed: 'Not confirmed',
  cannotConfirm: 'Cannot confirm',
  confirmed: 'Confirmed',
  okToServe: 'OK to serve',
  allergyNotAcknowledged: 'ALLERGY – NOT ACKNOWLEDGED',
  allergyOrder: 'Allergy order',
  kitchenSent: 'Kitchen: Sent',
  kitchenAcknowledged: 'Kitchen: Acknowledged',
  reasonPrefix: 'Reason: ',
} as const

/** REQ-04 */
export function containsLabel(allergen: AllergenId): `Contains ${string}` {
  return `Contains ${allergenName(allergen)}`
}

/**
 * REQ-20: for each seat allergen the dish lists (i.e. each "Contains" label), only the
 * changes the dish record lists as chef-approved for that allergen. Never free text.
 */
export function approvedChangesFor(dish: DishRecord, seatAllergies: readonly Allergy[]): string[] {
  const seatAllergens = [...new Set(seatAllergies.flatMap((a) => a.allergens))]
  const out: string[] = []
  for (const a of seatAllergens) {
    if (!dish.allergens.includes(a)) continue
    for (const change of dish.approvedChanges[a] ?? []) if (!out.includes(change)) out.push(change)
  }
  return out
}

/** REQ-01, REQ-06 (V2): the same wording on the tablet chips and the kitchen item. */
export function tracesLabel(traces: boolean): 'Traces: yes' | 'Traces: no' {
  return traces ? 'Traces: yes' : 'Traces: no'
}

/** REQ-20 (V2): the chef-approved change the server picked. */
export function changeLabel(change: string): `Chef-approved change: ${string}` {
  return `Chef-approved change: ${change}`
}

/** REQ-07 */
export function crossContactLabel(eq: Equipment): `Cross-contact: ${string}` {
  return `Cross-contact: ${eq}`
}

/**
 * Text lines for one allergy item on the kitchen display (data-model.md §Kitchen item text):
 * allergens, severities, traces ("yes" if any snapshot allergy says so, R-17), seat,
 * cross-contact, and the picked change last. REQ-06, REQ-07, REQ-20
 */
export function kitchenItemText(item: OrderItem, dish: DishRecord): string[] {
  const snapshot = item.allergySnapshot ?? []
  const allergens = [...new Set(snapshot.flatMap((a) => a.allergens))].map(allergenName)
  const severities = [...new Set(snapshot.map((a) => a.severity))].map((s) => SEVERITY_DISPLAY[s])
  const lines = [
    ...allergens,
    ...severities,
    tracesLabel(snapshot.some((a) => a.traces)),
    `seat ${item.seatNumber}`,
    ...dish.sharedEquipment.map(crossContactLabel),
  ]
  if (item.pickedChange !== null) lines.push(changeLabel(item.pickedChange))
  return lines
}

/**
 * Labels for one dish (menu row) or one order item, for one seat, on the tablet
 * (data-model.md §Tablet dish labels). REQ-04, REQ-05, REQ-12, REQ-13, REQ-15, REQ-16
 */
export function dishLabels(dish: DishRecord, seatAllergies: readonly Allergy[], item?: OrderItem): string[] {
  const labels: string[] = []
  const hasAllergy = seatAllergies.length > 0

  // 1. One "Contains <name>" per seat allergen the dish lists (REQ-04).
  const seatAllergens = [...new Set(seatAllergies.flatMap((a) => a.allergens))]
  const contains = seatAllergens.filter((a) => dish.allergens.includes(a)).map(containsLabel)
  labels.push(...contains)

  // 2. Missing or unverified dish information → "Cannot confirm" for any seat with an allergy (REQ-16).
  let cannotConfirm = false
  if (hasAllergy && dish.allergenInfo !== 'complete') {
    labels.push(LABEL.cannotConfirm)
    cannotConfirm = true
  }

  // 3. Kitchen status of a sent allergy item (REQ-12, REQ-13, REQ-15).
  let confirmed = false
  if (item && item.isAllergyOrder === true) {
    switch (item.kitchenStatus) {
      case 'Sent':
        labels.push(LABEL.kitchenSent)
        break
      case 'Acknowledged':
        labels.push(LABEL.kitchenAcknowledged)
        break
      case 'Confirmed':
        // REQ-13: "Confirmed" only for kitchenStatus === "Confirmed".
        labels.push(LABEL.confirmed)
        confirmed = true
        break
      case 'Cannot confirm':
        if (!cannotConfirm) labels.push(LABEL.cannotConfirm)
        cannotConfirm = true
        if (item.cannotConfirm) labels.push(`${LABEL.reasonPrefix}${item.cannotConfirm.reason}`)
        break
      default:
        break
    }
    // REQ-15: "OK to serve" only when signed off (sign-off needs "Confirmed", REQ-14).
    if (item.signOff !== null && item.kitchenStatus === 'Confirmed') labels.push(LABEL.okToServe)
  }

  // 4. No conflict, no "Cannot confirm" and not confirmed → "Not confirmed"; never for a seat
  //    with no allergy (REQ-05).
  if (hasAllergy && contains.length === 0 && !cannotConfirm && !confirmed) labels.push(LABEL.notConfirmed)

  return labels
}

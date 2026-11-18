// Kitchen rules: offered actions per role and status, ticket order (data-model.md §Kitchen state
// machine, §Kitchen ordering). REQ-08, REQ-09, REQ-10, REQ-11, REQ-14, C-12
import type { AppState, DishRecord, OrderItem, Role, Ticket } from './types'
import { ESCALATION_MS } from '../config'

export type KitchenAction = 'acknowledge' | 'confirm' | 'cannotConfirm' | 'signOff'

export function isAllergyTicket(ticket: Ticket, items: AppState['orderItems']): boolean {
  return ticket.itemIds.some((id) => items[id]?.isAllergyOrder === true)
}

/** An allergy item the expediter has not signed off and the kitchen has not marked "Cannot confirm" (R-18). */
function isOpenAllergyItem(item: OrderItem | undefined): boolean {
  return item?.isAllergyOrder === true && item.signOff === null && item.kitchenStatus !== 'Cannot confirm'
}

/**
 * REQ-08 (V2, R-18): rank 0 = allergy ticket not acknowledged; rank 1 = acknowledged allergy ticket
 * with an open allergy item; rank 2 = every other ticket. Then by sentAt (oldest first). Stable.
 */
export function sortTickets(tickets: readonly Ticket[], items: AppState['orderItems']): Ticket[] {
  const key = (t: Ticket) => {
    if (!isAllergyTicket(t, items)) return 2
    if (t.acknowledgedAt === null) return 0
    return t.itemIds.some((id) => isOpenAllergyItem(items[id])) ? 1 : 2
  }
  return tickets
    .map((t, index) => ({ t, index, k: key(t), at: Date.parse(t.sentAt) }))
    .sort((a, b) => a.k - b.k || a.at - b.at || a.index - b.index)
    .map((x) => x.t)
}

/** REQ-21 (SHOULD): an allergy ticket not acknowledged within `escalationMs` of being sent. */
export function isEscalated(
  ticket: Ticket,
  items: AppState['orderItems'],
  nowMs: number,
  escalationMs: number = ESCALATION_MS,
): boolean {
  if (!isAllergyTicket(ticket, items) || ticket.acknowledgedAt !== null) return false
  return nowMs - Date.parse(ticket.sentAt) >= escalationMs
}

/** REQ-10 (V2, R-15): the dish lists an allergen from the item's allergy snapshot, whatever its severity. */
export function listsSnapshotAllergen(item: OrderItem, dish: DishRecord): boolean {
  return (item.allergySnapshot ?? []).some((a) => a.allergens.some((id) => dish.allergens.includes(id)))
}

/** The buttons the kitchen display may show for one item of a ticket. */
export function offeredActions(item: OrderItem, ticket: Ticket, dish: DishRecord, role: Role): KitchenAction[] {
  const out: KitchenAction[] = []
  if (item.isAllergyOrder !== true || item.ticketId !== ticket.id) return out
  // REQ-09: the station lead acknowledges an allergy ticket that is not acknowledged.
  if (role === 'station lead' && ticket.acknowledgedAt === null) out.push('acknowledge')
  if (role === 'station lead' && item.kitchenStatus === 'Acknowledged') {
    // REQ-10: only when acknowledged, the dish information is complete, and (V2) the dish lists
    // none of the snapshot's allergens. A picked change does not matter (C-12).
    if (dish.allergenInfo === 'complete' && !listsSnapshotAllergen(item, dish)) out.push('confirm')
    // REQ-11
    out.push('cannotConfirm')
  }
  // REQ-14: only a confirmed item that is not yet signed off.
  if (role === 'expediter' && item.kitchenStatus === 'Confirmed' && item.signOff === null) out.push('signOff')
  return out
}

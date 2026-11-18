// Literal AppState builders for tests. They do NOT call reducers, so each story can be
// tested on its own. Test support for REQ-01–REQ-17 (Constitution V).
import { createSeed } from '../data/seed'
import type { Allergy, AppState, KitchenStatus, OrderItem, Severity, Ticket } from '../domain/types'
import { seatKey } from '../domain/types'

export const T0 = '2026-11-16T12:00:00.000Z'

let counter = 0
const nextId = (p: string) => `${p}-fx-${++counter}`

export function seed(): AppState {
  return createSeed()
}

export function withAllergy(
  state: AppState,
  tableId: string,
  seat: number,
  partial: Partial<Allergy> = {},
): AppState {
  const key = seatKey(tableId, seat)
  const allergy: Allergy = {
    id: nextId('allergy'),
    allergens: ['tree-nuts'],
    severity: 'severe',
    traces: true,
    recordedAt: T0,
    ...partial,
  }
  return {
    ...state,
    seats: { ...state.seats, [key]: { ...state.seats[key], allergies: [...state.seats[key].allergies, allergy] } },
  }
}

export function withDraftItem(state: AppState, tableId: string, seat: number, dishId: string): AppState {
  const item: OrderItem = {
    id: nextId('item'),
    tableId,
    seatNumber: seat,
    dishId,
    addedAt: T0,
    ticketId: null,
    isAllergyOrder: null,
    allergySnapshot: null,
    kitchenStatus: null,
    review: null,
    cannotConfirm: null,
    signOff: null,
    pickedChange: null,
  }
  return { ...state, orderItems: { ...state.orderItems, [item.id]: item } }
}

const ALLERGY_SEVERITIES: readonly Severity[] = ['severe', 'intolerance', 'unknown']

export interface FixtureItem {
  seat: number
  dishId: string
  kitchenStatus?: KitchenStatus
  signOff?: boolean
  cannotConfirm?: string
  /** V2 (REQ-20): the change the server picked before sending. */
  pickedChange?: string
}

/**
 * A sent ticket. Each item's snapshot is its seat's current allergies; an item is an allergy
 * order when that snapshot has severe / intolerance / unknown. `kitchenStatus` defaults to "Sent"
 * for allergy items. The ticket is acknowledged when any allergy item is past "Sent", unless
 * `acknowledged` says otherwise.
 */
export function withSentAllergyTicket(
  state: AppState,
  opts: { tableId: string; items: FixtureItem[]; sentAt?: string; acknowledged?: boolean; ticketId?: string },
): { state: AppState; ticket: Ticket; items: OrderItem[] } {
  const ticketId = opts.ticketId ?? nextId('ticket')
  const sentAt = opts.sentAt ?? T0
  const items: OrderItem[] = opts.items.map((fi) => {
    const snapshot = structuredClone(state.seats[seatKey(opts.tableId, fi.seat)].allergies)
    const allergy = snapshot.some((a) => ALLERGY_SEVERITIES.includes(a.severity))
    const status: KitchenStatus | null = allergy ? (fi.kitchenStatus ?? 'Sent') : null
    return {
      id: nextId('item'),
      tableId: opts.tableId,
      seatNumber: fi.seat,
      dishId: fi.dishId,
      addedAt: sentAt,
      ticketId,
      isAllergyOrder: allergy,
      allergySnapshot: snapshot,
      kitchenStatus: status,
      review: status === 'Confirmed' ? { role: 'station lead', at: sentAt } : null,
      cannotConfirm:
        status === 'Cannot confirm'
          ? { role: 'station lead', reason: fi.cannotConfirm ?? 'Supplier sheet missing', at: sentAt }
          : null,
      signOff: status === 'Confirmed' && fi.signOff ? { role: 'expediter', at: sentAt } : null,
      pickedChange: fi.pickedChange ?? null,
    }
  })
  const acknowledged = opts.acknowledged ?? items.some((i) => i.kitchenStatus !== null && i.kitchenStatus !== 'Sent')
  const ticket: Ticket = {
    id: ticketId,
    tableId: opts.tableId,
    sentAt,
    itemIds: items.map((i) => i.id),
    acknowledgedAt: acknowledged ? sentAt : null,
  }
  return {
    state: {
      ...state,
      orderItems: { ...state.orderItems, ...Object.fromEntries(items.map((i) => [i.id, i])) },
      tickets: [...state.tickets, ticket],
    },
    ticket,
    items,
  }
}

// Pure reducers (contracts/domain-api.md). A reducer whose guard fails returns the same state
// reference, so the store skips the write and the broadcast.
import type { AllergenId, Allergy, AppState, OrderItem, Role, Severity, Ticket } from './types'
import { SEVERITIES, seatKey } from './types'
import { isAllergyOrder } from './allergyOrder'
import { isAllergyTicket, offeredActions } from './kitchen'
import type { KitchenAction } from './kitchen'
import { createSeed } from '../data/seed'
import { isAllergenId } from '../data/allergens'
import { dishById } from '../data/dishes'

export type Action =
  | {
      type: 'recordAllergy'
      tableId: string
      seatNumber: number
      allergens: readonly AllergenId[]
      severity: Severity | null | undefined
      traces: boolean | null | undefined
      note?: string
    }
  | { type: 'addItem'; tableId: string; seatNumber: number; dishId: string }
  | { type: 'removeDraftItem'; itemId: string }
  | { type: 'sendOrder'; tableId: string }
  | { type: 'acknowledge'; ticketId: string; role: Role }
  | { type: 'confirm'; itemId: string; role: Role }
  | { type: 'cannotConfirm'; itemId: string; role: Role; reason: string }
  | { type: 'signOff'; itemId: string; role: Role }
  | { type: 'reset' }

/** A new id that is not yet in `taken`. Deterministic (no Math.random). */
export function newId(prefix: string, now: Date, taken: (id: string) => boolean = () => false): string {
  const base = `${prefix}-${now.getTime().toString(36)}`
  let n = 1
  while (taken(`${base}-${n}`)) n++
  return `${base}-${n}`
}

const isSeverity = (v: unknown): v is Severity => typeof v === 'string' && (SEVERITIES as readonly string[]).includes(v)

/** REQ-01, REQ-02: append one allergy to exactly one seat. */
function recordAllergy(state: AppState, a: Extract<Action, { type: 'recordAllergy' }>, now: Date): AppState {
  const key = seatKey(a.tableId, a.seatNumber)
  const seat = state.seats[key]
  if (!seat) return state
  if (!Array.isArray(a.allergens) || a.allergens.length === 0) return state
  if (!a.allergens.every(isAllergenId)) return state
  if (!isSeverity(a.severity)) return state // no default severity
  if (typeof a.traces !== 'boolean') return state // no default traces
  const note = a.note?.trim() || undefined
  const taken = new Set(Object.values(state.seats).flatMap((s) => s.allergies.map((x) => x.id)))
  const allergy: Allergy = {
    id: newId('allergy', now, (id) => taken.has(id)),
    allergens: [...new Set(a.allergens)],
    severity: a.severity,
    traces: a.traces,
    recordedAt: now.toISOString(),
  }
  if (note !== undefined) allergy.note = note
  return { ...state, seats: { ...state.seats, [key]: { ...seat, allergies: [...seat.allergies, allergy] } } }
}

/** REQ-02, REQ-03: a draft item for one seat. Its allergy display is computed live. */
function addItem(state: AppState, a: Extract<Action, { type: 'addItem' }>, now: Date): AppState {
  if (!dishById(a.dishId)) return state
  if (!state.seats[seatKey(a.tableId, a.seatNumber)]) return state
  const item: OrderItem = {
    id: newId('item', now, (id) => id in state.orderItems),
    tableId: a.tableId,
    seatNumber: a.seatNumber,
    dishId: a.dishId,
    addedAt: now.toISOString(),
    ticketId: null,
    isAllergyOrder: null,
    allergySnapshot: null,
    kitchenStatus: null,
    review: null,
    cannotConfirm: null,
    signOff: null,
  }
  return { ...state, orderItems: { ...state.orderItems, [item.id]: item } }
}

function removeDraftItem(state: AppState, a: Extract<Action, { type: 'removeDraftItem' }>): AppState {
  const item = state.orderItems[a.itemId]
  if (!item || item.ticketId !== null) return state // sent items cannot be removed (REQ-22)
  const orderItems = { ...state.orderItems }
  delete orderItems[a.itemId]
  return { ...state, orderItems }
}

/** REQ-03, REQ-06 (A-7, A-8): one ticket with every draft of the table; snapshot the seat allergies. */
function sendOrder(state: AppState, a: Extract<Action, { type: 'sendOrder' }>, now: Date): AppState {
  const drafts = Object.values(state.orderItems).filter((i) => i.tableId === a.tableId && i.ticketId === null)
  if (drafts.length === 0) return state
  const ticketIds = new Set(state.tickets.map((t) => t.id))
  const ticket: Ticket = {
    id: newId('ticket', now, (id) => ticketIds.has(id)),
    tableId: a.tableId,
    sentAt: now.toISOString(),
    itemIds: drafts.map((i) => i.id),
    acknowledgedAt: null,
  }
  const orderItems = { ...state.orderItems }
  for (const d of drafts) {
    const allergies = state.seats[seatKey(d.tableId, d.seatNumber)]?.allergies ?? []
    const allergyOrder = isAllergyOrder(allergies)
    orderItems[d.id] = {
      ...d,
      ticketId: ticket.id,
      allergySnapshot: structuredClone(allergies),
      isAllergyOrder: allergyOrder,
      kitchenStatus: allergyOrder ? 'Sent' : null,
    }
  }
  return { ...state, orderItems, tickets: [...state.tickets, ticket] }
}

/** REQ-09 (A-7): the station lead acknowledges a whole allergy ticket. */
function acknowledge(state: AppState, a: Extract<Action, { type: 'acknowledge' }>, now: Date): AppState {
  if (a.role !== 'station lead') return state
  const ticket = state.tickets.find((t) => t.id === a.ticketId)
  if (!ticket || ticket.acknowledgedAt !== null) return state
  if (!isAllergyTicket(ticket, state.orderItems)) return state
  const at = now.toISOString()
  const orderItems = { ...state.orderItems }
  for (const id of ticket.itemIds) {
    const i = orderItems[id]
    if (i?.isAllergyOrder === true && i.kitchenStatus === 'Sent') orderItems[id] = { ...i, kitchenStatus: 'Acknowledged' }
  }
  return {
    ...state,
    orderItems,
    tickets: state.tickets.map((t) => (t.id === ticket.id ? { ...t, acknowledgedAt: at } : t)),
  }
}

/**
 * Re-check, against the freshly read state, that `offeredActions` allows this action (R-4), and
 * apply `change` to the item. Any failed guard returns the same reference.
 */
function itemAction(
  state: AppState,
  itemId: string,
  role: Role,
  kind: KitchenAction,
  change: (item: OrderItem) => OrderItem,
): AppState {
  const item = state.orderItems[itemId]
  if (!item || item.ticketId === null) return state
  const ticket = state.tickets.find((t) => t.id === item.ticketId)
  const dish = dishById(item.dishId)
  if (!ticket || !dish) return state
  if (!offeredActions(item, ticket, dish, role).includes(kind)) return state
  return { ...state, orderItems: { ...state.orderItems, [itemId]: change(item) } }
}

export function reduce(state: AppState, action: Action, now: Date): AppState {
  switch (action.type) {
    // REQ-10
    case 'confirm':
      return itemAction(state, action.itemId, action.role, 'confirm', (i) => ({
        ...i,
        kitchenStatus: 'Confirmed',
        review: { role: 'station lead', at: now.toISOString() },
      }))
    // REQ-11: never without a non-blank reason.
    case 'cannotConfirm': {
      const reason = typeof action.reason === 'string' ? action.reason.trim() : ''
      if (reason === '') return state
      return itemAction(state, action.itemId, action.role, 'cannotConfirm', (i) => ({
        ...i,
        kitchenStatus: 'Cannot confirm',
        cannotConfirm: { role: 'station lead', reason, at: now.toISOString() },
      }))
    }
    // REQ-14
    case 'signOff':
      return itemAction(state, action.itemId, action.role, 'signOff', (i) => ({
        ...i,
        signOff: { role: 'expediter', at: now.toISOString() },
      }))
    case 'sendOrder':
      return sendOrder(state, action, now)
    case 'acknowledge':
      return acknowledge(state, action, now)
    case 'recordAllergy':
      return recordAllergy(state, action, now)
    case 'addItem':
      return addItem(state, action, now)
    case 'removeDraftItem':
      return removeDraftItem(state, action)
    case 'reset':
      return createSeed() // REQ-12 (A-10): the store sets the revision.
    default:
      return state
  }
}

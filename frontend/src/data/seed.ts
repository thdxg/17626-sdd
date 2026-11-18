// Demo seed: three tables and two sent normal tickets so REQ-08 ordering can be seen.
// REQ-02, REQ-08 (A-10)
import type { AppState, OrderItem, Seat, SeatKey, Table } from '../domain/types'
import { seatKey } from '../domain/types'

/** Before any new order (fixed, so the seed is deterministic). */
export const SEED_TIME_1 = '2026-01-01T11:50:00.000Z'
export const SEED_TIME_2 = '2026-01-01T11:55:00.000Z'

export const TABLES: readonly Table[] = [
  { id: 'T10', seatCount: 4 },
  { id: 'T11', seatCount: 4 },
  { id: 'T12', seatCount: 6 },
]

/** "T12" → "Table 12" */
export function tableName(tableId: string): string {
  return `Table ${tableId.replace(/^T/, '')}`
}

function normalItem(id: string, tableId: string, seatNumber: number, dishId: string, ticketId: string, at: string): OrderItem {
  return {
    id,
    tableId,
    seatNumber,
    dishId,
    addedAt: at,
    ticketId,
    isAllergyOrder: false,
    allergySnapshot: [],
    kitchenStatus: null,
    review: null,
    cannotConfirm: null,
    signOff: null,
    pickedChange: null,
  }
}

export function createSeed(): AppState {
  const seats: Record<SeatKey, Seat> = {}
  for (const t of TABLES) {
    for (let n = 1; n <= t.seatCount; n++) {
      seats[seatKey(t.id, n)] = { tableId: t.id, number: n, allergies: [] }
    }
  }
  const items = [
    normalItem('seed-item-1', 'T10', 1, 'steak-frites', 'seed-ticket-1', SEED_TIME_1),
    normalItem('seed-item-2', 'T10', 2, 'green-salad', 'seed-ticket-1', SEED_TIME_1),
    normalItem('seed-item-3', 'T11', 1, 'roast-chicken', 'seed-ticket-2', SEED_TIME_2),
  ]
  return {
    schemaVersion: 2,
    revision: 0,
    tables: TABLES.map((t) => ({ ...t })),
    seats,
    orderItems: Object.fromEntries(items.map((i) => [i.id, i])),
    tickets: [
      { id: 'seed-ticket-1', tableId: 'T10', sentAt: SEED_TIME_1, itemIds: ['seed-item-1', 'seed-item-2'], acknowledgedAt: null },
      { id: 'seed-ticket-2', tableId: 'T11', sentAt: SEED_TIME_2, itemIds: ['seed-item-3'], acknowledgedAt: null },
    ],
  }
}

// Entities from specs/001-allergy-order-round-trip/data-model.md.
// REQ-01, REQ-02, REQ-03, REQ-06, REQ-09, REQ-10, REQ-11, REQ-14, REQ-15

export type AllergenId =
  | 'gluten'
  | 'crustaceans'
  | 'eggs'
  | 'fish'
  | 'peanuts'
  | 'soybeans'
  | 'milk'
  | 'tree-nuts'
  | 'celery'
  | 'mustard'
  | 'sesame'
  | 'sulphites'
  | 'lupin'
  | 'molluscs'

export interface Allergen {
  readonly id: AllergenId
  readonly name: string
}

export type Equipment = 'fryer' | 'base' | 'utensil'

export interface DishRecord {
  readonly id: string
  readonly name: string
  readonly allergens: readonly AllergenId[]
  readonly allergenInfo: 'complete' | 'missing' | 'unverified'
  readonly sharedEquipment: readonly Equipment[]
  readonly approvedChanges: Readonly<Partial<Record<AllergenId, readonly string[]>>>
}

export type Severity = 'severe' | 'intolerance' | 'preference' | 'unknown'

export const SEVERITIES: readonly Severity[] = ['severe', 'intolerance', 'preference', 'unknown']

export const SEVERITY_DISPLAY: Readonly<Record<Severity, string>> = {
  severe: 'severe allergy',
  intolerance: 'intolerance',
  preference: 'preference',
  unknown: 'unknown',
}

export interface Allergy {
  id: string
  /** At least one, each from the fixed list (REQ-01). */
  allergens: AllergenId[]
  /** Required; no default. */
  severity: Severity
  /** Required; no default. */
  traces: boolean
  /** Optional; trimmed; empty → undefined. */
  note?: string
  /** ISO time. */
  recordedAt: string
}

export interface Table {
  id: string
  /** 1–6 */
  seatCount: number
}

export type SeatKey = `${string}:${number}`

export interface Seat {
  tableId: string
  /** 1-based */
  number: number
  allergies: Allergy[]
}

export type KitchenStatus = 'Sent' | 'Acknowledged' | 'Confirmed' | 'Cannot confirm'

export interface OrderItem {
  id: string
  tableId: string
  seatNumber: number
  dishId: string
  addedAt: string
  /** null = draft (not sent) */
  ticketId: string | null
  /** null while draft; fixed at send (REQ-03) */
  isAllergyOrder: boolean | null
  /** Seat allergies copied at send (REQ-06) */
  allergySnapshot: Allergy[] | null
  /** Allergy orders only; "Sent" at send (A-8); null for normal items */
  kitchenStatus: KitchenStatus | null
  review: { role: 'station lead'; at: string } | null
  cannotConfirm: { role: 'station lead'; reason: string; at: string } | null
  signOff: { role: 'expediter'; at: string } | null
}

export interface Ticket {
  id: string
  tableId: string
  sentAt: string
  itemIds: string[]
  acknowledgedAt: string | null
}

export interface AppState {
  schemaVersion: 1
  revision: number
  tables: Table[]
  seats: Record<SeatKey, Seat>
  orderItems: Record<string, OrderItem>
  /** In send order, oldest first. */
  tickets: Ticket[]
}

export type Role = 'server' | 'station lead' | 'expediter'

export const ROLES: readonly Role[] = ['server', 'station lead', 'expediter']

export function seatKey(tableId: string, seatNumber: number): SeatKey {
  return `${tableId}:${seatNumber}`
}

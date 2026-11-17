import { describe, expect, it } from 'vitest'
import { dishById } from '../data/dishes'
import { offeredActions, sortTickets } from '../domain/kitchen'
import { kitchenItemText } from '../domain/labels'
import type { AppState, DishRecord, OrderItem, Ticket } from '../domain/types'
import { seed, withAllergy, withSentAllergyTicket } from './fixtures'

const dish = (id: string) => dishById(id)!

function sentItem(dishId: string, state = withAllergy(seed(), 'T12', 3)) {
  const { items, ticket } = withSentAllergyTicket(state, { tableId: 'T12', items: [{ seat: 3, dishId }] })
  return { item: items[0], ticket }
}

describe('kitchenItemText', () => {
  it('REQ-06: a sent item on seat 3 (tree nuts, severe) shows "Tree nuts", "severe allergy", "seat 3" (scenario 1)', () => {
    const { item } = sentItem('walnut-salad')
    const lines = kitchenItemText(item, dish('walnut-salad'))
    expect(lines).toContain('Tree nuts')
    expect(lines).toContain('severe allergy')
    expect(lines).toContain('seat 3')
  })

  it('REQ-06: every allergen and each distinct severity of the snapshot is shown', () => {
    let s = withAllergy(seed(), 'T12', 3, { allergens: ['tree-nuts', 'milk'], severity: 'severe' })
    s = withAllergy(s, 'T12', 3, { allergens: ['sesame'], severity: 'severe' })
    s = withAllergy(s, 'T12', 3, { allergens: ['celery'], severity: 'intolerance' })
    const { item } = sentItem('green-salad', s)
    const lines = kitchenItemText(item, dish('green-salad'))
    for (const t of ['Tree nuts', 'Milk', 'Sesame', 'Celery', 'severe allergy', 'intolerance']) expect(lines).toContain(t)
    expect(lines.filter((l) => l === 'severe allergy')).toHaveLength(1)
  })

  it.each([
    ['fish-chips', ['Cross-contact: fryer']],
    ['steak-frites', ['Cross-contact: fryer']],
    ['roast-chicken', ['Cross-contact: base']],
    ['green-salad', ['Cross-contact: utensil']],
    ['walnut-salad', []],
  ])('REQ-07: %s → %j (scenario 2)', (id, expected) => {
    const { item } = sentItem(id)
    expect(kitchenItemText(item, dish(id)).filter((l) => l.startsWith('Cross-contact'))).toEqual(expected)
  })
})

describe('sortTickets', () => {
  function stateWithTickets() {
    const base = withAllergy(seed(), 'T12', 3)
    // Seed: two normal tickets at 11:50 and 11:55. Allergy ticket at 12:00.
    const { state, ticket } = withSentAllergyTicket(base, {
      tableId: 'T12',
      sentAt: '2026-11-16T12:00:00.000Z',
      items: [{ seat: 3, dishId: 'steak-frites' }],
    })
    return { state, allergyTicket: ticket }
  }

  const ids = (tickets: Ticket[]) => tickets.map((t) => t.id)

  it('REQ-08: an unacknowledged allergy ticket comes before older normal tickets (scenario 3)', () => {
    const { state, allergyTicket } = stateWithTickets()
    expect(ids(sortTickets(state.tickets, state.orderItems))).toEqual([allergyTicket.id, 'seed-ticket-1', 'seed-ticket-2'])
  })

  it('REQ-08: it stays on top after a newer normal ticket arrives', () => {
    const { state, allergyTicket } = stateWithTickets()
    const { state: s2, ticket: newer } = withSentAllergyTicket(state, {
      tableId: 'T11',
      sentAt: '2026-11-16T12:05:00.000Z',
      items: [{ seat: 2, dishId: 'risotto' }],
    })
    expect(s2.orderItems[newer.itemIds[0]].isAllergyOrder).toBe(false)
    expect(ids(sortTickets(s2.tickets, s2.orderItems))).toEqual([allergyTicket.id, 'seed-ticket-1', 'seed-ticket-2', newer.id])
  })

  it('REQ-08: once acknowledged it drops back into sentAt order', () => {
    const { state, allergyTicket } = stateWithTickets()
    const acked: AppState = {
      ...state,
      tickets: state.tickets.map((t) => (t.id === allergyTicket.id ? { ...t, acknowledgedAt: '2026-11-16T12:01:00.000Z' } : t)),
    }
    expect(ids(sortTickets(acked.tickets, acked.orderItems))).toEqual(['seed-ticket-1', 'seed-ticket-2', allergyTicket.id])
  })

  it('REQ-08: two unacknowledged allergy tickets keep sentAt order between them', () => {
    const { state, allergyTicket } = stateWithTickets()
    const s2 = withAllergy(state, 'T11', 1)
    const { state: s3, ticket: second } = withSentAllergyTicket(s2, {
      tableId: 'T11',
      sentAt: '2026-11-16T12:03:00.000Z',
      items: [{ seat: 1, dishId: 'risotto' }],
    })
    expect(ids(sortTickets(s3.tickets, s3.orderItems)).slice(0, 2)).toEqual([allergyTicket.id, second.id])
  })
})

describe('offeredActions — acknowledge', () => {
  const allergy = () => sentItem('steak-frites')

  it('REQ-09: "acknowledge" is offered to the station lead on an unacknowledged allergy ticket', () => {
    const { item, ticket } = allergy()
    expect(offeredActions(item, ticket, dish('steak-frites'), 'station lead')).toContain('acknowledge')
  })

  it.each(['expediter', 'server'] as const)('REQ-09: "acknowledge" is not offered to the %s', (role) => {
    const { item, ticket } = allergy()
    expect(offeredActions(item, ticket, dish('steak-frites'), role)).not.toContain('acknowledge')
  })

  it('REQ-09: "acknowledge" is not offered once the ticket is acknowledged', () => {
    const { item, ticket } = allergy()
    const acked = { ...ticket, acknowledgedAt: '2026-11-16T12:01:00.000Z' }
    const ackedItem: OrderItem = { ...item, kitchenStatus: 'Acknowledged' }
    expect(offeredActions(ackedItem, acked, dish('steak-frites'), 'station lead')).not.toContain('acknowledge')
  })

  it('REQ-09: "acknowledge" is not offered for a normal item (role × status matrix below covers the rest)', () => {
    const { items, ticket } = withSentAllergyTicket(seed(), { tableId: 'T12', items: [{ seat: 2, dishId: 'risotto' }] })
    expect(offeredActions(items[0], ticket, dish('risotto'), 'station lead')).toEqual([])
  })
})

describe('offeredActions — review and sign-off (every role × kitchenStatus × allergenInfo)', () => {
  const ROLES = ['server', 'station lead', 'expediter'] as const
  const STATUSES = ['Sent', 'Acknowledged', 'Confirmed', 'Cannot confirm'] as const
  const INFOS = ['complete', 'missing', 'unverified'] as const

  function build(status: (typeof STATUSES)[number], signedOff = false) {
    const { item, ticket } = sentItem('steak-frites')
    const acked = status !== 'Sent'
    const built: OrderItem = {
      ...item,
      kitchenStatus: status,
      review: status === 'Confirmed' ? { role: 'station lead', at: item.addedAt } : null,
      cannotConfirm: status === 'Cannot confirm' ? { role: 'station lead', reason: 'x', at: item.addedAt } : null,
      signOff: signedOff ? { role: 'expediter', at: item.addedAt } : null,
    }
    return { item: built, ticket: { ...ticket, acknowledgedAt: acked ? item.addedAt : null } }
  }

  const withInfo = (info: (typeof INFOS)[number]): DishRecord => ({ ...dish('steak-frites'), allergenInfo: info })

  for (const role of ROLES) {
    for (const status of STATUSES) {
      for (const info of INFOS) {
        for (const signedOff of status === 'Confirmed' ? [false, true] : [false]) {
          const expectConfirm = role === 'station lead' && status === 'Acknowledged' && info === 'complete'
          const expectCannot = role === 'station lead' && status === 'Acknowledged'
          const expectSignOff = role === 'expediter' && status === 'Confirmed' && !signedOff
          it(`REQ-10 REQ-11 REQ-14: ${role} × ${status}${signedOff ? ' (signed off)' : ''} × ${info} → confirm=${expectConfirm} cannotConfirm=${expectCannot} signOff=${expectSignOff}`, () => {
            const { item, ticket } = build(status, signedOff)
            const actions = offeredActions(item, ticket, withInfo(info), role)
            expect(actions.includes('confirm')).toBe(expectConfirm)
            expect(actions.includes('cannotConfirm')).toBe(expectCannot)
            expect(actions.includes('signOff')).toBe(expectSignOff)
          })
        }
      }
    }
  }

  it('REQ-10: "Confirm" is not offered on a Sent item (scenario 2)', () => {
    const { item, ticket } = build('Sent')
    expect(offeredActions(item, ticket, dish('steak-frites'), 'station lead')).not.toContain('confirm')
  })

  it('REQ-10 REQ-11: daily special (missing info) acknowledged → no "Confirm", but "Cannot confirm" (scenario 3)', () => {
    const { items, ticket } = withSentAllergyTicket(withAllergy(seed(), 'T12', 3), {
      tableId: 'T12',
      items: [{ seat: 3, dishId: 'daily-special', kitchenStatus: 'Acknowledged' }],
    })
    const actions = offeredActions(items[0], ticket, dish('daily-special'), 'station lead')
    expect(actions).not.toContain('confirm')
    expect(actions).toContain('cannotConfirm')
  })

  it('REQ-14: "Sign off" is never offered on Sent, Acknowledged or Cannot confirm (scenario 7)', () => {
    for (const status of ['Sent', 'Acknowledged', 'Cannot confirm'] as const) {
      const { item, ticket } = build(status)
      expect(offeredActions(item, ticket, dish('steak-frites'), 'expediter')).not.toContain('signOff')
    }
  })
})

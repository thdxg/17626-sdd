import { describe, expect, it } from 'vitest'
import { dishById } from '../data/dishes'
import { listsSnapshotAllergen, offeredActions, sortTickets } from '../domain/kitchen'
import { kitchenItemText } from '../domain/labels'
import type { DishRecord, KitchenStatus, OrderItem, Ticket } from '../domain/types'
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

describe('kitchenItemText — traces (V2)', () => {
  it('REQ-06: "Traces: yes" when the snapshot allergy has traces: true, right after the severity (US3 scenario 8)', () => {
    const { item } = sentItem('walnut-salad', withAllergy(seed(), 'T12', 3, { traces: true }))
    const lines = kitchenItemText(item, dish('walnut-salad'))
    expect(lines).toContain('Traces: yes')
    expect(lines).not.toContain('Traces: no')
    expect(lines.indexOf('Traces: yes')).toBe(lines.indexOf('severe allergy') + 1)
    expect(lines.indexOf('seat 3')).toBe(lines.indexOf('Traces: yes') + 1)
  })

  it('REQ-06: "Traces: no" when the snapshot allergy has traces: false', () => {
    const { item } = sentItem('walnut-salad', withAllergy(seed(), 'T12', 3, { traces: false }))
    const lines = kitchenItemText(item, dish('walnut-salad'))
    expect(lines).toContain('Traces: no')
    expect(lines).not.toContain('Traces: yes')
  })

  it('REQ-06: two allergies that disagree on traces show "Traces: yes" once (R-17)', () => {
    let s = withAllergy(seed(), 'T12', 3, { allergens: ['tree-nuts'], severity: 'severe', traces: false })
    s = withAllergy(s, 'T12', 3, { allergens: ['milk'], severity: 'intolerance', traces: true })
    const { item } = sentItem('steak-frites', s)
    const lines = kitchenItemText(item, dish('steak-frites'))
    expect(lines.filter((l) => l.startsWith('Traces:'))).toEqual(['Traces: yes'])
    expect(lines.indexOf('Traces: yes')).toBe(lines.indexOf('intolerance') + 1)
  })

  it('REQ-20: a picked change is the last line; no change line when none was picked', () => {
    const s = withAllergy(seed(), 'T12', 3)
    const picked = withSentAllergyTicket(s, {
      tableId: 'T12',
      items: [{ seat: 3, dishId: 'walnut-salad', pickedChange: 'Without walnuts' }],
    }).items[0]
    const lines = kitchenItemText(picked, dish('walnut-salad'))
    expect(lines[lines.length - 1]).toBe('Chef-approved change: Without walnuts')
    const { item } = sentItem('walnut-salad', s)
    expect(kitchenItemText(item, dish('walnut-salad')).some((l) => l.startsWith('Chef-approved change'))).toBe(false)
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

  // V2: replaces the V1 case "once acknowledged it drops back into sentAt order" (REQ-08 second sentence, R-18).
  it('REQ-08: once acknowledged it stays above older and newer normal tickets while an allergy item is open (US3 scenario 9)', () => {
    const base = withAllergy(seed(), 'T12', 3)
    const { state, ticket: allergyTicket } = withSentAllergyTicket(base, {
      tableId: 'T12',
      sentAt: '2026-11-16T12:00:00.000Z',
      items: [{ seat: 3, dishId: 'steak-frites', kitchenStatus: 'Acknowledged' }],
    })
    expect(allergyTicket.acknowledgedAt).not.toBeNull()
    const { state: s2, ticket: newer } = withSentAllergyTicket(state, {
      tableId: 'T11',
      sentAt: '2026-11-16T12:05:00.000Z',
      items: [{ seat: 2, dishId: 'risotto' }],
    })
    expect(ids(sortTickets(s2.tickets, s2.orderItems))).toEqual([allergyTicket.id, 'seed-ticket-1', 'seed-ticket-2', newer.id])
  })

  function ackedTicket(items: Array<{ kitchenStatus: KitchenStatus; signOff?: boolean }>) {
    const base = withAllergy(seed(), 'T12', 3)
    return withSentAllergyTicket(base, {
      tableId: 'T12',
      sentAt: '2026-11-16T12:00:00.000Z',
      acknowledged: true,
      items: items.map((i) => ({ seat: 3, dishId: 'steak-frites', ...i })),
    })
  }

  it.each([
    ['Confirmed, not signed off', [{ kitchenStatus: 'Confirmed' as const }]],
    ['Acknowledged', [{ kitchenStatus: 'Acknowledged' as const }]],
    ['one signed off, one still Acknowledged', [{ kitchenStatus: 'Confirmed' as const, signOff: true }, { kitchenStatus: 'Acknowledged' as const }]],
    ['one Cannot confirm, one Confirmed not signed off', [{ kitchenStatus: 'Cannot confirm' as const }, { kitchenStatus: 'Confirmed' as const }]],
  ])('REQ-08: an acknowledged allergy ticket with an open item (%s) stays above all normal tickets', (_name, items) => {
    const { state, ticket } = ackedTicket(items)
    expect(ids(sortTickets(state.tickets, state.orderItems))).toEqual([ticket.id, 'seed-ticket-1', 'seed-ticket-2'])
  })

  it.each([
    ['every item signed off', [{ kitchenStatus: 'Confirmed' as const, signOff: true }, { kitchenStatus: 'Confirmed' as const, signOff: true }]],
    ['every item Cannot confirm', [{ kitchenStatus: 'Cannot confirm' as const }]],
    ['one signed off, one Cannot confirm', [{ kitchenStatus: 'Confirmed' as const, signOff: true }, { kitchenStatus: 'Cannot confirm' as const }]],
  ])('REQ-08: once no allergy item is open (%s) it drops back into sentAt order', (_name, items) => {
    const { state, ticket } = ackedTicket(items)
    expect(ids(sortTickets(state.tickets, state.orderItems))).toEqual(['seed-ticket-1', 'seed-ticket-2', ticket.id])
  })

  it('REQ-08: an unacknowledged allergy ticket stays above an older acknowledged allergy ticket with an open item', () => {
    const { state: s1, ticket: acked } = ackedTicket([{ kitchenStatus: 'Acknowledged' }])
    const { state, ticket: fresh } = withSentAllergyTicket(withAllergy(s1, 'T11', 1), {
      tableId: 'T11',
      sentAt: '2026-11-16T12:03:00.000Z',
      items: [{ seat: 1, dishId: 'risotto' }],
    })
    expect(fresh.acknowledgedAt).toBeNull()
    expect(ids(sortTickets(state.tickets, state.orderItems))).toEqual([fresh.id, acked.id, 'seed-ticket-1', 'seed-ticket-2'])
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

describe('offeredActions — dish lists the seat\'s allergen (V2, REQ-10)', () => {
  function ackedItem(dishId: string, state = withAllergy(seed(), 'T12', 3, { allergens: ['tree-nuts'] }), pickedChange?: string) {
    const { items, ticket } = withSentAllergyTicket(state, {
      tableId: 'T12',
      items: [{ seat: 3, dishId, kitchenStatus: 'Acknowledged', pickedChange }],
    })
    return { item: items[0], ticket }
  }

  it('REQ-10: an acknowledged walnut salad for a tree-nut seat offers "cannotConfirm" but not "confirm" (US4 scenario 8)', () => {
    const { item, ticket } = ackedItem('walnut-salad')
    expect(listsSnapshotAllergen(item, dish('walnut-salad'))).toBe(true)
    const actions = offeredActions(item, ticket, dish('walnut-salad'), 'station lead')
    expect(actions).not.toContain('confirm')
    expect(actions).toContain('cannotConfirm')
  })

  it('REQ-10: a picked chef-approved change does not bring "confirm" back (C-12)', () => {
    const { item, ticket } = ackedItem('walnut-salad', undefined, 'Without walnuts')
    expect(item.pickedChange).toBe('Without walnuts')
    const actions = offeredActions(item, ticket, dish('walnut-salad'), 'station lead')
    expect(actions).not.toContain('confirm')
    expect(actions).toContain('cannotConfirm')
  })

  it('REQ-10: a preference-severity snapshot allergen on an allergy-order seat also blocks "confirm" (R-15)', () => {
    let s = withAllergy(seed(), 'T12', 3, { allergens: ['milk'], severity: 'severe' })
    s = withAllergy(s, 'T12', 3, { allergens: ['tree-nuts'], severity: 'preference' })
    const { item, ticket } = ackedItem('walnut-salad', s)
    expect(item.isAllergyOrder).toBe(true)
    expect(listsSnapshotAllergen(item, dish('walnut-salad'))).toBe(true)
    expect(offeredActions(item, ticket, dish('walnut-salad'), 'station lead')).not.toContain('confirm')
  })

  it('REQ-10: steak frites for the same tree-nut seat still offers "confirm"', () => {
    const { item, ticket } = ackedItem('steak-frites')
    expect(listsSnapshotAllergen(item, dish('steak-frites'))).toBe(false)
    expect(offeredActions(item, ticket, dish('steak-frites'), 'station lead')).toContain('confirm')
  })

  it('REQ-10: the check uses the allergy snapshot, not the seat\'s current allergies', () => {
    const { item, ticket } = ackedItem('walnut-salad', withAllergy(seed(), 'T12', 3, { allergens: ['milk'] }))
    expect(listsSnapshotAllergen(item, dish('walnut-salad'))).toBe(false)
    expect(offeredActions(item, ticket, dish('walnut-salad'), 'station lead')).toContain('confirm')
  })
})

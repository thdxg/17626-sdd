import { describe, expect, it } from 'vitest'
import type { Action } from '../domain/actions'
import { reduce } from '../domain/actions'
import type { AppState, KitchenStatus } from '../domain/types'
import { seed, withAllergy, withDraftItem, withSentAllergyTicket } from './fixtures'

const NOW = new Date('2026-11-16T12:00:00.000Z')
const run = (state: AppState, action: Action, now: Date = NOW) => reduce(state, action, now)

const record = (over: Partial<Extract<Action, { type: 'recordAllergy' }>> = {}): Action => ({
  type: 'recordAllergy',
  tableId: 'T12',
  seatNumber: 3,
  allergens: ['tree-nuts'],
  severity: 'severe',
  traces: true,
  ...over,
})

describe('recordAllergy / addItem', () => {
  it('REQ-01: empty allergens returns the same reference', () => {
    const s = seed()
    expect(run(s, record({ allergens: [] }))).toBe(s)
  })

  it('REQ-01: missing severity returns the same reference (no default)', () => {
    const s = seed()
    expect(run(s, record({ severity: null }))).toBe(s)
    expect(run(s, record({ severity: undefined }))).toBe(s)
  })

  it('REQ-01: missing traces returns the same reference (no default)', () => {
    const s = seed()
    expect(run(s, record({ traces: null }))).toBe(s)
    expect(run(s, record({ traces: undefined }))).toBe(s)
  })

  it('REQ-01: an allergen outside the fixed list returns the same reference', () => {
    const s = seed()
    expect(run(s, record({ allergens: ['kiwi' as never] }))).toBe(s)
  })

  it('REQ-01: an unknown seat returns the same reference', () => {
    const s = seed()
    expect(run(s, record({ seatNumber: 9 }))).toBe(s)
  })

  it('REQ-01: a blank note is stored as undefined (scenario 2)', () => {
    const next = run(seed(), record({ note: '   ' }))
    const [a] = next.seats['T12:3'].allergies
    expect(a.note).toBeUndefined()
    expect(a.allergens).toEqual(['tree-nuts'])
    expect(a.severity).toBe('severe')
    expect(a.traces).toBe(true)
    expect(a.recordedAt).toBe(NOW.toISOString())
  })

  it('REQ-01: a note is trimmed', () => {
    const next = run(seed(), record({ note: ' x ' }))
    expect(next.seats['T12:3'].allergies[0].note).toBe('x')
  })

  it('REQ-02: an allergy for T12:3 is attached to that seat only (scenario 3)', () => {
    const next = run(seed(), record())
    expect(next.seats['T12:3'].allergies).toHaveLength(1)
    expect(next.seats['T12:2'].allergies).toHaveLength(0)
    expect(next.seats['T12:4'].allergies).toHaveLength(0)
    const others = Object.entries(next.seats).filter(([k]) => k !== 'T12:3')
    for (const [, seat] of others) expect(seat.allergies).toHaveLength(0)
  })

  it('REQ-02: a second allergy on the same seat is added, not replaced', () => {
    const once = run(seed(), record())
    const twice = run(once, record({ allergens: ['milk'], severity: 'intolerance', traces: false }))
    expect(twice.seats['T12:3'].allergies.map((a) => a.allergens[0])).toEqual(['tree-nuts', 'milk'])
    expect(new Set(twice.seats['T12:3'].allergies.map((a) => a.id)).size).toBe(2)
  })

  it('REQ-03: addItem with an unknown dish returns the same reference', () => {
    const s = seed()
    expect(run(s, { type: 'addItem', tableId: 'T12', seatNumber: 3, dishId: 'nope' })).toBe(s)
  })

  it('REQ-02 REQ-03: a new draft item has ticketId null and isAllergyOrder null', () => {
    const s = seed()
    const next = run(s, { type: 'addItem', tableId: 'T12', seatNumber: 3, dishId: 'walnut-salad' })
    const added = Object.values(next.orderItems).filter((i) => !(i.id in s.orderItems))
    expect(added).toHaveLength(1)
    expect(added[0]).toMatchObject({
      tableId: 'T12',
      seatNumber: 3,
      dishId: 'walnut-salad',
      ticketId: null,
      isAllergyOrder: null,
      allergySnapshot: null,
      kitchenStatus: null,
      review: null,
      cannotConfirm: null,
      signOff: null,
      pickedChange: null,
    })
  })

  it('REQ-02: removeDraftItem removes a draft; an unknown item returns the same reference', () => {
    const s = seed()
    const withItem = run(s, { type: 'addItem', tableId: 'T12', seatNumber: 3, dishId: 'risotto' })
    const id = Object.keys(withItem.orderItems).find((k) => !(k in s.orderItems))!
    expect(Object.keys(run(withItem, { type: 'removeDraftItem', itemId: id }).orderItems)).not.toContain(id)
    expect(run(withItem, { type: 'removeDraftItem', itemId: 'nope' })).toBe(withItem)
  })
})

describe('sendOrder / acknowledge', () => {
  function drafts() {
    let s = withAllergy(seed(), 'T12', 3, { allergens: ['tree-nuts'], severity: 'severe' })
    s = withDraftItem(s, 'T12', 3, 'walnut-salad')
    s = withDraftItem(s, 'T12', 3, 'steak-frites')
    s = withDraftItem(s, 'T12', 2, 'green-salad')
    s = withDraftItem(s, 'T11', 1, 'risotto') // another table: not sent with T12
    return s
  }

  function sent() {
    const before = drafts()
    const after = run(before, { type: 'sendOrder', tableId: 'T12' })
    const ticket = after.tickets[after.tickets.length - 1]
    return { before, after, ticket }
  }

  it('REQ-03: sendOrder with no drafts returns the same reference', () => {
    const s = seed()
    expect(run(s, { type: 'sendOrder', tableId: 'T12' })).toBe(s)
  })

  it('REQ-03 REQ-06: sendOrder creates one ticket for the table with all its drafts (A-7)', () => {
    const { before, after, ticket } = sent()
    expect(after.tickets).toHaveLength(before.tickets.length + 1)
    expect(ticket).toMatchObject({ tableId: 'T12', sentAt: NOW.toISOString(), acknowledgedAt: null })
    expect(ticket.itemIds).toHaveLength(3)
    for (const id of ticket.itemIds) expect(after.orderItems[id].ticketId).toBe(ticket.id)
    const t11 = Object.values(after.orderItems).find((i) => i.tableId === 'T11' && i.dishId === 'risotto')!
    expect(t11.ticketId).toBeNull()
  })

  it('REQ-03 REQ-06: allergy items get the seat snapshot and kitchen status "Sent" (A-8); normal items get null', () => {
    const { before, after, ticket } = sent()
    const items = ticket.itemIds.map((id) => after.orderItems[id])
    const seat3 = items.filter((i) => i.seatNumber === 3)
    const seat2 = items.filter((i) => i.seatNumber === 2)
    for (const i of seat3) {
      expect(i.isAllergyOrder).toBe(true)
      expect(i.kitchenStatus).toBe('Sent')
      expect(i.allergySnapshot).toEqual(before.seats['T12:3'].allergies)
    }
    expect(seat2[0]).toMatchObject({ isAllergyOrder: false, kitchenStatus: null, allergySnapshot: [] })
  })

  it('REQ-06: the snapshot does not change when the seat allergy changes after sending (R-10)', () => {
    const { after, ticket } = sent()
    const later = run(after, { type: 'recordAllergy', tableId: 'T12', seatNumber: 3, allergens: ['milk'], severity: 'severe', traces: false })
    const item = later.orderItems[ticket.itemIds[0]]
    expect(item.allergySnapshot!.flatMap((a) => a.allergens)).toEqual(['tree-nuts'])
  })

  it('REQ-22: removeDraftItem on a sent item returns the same reference', () => {
    const { after, ticket } = sent()
    expect(run(after, { type: 'removeDraftItem', itemId: ticket.itemIds[0] })).toBe(after)
  })

  it('REQ-09: acknowledge by the station lead sets acknowledgedAt and moves only Sent allergy items to Acknowledged (scenario 4)', () => {
    const { after, ticket } = sent()
    const later = new Date('2026-11-16T12:00:30.000Z')
    const acked = run(after, { type: 'acknowledge', ticketId: ticket.id, role: 'station lead' }, later)
    const t = acked.tickets.find((x) => x.id === ticket.id)!
    expect(t.acknowledgedAt).toBe(later.toISOString())
    for (const id of ticket.itemIds) {
      const i = acked.orderItems[id]
      expect(i.kitchenStatus).toBe(i.isAllergyOrder ? 'Acknowledged' : null)
    }
  })

  it.each(['expediter', 'server'] as const)('REQ-09: acknowledge by the %s returns the same reference', (role) => {
    const { after, ticket } = sent()
    expect(run(after, { type: 'acknowledge', ticketId: ticket.id, role })).toBe(after)
  })

  it('REQ-09: acknowledging twice returns the same reference', () => {
    const { after, ticket } = sent()
    const once = run(after, { type: 'acknowledge', ticketId: ticket.id, role: 'station lead' })
    expect(run(once, { type: 'acknowledge', ticketId: ticket.id, role: 'station lead' })).toBe(once)
  })

  it('REQ-09: acknowledging a non-allergy ticket or an unknown ticket returns the same reference', () => {
    const s = seed()
    expect(run(s, { type: 'acknowledge', ticketId: 'seed-ticket-1', role: 'station lead' })).toBe(s)
    expect(run(s, { type: 'acknowledge', ticketId: 'nope', role: 'station lead' })).toBe(s)
  })
})

describe('confirm / cannotConfirm / signOff', () => {
  function acked(dishId: string, kitchenStatus: KitchenStatus = 'Acknowledged') {
    const { state, items } = withSentAllergyTicket(withAllergy(seed(), 'T12', 3), {
      tableId: 'T12',
      items: [{ seat: 3, dishId, kitchenStatus }],
    })
    return { state, itemId: items[0].id }
  }
  const LATER = new Date('2026-11-16T12:02:00.000Z')

  it('REQ-10: confirm → "Confirmed" with review { role: station lead, at: now } (scenario 1)', () => {
    const { state, itemId } = acked('steak-frites')
    const next = run(state, { type: 'confirm', itemId, role: 'station lead' }, LATER)
    expect(next.orderItems[itemId].kitchenStatus).toBe('Confirmed')
    expect(next.orderItems[itemId].review).toEqual({ role: 'station lead', at: LATER.toISOString() })
  })

  it('REQ-10: confirm on Sent, on the daily special, or by the expediter returns the same reference', () => {
    const sent = acked('steak-frites', 'Sent')
    expect(run(sent.state, { type: 'confirm', itemId: sent.itemId, role: 'station lead' })).toBe(sent.state)
    const special = acked('daily-special')
    expect(run(special.state, { type: 'confirm', itemId: special.itemId, role: 'station lead' })).toBe(special.state)
    const ok = acked('steak-frites')
    expect(run(ok.state, { type: 'confirm', itemId: ok.itemId, role: 'expediter' })).toBe(ok.state)
    expect(run(ok.state, { type: 'confirm', itemId: 'nope', role: 'station lead' })).toBe(ok.state)
  })

  it('REQ-11: cannotConfirm with a reason → "Cannot confirm" with the trimmed reason, role and time (scenario 4)', () => {
    const { state, itemId } = acked('daily-special')
    const next = run(state, { type: 'cannotConfirm', itemId, role: 'station lead', reason: '  Supplier sheet missing ' }, LATER)
    expect(next.orderItems[itemId].kitchenStatus).toBe('Cannot confirm')
    expect(next.orderItems[itemId].cannotConfirm).toEqual({
      role: 'station lead',
      reason: 'Supplier sheet missing',
      at: LATER.toISOString(),
    })
  })

  it.each(['', '   ', '\n\t'])('REQ-11: a blank reason (%j) returns the same reference; status unchanged (scenario 5)', (reason) => {
    const { state, itemId } = acked('daily-special')
    const next = run(state, { type: 'cannotConfirm', itemId, role: 'station lead', reason })
    expect(next).toBe(state)
    expect(next.orderItems[itemId].kitchenStatus).toBe('Acknowledged')
  })

  it('REQ-11: cannotConfirm on Sent or by the expediter returns the same reference', () => {
    const sent = acked('steak-frites', 'Sent')
    expect(run(sent.state, { type: 'cannotConfirm', itemId: sent.itemId, role: 'station lead', reason: 'x' })).toBe(sent.state)
    const ok = acked('steak-frites')
    expect(run(ok.state, { type: 'cannotConfirm', itemId: ok.itemId, role: 'expediter', reason: 'x' })).toBe(ok.state)
  })

  it('REQ-14: signOff on Confirmed → signOff { role: expediter, at } (scenario 6)', () => {
    const { state, itemId } = acked('steak-frites', 'Confirmed')
    const next = run(state, { type: 'signOff', itemId, role: 'expediter' }, LATER)
    expect(next.orderItems[itemId].signOff).toEqual({ role: 'expediter', at: LATER.toISOString() })
    expect(next.orderItems[itemId].kitchenStatus).toBe('Confirmed')
  })

  it('REQ-14: signOff on any other status, twice, or by the station lead returns the same reference', () => {
    for (const status of ['Sent', 'Acknowledged', 'Cannot confirm'] as const) {
      const { state, itemId } = acked('steak-frites', status)
      expect(run(state, { type: 'signOff', itemId, role: 'expediter' })).toBe(state)
    }
    const { state, itemId } = acked('steak-frites', 'Confirmed')
    expect(run(state, { type: 'signOff', itemId, role: 'station lead' })).toBe(state)
    const once = run(state, { type: 'signOff', itemId, role: 'expediter' })
    expect(run(once, { type: 'signOff', itemId, role: 'expediter' })).toBe(once)
  })
})

import { describe, expect, it } from 'vitest'
import { ALLERGENS } from '../data/allergens'
import { LABEL } from '../domain/labels'
import { createShared, renderApp } from './renderApp'
import { seed, withAllergy, withDraftItem } from './fixtures'
import { orderItem, orderItems, text, ticketCards } from './dom'

async function openSeat(r: ReturnType<typeof renderApp>, table: string, seat: number) {
  await r.user.click(r.screen.getByRole('button', { name: `Table ${table}` }))
  await r.user.click(r.screen.getByRole('button', { name: `Seat ${seat}` }))
}

const saveButton = (r: ReturnType<typeof renderApp>) =>
  r.screen.getByRole('button', { name: 'Save allergy' }) as HTMLButtonElement

describe('US1 allergy panel', () => {
  it('REQ-01: the seat view offers the fixed allergens, 4 severities, traces and an optional note (scenario 1)', async () => {
    const r = renderApp({ path: '/server', role: 'server' })
    await openSeat(r, '12', 3)
    for (const a of ALLERGENS) expect(r.screen.getByRole('button', { name: a.name })).toBeTruthy()
    for (const s of ['severe allergy', 'intolerance', 'preference', 'unknown']) {
      expect(r.screen.getByRole('button', { name: s })).toBeTruthy()
    }
    expect(r.screen.getByRole('button', { name: 'Traces: yes' })).toBeTruthy()
    expect(r.screen.getByRole('button', { name: 'Traces: no' })).toBeTruthy()
    expect(r.screen.getByLabelText('Note (optional)')).toBeTruthy()
  })

  it('REQ-01: "Save allergy" is disabled until an allergen, a severity and a traces value are chosen', async () => {
    const r = renderApp({ path: '/server', role: 'server' })
    await openSeat(r, '12', 3)
    expect(saveButton(r).disabled).toBe(true)
    await r.user.click(r.screen.getByRole('button', { name: 'Tree nuts' }))
    expect(saveButton(r).disabled).toBe(true)
    await r.user.click(r.screen.getByRole('button', { name: 'severe allergy' }))
    expect(saveButton(r).disabled).toBe(true)
    await r.user.click(r.screen.getByRole('button', { name: 'Traces: yes' }))
    expect(saveButton(r).disabled).toBe(false)
  })

  it('REQ-01: saving with an empty note works (scenario 2) and clears the panel', async () => {
    const r = renderApp({ path: '/server', role: 'server' })
    await openSeat(r, '12', 3)
    await r.user.click(r.screen.getByRole('button', { name: 'Milk' }))
    await r.user.click(r.screen.getByRole('button', { name: 'intolerance' }))
    await r.user.click(r.screen.getByRole('button', { name: 'Traces: no' }))
    await r.user.click(saveButton(r))
    const [a] = r.store.getSnapshot().seats['T12:3'].allergies
    expect(a).toMatchObject({ allergens: ['milk'], severity: 'intolerance', traces: false })
    expect(a.note).toBeUndefined()
    expect(saveButton(r).disabled).toBe(true)
    expect(r.screen.getByRole('button', { name: 'Milk' }).getAttribute('aria-pressed')).toBe('false')
  })

  it('REQ-01: a typed note is saved', async () => {
    const r = renderApp({ path: '/server', role: 'server' })
    await openSeat(r, '12', 3)
    await r.user.click(r.screen.getByRole('button', { name: 'Sesame' }))
    await r.user.click(r.screen.getByRole('button', { name: 'unknown' }))
    await r.user.click(r.screen.getByRole('button', { name: 'Traces: yes' }))
    await r.user.type(r.screen.getByLabelText('Note (optional)'), ' Guest unsure ')
    await r.user.click(saveButton(r))
    expect(r.store.getSnapshot().seats['T12:3'].allergies[0].note).toBe('Guest unsure')
  })

  it('REQ-02 REQ-03: the allergy shows on seat 3 and both its items, and on no item of seats 2 and 4 (scenarios 3, 4)', async () => {
    let s = withAllergy(seed(), 'T12', 3, { allergens: ['tree-nuts'], severity: 'severe' })
    s = withDraftItem(s, 'T12', 3, 'risotto')
    s = withDraftItem(s, 'T12', 3, 'green-salad')
    s = withDraftItem(s, 'T12', 2, 'steak-frites')
    s = withDraftItem(s, 'T12', 4, 'fish-chips')
    const r = renderApp({ path: '/server', role: 'server', state: s })
    await openSeat(r, '12', 3)
    const root = r.container

    const seat3 = root.querySelector<HTMLElement>('[data-testid="seat-strip"] [data-seat="3"]')!
    expect(text(seat3)).toContain('Tree nuts')
    for (const n of [2, 4]) {
      expect(text(root.querySelector<HTMLElement>(`[data-testid="seat-strip"] [data-seat="${n}"]`)!)).not.toContain('Tree nuts')
    }

    for (const dish of ['risotto', 'green-salad']) {
      const el = orderItem(root, dish, 3)
      expect(text(el)).toContain('Tree nuts')
      expect(text(el)).toContain(LABEL.allergyOrder)
    }
    for (const el of [...orderItems(root, { seat: 2 }), ...orderItems(root, { seat: 4 })]) {
      expect(text(el)).not.toContain('Tree nuts')
      expect(text(el)).not.toContain(LABEL.allergyOrder)
    }
    expect(orderItems(root, { seat: 2 })).toHaveLength(1)
    expect(orderItems(root, { seat: 4 })).toHaveLength(1)
  })

  it('REQ-02: an item added after the allergy carries it; "Add" adds to the selected seat', async () => {
    const s = withAllergy(seed(), 'T12', 3, { severity: 'intolerance', allergens: ['milk'] })
    const r = renderApp({ path: '/server', role: 'server', state: s })
    await openSeat(r, '12', 3)
    await r.user.click(r.screen.getByRole('button', { name: 'Add Steak frites' }))
    const el = orderItem(r.container, 'steak-frites', 3)
    expect(text(el)).toContain('Milk')
    expect(text(el)).toContain(LABEL.allergyOrder)
  })

  it('REQ-18: an item for a preference-only seat is not an allergy order, before or after "Send order" (scenario 6)', async () => {
    let s = withAllergy(seed(), 'T12', 5, { allergens: ['milk'], severity: 'preference' })
    s = withDraftItem(s, 'T12', 5, 'risotto')
    const shared = createShared(s)
    const tablet = renderApp({ path: '/server', role: 'server', shared })
    const kitchen = renderApp({ path: '/kitchen', role: 'station lead', shared })
    await tablet.user.click(tablet.screen.getByRole('button', { name: 'Table 12' }))
    expect(text(orderItem(tablet.container, 'risotto', 5))).not.toContain(LABEL.allergyOrder)
    await tablet.user.click(tablet.screen.getByRole('button', { name: 'Send order' }))
    const snap = tablet.store.getSnapshot()
    const ticket = snap.tickets[snap.tickets.length - 1]
    const item = snap.orderItems[ticket.itemIds[0]]
    expect(item.isAllergyOrder).toBe(false)
    expect(item.kitchenStatus).toBeNull()
    expect(text(orderItem(tablet.container, 'risotto', 5))).not.toContain(LABEL.allergyOrder)
    expect(text(orderItem(tablet.container, 'risotto', 5))).not.toContain('Kitchen:')
    const card = ticketCards(kitchen.container).find((c) => c.dataset.ticket === ticket.id)!
    expect(text(card)).not.toContain(LABEL.allergyNotAcknowledged)
    expect(card.querySelector('[data-testid="kitchen-status"]')).toBeNull()
    expect(kitchen.screen.queryByRole('button', { name: 'Acknowledge' })).toBeNull()
  })

  it('REQ-02: "Remove" removes a draft item', async () => {
    const r = renderApp({ path: '/server', role: 'server', state: withDraftItem(seed(), 'T12', 1, 'risotto') })
    await r.user.click(r.screen.getByRole('button', { name: 'Table 12' }))
    await r.user.click(r.screen.getByRole('button', { name: 'Remove Mushroom risotto' }))
    expect(orderItems(r.container, { dish: 'risotto' })).toHaveLength(0)
  })
})

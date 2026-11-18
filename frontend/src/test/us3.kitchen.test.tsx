import { act, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { LABEL } from '../domain/labels'
import { renderApp } from './renderApp'
import { seed, withAllergy, withDraftItem, withSentAllergyTicket } from './fixtures'
import { kitchenItem, orderItems, text, ticketCards } from './dom'

function kitchenState() {
  const s = withAllergy(seed(), 'T12', 3, { allergens: ['tree-nuts'], severity: 'severe' })
  return withSentAllergyTicket(s, {
    tableId: 'T12',
    sentAt: '2026-11-16T12:00:00.000Z',
    items: [
      { seat: 3, dishId: 'walnut-salad' },
      { seat: 3, dishId: 'steak-frites' },
      { seat: 2, dishId: 'green-salad' },
    ],
  })
}

describe('US3 kitchen display', () => {
  it('REQ-08 REQ-06 REQ-07: the allergy ticket is first, labelled, and its items show allergen, severity, seat, cross-contact', () => {
    const { state, ticket } = kitchenState()
    const r = renderApp({ path: '/kitchen', role: 'station lead', state })
    const cards = ticketCards(r.container)
    expect(cards).toHaveLength(3)
    expect(cards[0].dataset.ticket).toBe(ticket.id)
    expect(text(cards[0])).toContain(LABEL.allergyNotAcknowledged)
    expect(text(cards[0])).toContain('Table 12')
    for (const c of cards.slice(1)) expect(text(c)).not.toContain(LABEL.allergyNotAcknowledged)

    for (const dish of ['walnut-salad', 'steak-frites']) {
      const el = kitchenItem(r.container, dish, 3)
      expect(text(el)).toContain('Tree nuts')
      expect(text(el)).toContain('severe allergy')
      expect(text(el)).toContain('seat 3')
    }
    expect(text(kitchenItem(r.container, 'steak-frites', 3))).toContain('Cross-contact: fryer')
    expect(text(kitchenItem(r.container, 'walnut-salad', 3))).not.toContain('Cross-contact')
  })

  it('REQ-08: a newer normal ticket dispatched into the store does not move the allergy ticket down', async () => {
    const { state, ticket } = kitchenState()
    const r = renderApp({ path: '/kitchen', role: 'station lead', state: withDraftItem(state, 'T11', 1, 'risotto') })
    r.shared.clock.advance(60_000)
    act(() => r.store.dispatch({ type: 'sendOrder', tableId: 'T11' }))
    const cards = ticketCards(r.container)
    expect(cards).toHaveLength(4)
    expect(cards[0].dataset.ticket).toBe(ticket.id)
    expect(text(cards[0])).toContain(LABEL.allergyNotAcknowledged)
  })

  it('REQ-09: "Acknowledge" removes the label and the allergy items show "Acknowledged" (scenario 4)', async () => {
    const { state, ticket } = kitchenState()
    const r = renderApp({ path: '/kitchen', role: 'station lead', state })
    await r.user.click(r.screen.getByRole('button', { name: 'Acknowledge' }))
    expect(r.store.getSnapshot().tickets.find((t) => t.id === ticket.id)!.acknowledgedAt).not.toBeNull()
    const card = ticketCards(r.container).find((c) => c.dataset.ticket === ticket.id)!
    expect(text(card)).not.toContain(LABEL.allergyNotAcknowledged)
    for (const dish of ['walnut-salad', 'steak-frites']) {
      expect(kitchenItem(r.container, dish, 3).querySelector('[data-testid="kitchen-status"]')!.textContent).toBe('Acknowledged')
    }
    expect(r.screen.queryByRole('button', { name: 'Acknowledge' })).toBeNull()
  })

  it('REQ-09: the expediter is not offered "Acknowledge"', () => {
    const { state } = kitchenState()
    const r = renderApp({ path: '/kitchen', role: 'expediter', state })
    expect(r.screen.queryByRole('button', { name: 'Acknowledge' })).toBeNull()
    expect(text(ticketCards(r.container)[0])).toContain(LABEL.allergyNotAcknowledged)
  })

  it('REQ-06: a normal item shows the dish name and seat only, never the allergy label', () => {
    const { state, ticket } = kitchenState()
    const r = renderApp({ path: '/kitchen', role: 'station lead', state })
    const card = ticketCards(r.container).find((c) => c.dataset.ticket === ticket.id)!
    const el = kitchenItem(card, 'green-salad', 2)
    expect(el.dataset.kind).toBe('normal')
    expect(text(el)).toBe('Green salad · seat 2')
    expect(text(el)).not.toContain(LABEL.allergyNotAcknowledged)
    expect(text(el)).not.toContain(LABEL.allergyOrder)
  })

  it('REQ-06: on /server "Send order" sends all drafts for the table', async () => {
    let s = withAllergy(seed(), 'T12', 3)
    s = withDraftItem(s, 'T12', 3, 'walnut-salad')
    s = withDraftItem(s, 'T12', 2, 'green-salad')
    const r = renderApp({ path: '/server', role: 'server', state: s })
    await r.user.click(r.screen.getByRole('button', { name: 'Table 12' }))
    await r.user.click(r.screen.getByRole('button', { name: 'Send order' }))
    const snap = r.store.getSnapshot()
    const t = snap.tickets[snap.tickets.length - 1]
    expect(t.tableId).toBe('T12')
    expect(t.itemIds).toHaveLength(2)
    for (const el of orderItems(r.container)) expect(el.dataset.sent).toBe('true')
    expect(r.screen.queryByRole('button', { name: /^Remove / })).toBeNull()
  })

  it('REQ-06: an allergy item shows "Traces: yes" as text when the seat allergy says traces matter (scenario 8)', () => {
    const { state } = kitchenState()
    const r = renderApp({ path: '/kitchen', role: 'station lead', state })
    for (const dish of ['walnut-salad', 'steak-frites']) expect(text(kitchenItem(r.container, dish, 3))).toContain('Traces: yes')
    expect(text(kitchenItem(r.container, 'green-salad', 2))).not.toContain('Traces')
  })

  it('REQ-06: "Traces: no" when the seat allergy says traces do not matter', () => {
    const s = withAllergy(seed(), 'T12', 3, { traces: false })
    const { state } = withSentAllergyTicket(s, { tableId: 'T12', items: [{ seat: 3, dishId: 'steak-frites' }] })
    const r = renderApp({ path: '/kitchen', role: 'station lead', state })
    expect(text(kitchenItem(r.container, 'steak-frites', 3))).toContain('Traces: no')
  })

  it('REQ-08: after "Acknowledge" the allergy ticket stays above the seeded normal tickets (scenario 9)', async () => {
    const { state, ticket } = kitchenState()
    const r = renderApp({ path: '/kitchen', role: 'station lead', state: withDraftItem(state, 'T11', 1, 'risotto') })
    await r.user.click(r.screen.getByRole('button', { name: 'Acknowledge' }))
    r.shared.clock.advance(60_000)
    act(() => r.store.dispatch({ type: 'sendOrder', tableId: 'T11' }))
    const cards = ticketCards(r.container)
    expect(cards).toHaveLength(4)
    expect(cards[0].dataset.ticket).toBe(ticket.id)
    // Rank 1 has no label (R-18); only rank 0 shows "ALLERGY – NOT ACKNOWLEDGED".
    expect(text(cards[0])).not.toContain(LABEL.allergyNotAcknowledged)
  })

  it('REQ-10 REQ-20: the walnut salad shows the picked change and offers no "Confirm"; steak frites still does (US4 scenario 8)', () => {
    const s = withAllergy(seed(), 'T12', 3, { allergens: ['tree-nuts'], severity: 'severe' })
    const { state } = withSentAllergyTicket(s, {
      tableId: 'T12',
      items: [
        { seat: 3, dishId: 'walnut-salad', kitchenStatus: 'Acknowledged', pickedChange: 'Without walnuts' },
        { seat: 3, dishId: 'steak-frites', kitchenStatus: 'Acknowledged' },
      ],
    })
    const r = renderApp({ path: '/kitchen', role: 'station lead', state })
    const salad = kitchenItem(r.container, 'walnut-salad', 3)
    expect(text(salad)).toContain('Chef-approved change: Without walnuts')
    expect(within(salad).queryByRole('button', { name: 'Confirm' })).toBeNull()
    expect(within(salad).getByRole('button', { name: 'Cannot confirm' })).toBeTruthy()
    const steak = kitchenItem(r.container, 'steak-frites', 3)
    expect(text(steak)).not.toContain('Chef-approved change')
    expect(within(steak).getByRole('button', { name: 'Confirm' })).toBeTruthy()
  })
})

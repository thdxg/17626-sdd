// SC-006: one allergy order through the full round trip, two "tabs" sharing fake storage + channel
// (quickstart.md §3 steps 2–8).
import { within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { LABEL } from '../domain/labels'
import { createShared, renderApp } from './renderApp'
import { dishRow, kitchenItem, labelsIn, orderItem, text, ticketCards } from './dom'

const FORBIDDEN = /safe|allergen[\s-]*free/i

describe('SC-006 full round trip', () => {
  it('REQ-01 REQ-02 REQ-03 REQ-04 REQ-05 REQ-06 REQ-07 REQ-08 REQ-09 REQ-10 REQ-11 REQ-12 REQ-13 REQ-14 REQ-15 REQ-16 REQ-17: record → check → send → acknowledge → confirm → sign off → "OK to serve"', async () => {
    const shared = createShared()
    const tablet = renderApp({ path: '/server', role: 'server', shared })
    const kitchen = renderApp({ path: '/kitchen', role: 'station lead', shared })
    const T = tablet.screen
    const K = kitchen.screen
    const noSafe = () => expect(document.body.textContent).not.toMatch(FORBIDDEN)

    // Step 2: record tree nuts / severe / traces yes on Table 12 seat 3 in 4 taps.
    await tablet.user.click(T.getByRole('button', { name: 'Table 12' }))
    await tablet.user.click(T.getByRole('button', { name: 'Seat 3' }))
    let taps = 0
    for (const name of ['Tree nuts', 'severe allergy', 'Traces: yes', 'Save allergy']) {
      taps++
      await tablet.user.click(T.getByRole('button', { name }))
    }
    expect(taps).toBe(4)
    const seats = tablet.store.getSnapshot().seats
    expect(seats['T12:3'].allergies).toHaveLength(1)
    expect(seats['T12:2'].allergies).toHaveLength(0)
    expect(seats['T12:4'].allergies).toHaveLength(0)
    noSafe()

    // Step 3: menu labels for seat 3.
    expect(labelsIn(dishRow(tablet.container, 'walnut-salad'))).toContain('Contains Tree nuts')
    expect(labelsIn(dishRow(tablet.container, 'steak-frites'))).toEqual([LABEL.notConfirmed])
    expect(labelsIn(dishRow(tablet.container, 'daily-special'))).toContain(LABEL.cannotConfirm)
    for (const name of ['Pear & walnut salad', 'Steak frites', 'Daily special']) {
      await tablet.user.click(T.getByRole('button', { name: `Add ${name}` }))
    }
    await tablet.user.click(T.getByRole('button', { name: 'Seat 2' }))
    await tablet.user.click(T.getByRole('button', { name: 'Add Green salad' }))
    expect(text(orderItem(tablet.container, 'green-salad', 2))).not.toContain('Tree nuts')
    await tablet.user.click(T.getByRole('button', { name: 'Send order' }))
    noSafe()

    // Step 4: kitchen shows the ticket on top with the labels.
    const top = () => ticketCards(kitchen.container)[0]
    expect(text(top())).toContain('Table 12')
    expect(text(top())).toContain(LABEL.allergyNotAcknowledged)
    for (const dish of ['walnut-salad', 'steak-frites', 'daily-special']) {
      const el = kitchenItem(top(), dish, 3)
      for (const t of ['Tree nuts', 'severe allergy', 'seat 3']) expect(text(el)).toContain(t)
    }
    expect(text(kitchenItem(top(), 'steak-frites', 3))).toContain('Cross-contact: fryer')
    expect(kitchenItem(top(), 'green-salad', 2).dataset.kind).toBe('normal')
    await kitchen.user.click(K.getByRole('button', { name: 'Acknowledge' }))
    expect(labelsIn(orderItem(tablet.container, 'steak-frites', 3))).toContain(LABEL.kitchenAcknowledged)

    // Step 6: confirm steak frites; daily special: no Confirm; empty reason then a reason.
    const card = ticketCards(kitchen.container).find((c) => c.dataset.ticket && text(c).includes('Table 12'))!
    const steakK = () => kitchenItem(card, 'steak-frites', 3)
    const specialK = () => kitchenItem(card, 'daily-special', 3)
    await kitchen.user.click(within(steakK()).getByRole('button', { name: 'Confirm' }))
    expect(within(specialK()).queryByRole('button', { name: 'Confirm' })).toBeNull()
    await kitchen.user.click(within(specialK()).getByRole('button', { name: 'Cannot confirm' }))
    await kitchen.user.click(within(specialK()).getByRole('button', { name: 'Save' }))
    expect(specialK().querySelector('[data-testid="kitchen-status"]')!.textContent).toBe('Acknowledged')
    await kitchen.user.type(within(specialK()).getByLabelText('Reason'), 'Supplier sheet missing')
    await kitchen.user.click(within(specialK()).getByRole('button', { name: 'Save' }))
    noSafe()

    // Step 7: tablet shows "Confirmed" without "OK to serve", and "Cannot confirm" + reason.
    const steakT = () => orderItem(tablet.container, 'steak-frites', 3)
    const specialT = () => orderItem(tablet.container, 'daily-special', 3)
    expect(labelsIn(steakT())).toContain(LABEL.confirmed)
    expect(labelsIn(steakT())).not.toContain(LABEL.okToServe)
    expect(labelsIn(specialT())).toContain(LABEL.cannotConfirm)
    expect(labelsIn(specialT())).toContain('Reason: Supplier sheet missing')
    expect(labelsIn(orderItem(tablet.container, 'walnut-salad', 3))).not.toContain(LABEL.confirmed)

    // Step 8: expediter — only steak frites offers Sign off.
    await kitchen.user.click(K.getByRole('button', { name: 'Expediter' }))
    const signOffs = K.getAllByRole('button', { name: 'Sign off' })
    expect(signOffs).toHaveLength(1)
    expect(within(steakK()).getByRole('button', { name: 'Sign off' })).toBe(signOffs[0])
    await kitchen.user.click(signOffs[0])
    expect(labelsIn(steakT())).toContain(LABEL.okToServe)
    expect(labelsIn(specialT())).not.toContain(LABEL.okToServe)
    expect(text(orderItem(tablet.container, 'green-salad', 2))).not.toContain('Tree nuts')
    noSafe()
  })

  it('REQ-05 REQ-06 REQ-08 REQ-10 REQ-20: pick "Without walnuts" → send → kitchen sees traces and the change, no "Confirm"; ticket stays up until "Cannot confirm" (SC-008)', async () => {
    const shared = createShared()
    const tablet = renderApp({ path: '/server', role: 'server', shared })
    const kitchen = renderApp({ path: '/kitchen', role: 'station lead', shared })
    const T = tablet.screen
    const K = kitchen.screen
    const saladT = () => orderItem(tablet.container, 'walnut-salad', 3)
    // SC-008: the tablet never shows "Confirmed" or "OK to serve" for the walnut salad.
    const neverConfirmed = () => {
      expect(labelsIn(saladT())).not.toContain(LABEL.confirmed)
      expect(labelsIn(saladT())).not.toContain(LABEL.okToServe)
      expect(text(saladT())).not.toMatch(/Confirmed|OK to serve/)
      expect(document.body.textContent).not.toMatch(FORBIDDEN)
    }

    await tablet.user.click(T.getByRole('button', { name: 'Table 12' }))
    await tablet.user.click(T.getByRole('button', { name: 'Seat 3' }))
    for (const name of ['Tree nuts', 'severe allergy', 'Traces: yes', 'Save allergy']) {
      await tablet.user.click(T.getByRole('button', { name }))
    }
    await tablet.user.click(T.getByRole('button', { name: 'Add Pear & walnut salad' }))
    await tablet.user.click(T.getByRole('button', { name: 'Add Steak frites' }))
    neverConfirmed()

    // US2 scenario 9: pick the chef-approved change, then send.
    await tablet.user.click(within(saladT()).getByRole('button', { name: 'Without walnuts' }))
    expect(text(saladT())).toContain('Chef-approved change: Without walnuts')
    expect(labelsIn(saladT())).toContain('Contains Tree nuts')
    neverConfirmed()
    await tablet.user.click(T.getByRole('button', { name: 'Send order' }))
    expect(text(saladT())).toContain('Chef-approved change: Without walnuts')
    expect(within(saladT()).queryByRole('button', { name: 'Without walnuts' })).toBeNull()
    neverConfirmed()

    // US3 scenario 8: the kitchen item shows traces and the change.
    const card = () => ticketCards(kitchen.container).find((c) => text(c).includes('Table 12'))!
    const saladK = () => kitchenItem(card(), 'walnut-salad', 3)
    for (const t of ['Tree nuts', 'severe allergy', 'Traces: yes', 'seat 3', 'Chef-approved change: Without walnuts']) {
      expect(text(saladK())).toContain(t)
    }
    expect(ticketCards(kitchen.container)[0]).toBe(card())
    await kitchen.user.click(K.getByRole('button', { name: 'Acknowledge' }))
    neverConfirmed()

    // US3 scenario 9: still above the seeded normal tickets after "Acknowledge".
    const order = () => ticketCards(kitchen.container).map((c) => c.dataset.ticket)
    expect(ticketCards(kitchen.container)[0]).toBe(card())
    expect(order().slice(1)).toEqual(['seed-ticket-1', 'seed-ticket-2'])

    // US4 scenario 8 / C-12: no "Confirm" on the salad even with the change; steak frites has one.
    expect(within(saladK()).queryByRole('button', { name: 'Confirm' })).toBeNull()
    expect(within(kitchenItem(card(), 'steak-frites', 3)).getByRole('button', { name: 'Confirm' })).toBeTruthy()

    // The expediter has nothing to sign off on the salad.
    await kitchen.user.click(K.getByRole('button', { name: 'Expediter' }))
    expect(within(saladK()).queryByRole('button', { name: 'Sign off' })).toBeNull()
    await kitchen.user.click(K.getByRole('button', { name: 'Station lead' }))

    // Confirm and sign off the steak; the salad is still open, so the ticket stays on top.
    await kitchen.user.click(within(kitchenItem(card(), 'steak-frites', 3)).getByRole('button', { name: 'Confirm' }))
    await kitchen.user.click(K.getByRole('button', { name: 'Expediter' }))
    await kitchen.user.click(within(kitchenItem(card(), 'steak-frites', 3)).getByRole('button', { name: 'Sign off' }))
    expect(labelsIn(orderItem(tablet.container, 'steak-frites', 3))).toContain(LABEL.okToServe)
    expect(ticketCards(kitchen.container)[0]).toBe(card())
    neverConfirmed()

    // The salad can only end as "Cannot confirm"; then the ticket drops back into sent order.
    await kitchen.user.click(K.getByRole('button', { name: 'Station lead' }))
    await kitchen.user.click(within(saladK()).getByRole('button', { name: 'Cannot confirm' }))
    await kitchen.user.type(within(saladK()).getByLabelText('Reason'), 'Dish lists tree nuts')
    await kitchen.user.click(within(saladK()).getByRole('button', { name: 'Save' }))
    expect(labelsIn(saladT())).toContain(LABEL.cannotConfirm)
    expect(order()[order().length - 1]).toBe(card().dataset.ticket)
    neverConfirmed()
  })
})


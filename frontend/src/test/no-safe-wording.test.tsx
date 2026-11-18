// SC-002 sweep: every screen in every state, as every role (research R-13b).
import { cleanup, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { DISHES } from '../data/dishes'
import type { AppState, KitchenStatus, Severity } from '../domain/types'
import { renderApp } from './renderApp'
import { seed, withAllergy, withDraftItem, withSentAllergyTicket } from './fixtures'
import type { FixtureItem } from './fixtures'
import { ticketCards } from './dom'

const FORBIDDEN = /safe|allergen[\s-]*free/i

function assertNoSafeWording(where: string) {
  const body = document.body
  expect(body.textContent ?? '', where).not.toMatch(FORBIDDEN)
  for (const el of body.querySelectorAll('[aria-label], [title], [placeholder]')) {
    for (const attr of ['aria-label', 'title', 'placeholder']) {
      expect(el.getAttribute(attr) ?? '', `${where} @${attr}`).not.toMatch(FORBIDDEN)
    }
  }
}

const SEAT_KINDS: Array<{ name: string; severity: Severity | null }> = [
  { name: 'tree-nut seat', severity: 'severe' },
  { name: 'no-allergy seat', severity: null },
  { name: 'preference seat', severity: 'preference' },
]

const KITCHEN_STATES: Array<{ name: string; item: Omit<FixtureItem, 'seat' | 'dishId'> }> = [
  { name: 'Sent', item: { kitchenStatus: 'Sent' } },
  { name: 'Acknowledged', item: { kitchenStatus: 'Acknowledged' } },
  { name: 'Confirmed', item: { kitchenStatus: 'Confirmed' } },
  { name: 'Confirmed + sign-off', item: { kitchenStatus: 'Confirmed', signOff: true } },
  { name: 'Cannot confirm', item: { kitchenStatus: 'Cannot confirm' as KitchenStatus, cannotConfirm: 'Supplier sheet missing' } },
]

function seatState(severity: Severity | null): AppState {
  let s = severity ? withAllergy(seed(), 'T12', 3, { severity, allergens: ['tree-nuts'] }) : seed()
  for (const d of DISHES) s = withDraftItem(s, 'T12', 3, d.id)
  return s
}

function sentState(item: Omit<FixtureItem, 'seat' | 'dishId'>, severity: Severity = 'severe'): AppState {
  const s = withAllergy(seed(), 'T12', 3, { severity, allergens: ['tree-nuts'] })
  return withSentAllergyTicket(s, {
    tableId: 'T12',
    items: [...DISHES.map((d) => ({ seat: 3, dishId: d.id, ...item })), { seat: 2, dishId: 'green-salad' }],
  }).state
}

describe('SC-002: no "safe" or "allergen-free" on any screen', () => {
  it('REQ-05: the role menu', () => {
    renderApp({ path: '/' })
    assertNoSafeWording('role menu')
  })

  for (const kind of SEAT_KINDS) {
    it(`REQ-05: the tablet for a ${kind.name}, every dish as menu row and as draft`, async () => {
      const r = renderApp({ path: '/server', role: 'server', state: seatState(kind.severity) })
      await r.user.click(r.screen.getByRole('button', { name: 'Table 12' }))
      await r.user.click(r.screen.getByRole('button', { name: 'Seat 3' }))
      assertNoSafeWording(`tablet ${kind.name}`)
    })
  }

  for (const ks of KITCHEN_STATES) {
    it(`REQ-05: every dish sent as an allergy item in state "${ks.name}" — tablet, station lead, expediter`, async () => {
      const state = sentState(ks.item)

      const tablet = renderApp({ path: '/server', role: 'server', state })
      await tablet.user.click(tablet.screen.getByRole('button', { name: 'Table 12' }))
      await tablet.user.click(tablet.screen.getByRole('button', { name: 'Seat 3' }))
      assertNoSafeWording(`tablet ${ks.name}`)
      cleanup()

      const lead = renderApp({ path: '/kitchen', role: 'station lead', state })
      assertNoSafeWording(`station lead ${ks.name}`)
      if (ks.name === 'Acknowledged') {
        // Open every inline "Cannot confirm" form.
        const card = ticketCards(lead.container).find((c) => (c.textContent ?? '').includes('Table 12'))!
        for (const b of within(card).getAllByRole('button', { name: 'Cannot confirm' })) await lead.user.click(b)
        expect(within(card).getAllByLabelText('Reason').length).toBeGreaterThan(0)
        assertNoSafeWording('station lead with open CannotConfirmForm')
      }
      cleanup()

      renderApp({ path: '/kitchen', role: 'expediter', state })
      assertNoSafeWording(`expediter ${ks.name}`)
    })
  }

  it('REQ-05: a preference-only seat sent as a normal ticket — tablet and kitchen', async () => {
    const state = sentState({}, 'preference')
    const tablet = renderApp({ path: '/server', role: 'server', state })
    await tablet.user.click(tablet.screen.getByRole('button', { name: 'Table 12' }))
    assertNoSafeWording('tablet preference sent')
    cleanup()
    renderApp({ path: '/kitchen', role: 'station lead', state })
    assertNoSafeWording('kitchen preference sent')
  })

  it('REQ-05 REQ-20: a picked chef-approved change — draft and sent, tablet, station lead and expediter', async () => {
    // Draft with the change picked on the tablet.
    let draft = withAllergy(seed(), 'T12', 3, { severity: 'severe', allergens: ['tree-nuts'] })
    draft = withDraftItem(draft, 'T12', 3, 'walnut-salad')
    const tablet = renderApp({ path: '/server', role: 'server', state: draft })
    await tablet.user.click(tablet.screen.getByRole('button', { name: 'Table 12' }))
    await tablet.user.click(tablet.screen.getByRole('button', { name: 'Seat 3' }))
    await tablet.user.click(tablet.screen.getByRole('button', { name: 'Without walnuts' }))
    expect(tablet.container.textContent).toContain('Chef-approved change: Without walnuts')
    assertNoSafeWording('tablet draft with picked change')
    cleanup()

    for (const ks of KITCHEN_STATES) {
      const s = withAllergy(seed(), 'T12', 3, { severity: 'severe', allergens: ['tree-nuts'] })
      const state = withSentAllergyTicket(s, {
        tableId: 'T12',
        items: [{ seat: 3, dishId: 'walnut-salad', pickedChange: 'Without walnuts', ...ks.item }],
      }).state
      const t = renderApp({ path: '/server', role: 'server', state })
      await t.user.click(t.screen.getByRole('button', { name: 'Table 12' }))
      await t.user.click(t.screen.getByRole('button', { name: 'Seat 3' }))
      assertNoSafeWording(`tablet sent with picked change, ${ks.name}`)
      cleanup()
      for (const role of ['station lead', 'expediter'] as const) {
        const k = renderApp({ path: '/kitchen', role, state })
        expect(k.container.textContent).toContain('Chef-approved change: Without walnuts')
        assertNoSafeWording(`${role} with picked change, ${ks.name}`)
        cleanup()
      }
    }
  })
})


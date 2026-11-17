import { within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderApp } from './renderApp'
import { seed, withAllergy, withSentAllergyTicket } from './fixtures'
import { kitchenItem, text } from './dom'

function acknowledgedTicket() {
  return withSentAllergyTicket(withAllergy(seed(), 'T12', 3), {
    tableId: 'T12',
    items: [
      { seat: 3, dishId: 'steak-frites', kitchenStatus: 'Acknowledged' },
      { seat: 3, dishId: 'daily-special', kitchenStatus: 'Acknowledged' },
    ],
  })
}

const status = (el: HTMLElement) => el.querySelector('[data-testid="kitchen-status"]')!.textContent

describe('US4 review and sign-off on the kitchen display', () => {
  it('REQ-10 REQ-11 REQ-14: station lead confirms, cannot-confirms with a required reason; expediter signs off', async () => {
    const { state, items } = acknowledgedTicket()
    const r = renderApp({ path: '/kitchen', role: 'station lead', state })
    const steak = () => kitchenItem(r.container, 'steak-frites', 3)
    const special = () => kitchenItem(r.container, 'daily-special', 3)

    // REQ-10: Confirm on steak frites.
    await r.user.click(within(steak()).getByRole('button', { name: 'Confirm' }))
    expect(status(steak())).toBe('Confirmed')
    expect(text(steak())).toContain('Confirmed by station lead')
    expect(within(steak()).queryByRole('button', { name: 'Confirm' })).toBeNull()

    // REQ-10 / REQ-11: daily special has no Confirm, but Cannot confirm.
    expect(within(special()).queryByRole('button', { name: 'Confirm' })).toBeNull()
    await r.user.click(within(special()).getByRole('button', { name: 'Cannot confirm' }))
    const reason = within(special()).getByLabelText('Reason') as HTMLInputElement
    expect(reason.required).toBe(true)

    // REQ-11: empty reason → status unchanged.
    await r.user.click(within(special()).getByRole('button', { name: 'Save' }))
    expect(status(special())).toBe('Acknowledged')
    expect(r.store.getSnapshot().orderItems[items[1].id].cannotConfirm).toBeNull()

    // REQ-11: with a reason → "Cannot confirm" and the reason is shown.
    await r.user.type(within(special()).getByLabelText('Reason'), 'Supplier sheet missing')
    await r.user.click(within(special()).getByRole('button', { name: 'Save' }))
    expect(status(special())).toBe('Cannot confirm')
    expect(text(special())).toContain('Reason: Supplier sheet missing')

    // REQ-14: as expediter, only the confirmed item offers Sign off.
    await r.user.click(r.screen.getByRole('button', { name: 'Expediter' }))
    expect(within(special()).queryByRole('button', { name: 'Sign off' })).toBeNull()
    expect(within(steak()).queryByRole('button', { name: 'Cannot confirm' })).toBeNull()
    await r.user.click(within(steak()).getByRole('button', { name: 'Sign off' }))
    expect(r.store.getSnapshot().orderItems[items[0].id].signOff).not.toBeNull()
    expect(text(steak())).toContain('Signed off by expediter')
    expect(r.screen.queryByRole('button', { name: 'Sign off' })).toBeNull()
  })

  it('REQ-11: "Cancel" closes the reason field without saving', async () => {
    const { state } = acknowledgedTicket()
    const r = renderApp({ path: '/kitchen', role: 'station lead', state })
    const special = () => kitchenItem(r.container, 'daily-special', 3)
    await r.user.click(within(special()).getByRole('button', { name: 'Cannot confirm' }))
    await r.user.click(within(special()).getByRole('button', { name: 'Cancel' }))
    expect(within(special()).queryByLabelText('Reason')).toBeNull()
    expect(status(special())).toBe('Acknowledged')
  })

  it('REQ-10: the station lead sees no "Confirm" before Acknowledge', () => {
    const { state } = withSentAllergyTicket(withAllergy(seed(), 'T12', 3), {
      tableId: 'T12',
      items: [{ seat: 3, dishId: 'steak-frites' }],
    })
    const r = renderApp({ path: '/kitchen', role: 'station lead', state })
    expect(r.screen.queryByRole('button', { name: 'Confirm' })).toBeNull()
    expect(r.screen.queryByRole('button', { name: 'Cannot confirm' })).toBeNull()
  })
})

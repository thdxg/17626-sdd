import { act, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { reduce } from '../domain/actions'
import { LABEL } from '../domain/labels'
import type { KitchenStatus, Role } from '../domain/types'
import { createShared, renderApp } from './renderApp'
import { T0, seed, withAllergy, withDraftItem, withSentAllergyTicket } from './fixtures'
import { kitchenItem, ticketCards } from './dom'

describe('REQ-21 (SHOULD): sound and flashing label', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  function allergyLabel(root: HTMLElement): HTMLElement | null {
    return root.querySelector<HTMLElement>('[data-testid="allergy-label"]')
  }

  /** Ticket sent at the clock's start time (T0); advance the injected clock and the 1 s timer. */
  function setup() {
    const { state } = withSentAllergyTicket(withAllergy(seed(), 'T12', 3), {
      tableId: 'T12',
      sentAt: T0,
      items: [{ seat: 3, dishId: 'steak-frites' }],
    })
    const shared = createShared(state)
    expect(shared.clock.now().toISOString()).toBe(T0)
    const playBeep = vi.fn()
    const r = renderApp({ path: '/kitchen', role: 'station lead', shared, playBeep })
    const elapse = (ms: number) => {
      shared.clock.advance(ms)
      act(() => {
        vi.advanceTimersByTime(1000)
      })
    }
    return { r, shared, playBeep, elapse }
  }

  it.each([
    [59, 'false'],
    [60, 'true'],
    [61, 'true'],
  ])('REQ-21: %i s after it arrived, an unacknowledged allergy ticket flashing = %s (boundary)', (seconds, flashing) => {
    const { r, elapse } = setup()
    expect(allergyLabel(r.container)!.dataset.flashing).toBe('false')
    elapse(seconds * 1000)
    const label = allergyLabel(r.container)!
    expect(label.textContent).toBe(LABEL.allergyNotAcknowledged)
    expect(label.dataset.flashing).toBe(flashing)
  })

  it('REQ-21: an acknowledged ticket never flashes (the label is gone)', () => {
    const { r, elapse } = setup()
    act(() => {
      within(r.container).getByRole('button', { name: 'Acknowledge' }).click()
    })
    elapse(120_000)
    expect(allergyLabel(r.container)).toBeNull()
  })

  it('REQ-21: a newly seen allergy ticket plays the sound once; re-renders do not replay it (scenario 5)', () => {
    const { r, playBeep, elapse } = setup()
    expect(playBeep).toHaveBeenCalledTimes(1)
    elapse(5_000)
    elapse(5_000)
    expect(playBeep).toHaveBeenCalledTimes(1)

    // A second allergy ticket arrives: one more sound.
    act(() => {
      r.store.dispatch({ type: 'recordAllergy', tableId: 'T11', seatNumber: 1, allergens: ['milk'], severity: 'severe', traces: true })
      r.store.dispatch({ type: 'addItem', tableId: 'T11', seatNumber: 1, dishId: 'risotto' })
      r.store.dispatch({ type: 'sendOrder', tableId: 'T11' })
    })
    expect(playBeep).toHaveBeenCalledTimes(2)
    elapse(1_000)
    expect(playBeep).toHaveBeenCalledTimes(2)
  })

  it('REQ-21: a normal ticket never plays the sound and never gets the allergy label (scenario 6)', () => {
    const shared = createShared(withDraftItem(seed(), 'T11', 2, 'risotto'))
    const playBeep = vi.fn()
    const r = renderApp({ path: '/kitchen', role: 'station lead', shared, playBeep })
    act(() => {
      r.store.dispatch({ type: 'sendOrder', tableId: 'T11' })
    })
    shared.clock.advance(120_000)
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(playBeep).not.toHaveBeenCalled()
    expect(ticketCards(r.container)).toHaveLength(3)
    expect(allergyLabel(r.container)).toBeNull()
  })
})

describe('REQ-22 (SHOULD): an allergy item that is not signed off cannot be cleared', () => {
  const CLEAR = /clear|remove|hide|dismiss|delete|archive|done|bump/i
  const STATUSES: KitchenStatus[] = ['Sent', 'Acknowledged', 'Confirmed', 'Cannot confirm']
  const ROLES: Role[] = ['station lead', 'expediter']

  for (const role of ROLES) {
    for (const status of STATUSES) {
      it(`REQ-22: ${role} × ${status} — no control removes or hides the allergy item (scenario 7)`, () => {
        const { state } = withSentAllergyTicket(withAllergy(seed(), 'T12', 3), {
          tableId: 'T12',
          items: [{ seat: 3, dishId: 'steak-frites', kitchenStatus: status }],
        })
        const r = renderApp({ path: '/kitchen', role, state })
        const item = kitchenItem(r.container, 'steak-frites', 3)
        const card = item.closest<HTMLElement>('[data-testid="ticket"]')!
        for (const b of within(card).queryAllByRole('button')) expect(b.textContent ?? '').not.toMatch(CLEAR)
        for (const b of within(r.container).queryAllByRole('button')) {
          expect(b.textContent ?? '').not.toMatch(CLEAR)
        }
      })
    }
  }

  it('REQ-22: the server tablet cannot remove a sent allergy item either', async () => {
    const { state } = withSentAllergyTicket(withAllergy(seed(), 'T12', 3), {
      tableId: 'T12',
      items: [{ seat: 3, dishId: 'steak-frites' }],
    })
    vi.useRealTimers()
    const r = renderApp({ path: '/server', role: 'server', state })
    await r.user.click(r.screen.getByRole('button', { name: 'Table 12' }))
    expect(r.screen.queryByRole('button', { name: /^Remove / })).toBeNull()
  })

  it('REQ-22: removeDraftItem on a sent item returns the same reference', () => {
    const { state, items } = withSentAllergyTicket(withAllergy(seed(), 'T12', 3), {
      tableId: 'T12',
      items: [{ seat: 3, dishId: 'steak-frites' }],
    })
    expect(reduce(state, { type: 'removeDraftItem', itemId: items[0].id }, new Date(T0))).toBe(state)
  })
})

import { act } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { LABEL } from '../domain/labels'
import { createShared, createTestStore, renderApp } from './renderApp'
import { seed, withAllergy, withSentAllergyTicket } from './fixtures'
import { labelsIn, orderItem, text } from './dom'

describe('US5 the tablet shows the kitchen answer', () => {
  it('REQ-12 REQ-13 REQ-15: kitchen changes in another tab show on the tablet order panel', async () => {
    const { state, items, ticket } = withSentAllergyTicket(withAllergy(seed(), 'T12', 3), {
      tableId: 'T12',
      items: [
        { seat: 3, dishId: 'steak-frites' },
        { seat: 3, dishId: 'daily-special' },
      ],
    })
    const shared = createShared(state)
    const r = renderApp({ path: '/server', role: 'server', shared })
    const kitchen = createTestStore(shared)
    await r.user.click(r.screen.getByRole('button', { name: 'Table 12' }))
    const steak = () => orderItem(r.container, 'steak-frites', 3)
    const special = () => orderItem(r.container, 'daily-special', 3)

    expect(labelsIn(steak())).toContain(LABEL.kitchenSent)
    expect(labelsIn(steak())).toContain(LABEL.notConfirmed)

    act(() => kitchen.dispatch({ type: 'acknowledge', ticketId: ticket.id, role: 'station lead' }))
    expect(labelsIn(steak())).toContain(LABEL.kitchenAcknowledged)
    expect(labelsIn(steak())).not.toContain(LABEL.confirmed)

    act(() => kitchen.dispatch({ type: 'confirm', itemId: items[0].id, role: 'station lead' }))
    expect(labelsIn(steak())).toContain(LABEL.confirmed)
    expect(labelsIn(steak())).not.toContain(LABEL.okToServe)
    expect(labelsIn(steak())).not.toContain(LABEL.notConfirmed)

    act(() =>
      kitchen.dispatch({ type: 'cannotConfirm', itemId: items[1].id, role: 'station lead', reason: 'Supplier sheet missing' }),
    )
    expect(labelsIn(special())).toContain(LABEL.cannotConfirm)
    expect(labelsIn(special())).toContain('Reason: Supplier sheet missing')
    expect(labelsIn(special())).not.toContain(LABEL.confirmed)

    act(() => kitchen.dispatch({ type: 'signOff', itemId: items[0].id, role: 'expediter' }))
    expect(labelsIn(steak())).toContain(LABEL.okToServe)
    expect(labelsIn(special())).not.toContain(LABEL.okToServe)
    // The sent items keep showing the allergy from the snapshot.
    expect(text(steak())).toContain('Tree nuts')
  })
})

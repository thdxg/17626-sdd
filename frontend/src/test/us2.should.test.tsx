import { describe, expect, it } from 'vitest'
import { LABEL } from '../domain/labels'
import { renderApp } from './renderApp'
import { seed, withAllergy, withDraftItem } from './fixtures'
import { dishRow, labelsIn, orderItem } from './dom'

function approvedChanges(el: HTMLElement): string[] {
  return [...el.querySelectorAll<HTMLElement>('[data-approved-change]')].map((x) => x.textContent ?? '')
}

async function openSeat3(r: ReturnType<typeof renderApp>) {
  await r.user.click(r.screen.getByRole('button', { name: 'Table 12' }))
  await r.user.click(r.screen.getByRole('button', { name: 'Seat 3' }))
}

describe('US2 SHOULD', () => {
  it('REQ-19: recording an allergy re-checks the seat\'s existing dishes with no other action (scenario 6)', async () => {
    let s = withDraftItem(seed(), 'T12', 3, 'walnut-salad')
    s = withDraftItem(s, 'T12', 3, 'steak-frites')
    const r = renderApp({ path: '/server', role: 'server', state: s })
    await openSeat3(r)
    expect(labelsIn(orderItem(r.container, 'walnut-salad', 3))).toEqual([])
    expect(labelsIn(orderItem(r.container, 'steak-frites', 3))).toEqual([])

    for (const name of ['Tree nuts', 'severe allergy', 'Traces: yes', 'Save allergy']) {
      await r.user.click(r.screen.getByRole('button', { name }))
    }
    expect(labelsIn(orderItem(r.container, 'walnut-salad', 3))).toContain('Contains Tree nuts')
    expect(labelsIn(orderItem(r.container, 'steak-frites', 3))).toContain(LABEL.notConfirmed)
  })

  // The REQ-20 scenario 7 case moved to us2.change.test.tsx (V2: REQ-20 is MUST, picked on the order item).

  it('REQ-20: the milk change on risotto is offered only for a seat with a milk allergy', async () => {
    const s = withAllergy(seed(), 'T12', 3, { allergens: ['milk'] })
    const r = renderApp({ path: '/server', role: 'server', state: s })
    await openSeat3(r)
    expect(approvedChanges(dishRow(r.container, 'risotto'))).toEqual(['Olive oil instead of butter and parmesan'])
    expect(approvedChanges(dishRow(r.container, 'walnut-salad'))).toEqual([])
  })

  it('REQ-20: a seat with no allergy is offered no changes', async () => {
    const r = renderApp({ path: '/server', role: 'server' })
    await openSeat3(r)
    expect(approvedChanges(dishRow(r.container, 'walnut-salad'))).toEqual([])
  })
})

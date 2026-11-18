// V2: the server picks one chef-approved change on a draft "Contains" item (US2 scenarios 7 and 9,
// tablet part; research R-16, contracts/ui.md §Server tablet 5).
import { within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderApp } from './renderApp'
import { seed, withAllergy, withDraftItem, withSentAllergyTicket } from './fixtures'
import { dishRow, labelsIn, orderItem, text } from './dom'

const FORBIDDEN = /safe|allergen[\s-]*free/i
const LINE = 'Chef-approved change: Without walnuts'

function approvedChanges(el: HTMLElement): string[] {
  return [...el.querySelectorAll<HTMLElement>('[data-approved-change]')].map((x) => x.textContent ?? '')
}

async function openSeat3(r: ReturnType<typeof renderApp>) {
  await r.user.click(r.screen.getByRole('button', { name: 'Table 12' }))
  await r.user.click(r.screen.getByRole('button', { name: 'Seat 3' }))
}

function treeNutDrafts() {
  let s = withAllergy(seed(), 'T12', 3, { allergens: ['tree-nuts'] })
  s = withDraftItem(s, 'T12', 3, 'walnut-salad')
  s = withDraftItem(s, 'T12', 3, 'almond-tart')
  return s
}

describe('US2 chef-approved change (V2)', () => {
  // Moved from us2.should.test.tsx and updated: the menu lists the changes as text (V1); the
  // order item now offers them as toggles.
  it('REQ-20: a "Contains" dish offers only its chef-approved changes for that allergen (scenario 7)', async () => {
    const s = withDraftItem(treeNutDrafts(), 'T12', 3, 'risotto')
    const r = renderApp({ path: '/server', role: 'server', state: s })
    await openSeat3(r)

    expect(approvedChanges(dishRow(r.container, 'walnut-salad'))).toEqual(['Without walnuts'])
    expect(approvedChanges(dishRow(r.container, 'almond-tart'))).toEqual([])
    // Risotto has an approved change for milk only; this seat has a tree-nut allergy.
    expect(approvedChanges(dishRow(r.container, 'risotto'))).toEqual([])

    const salad = within(orderItem(r.container, 'walnut-salad', 3))
    expect(salad.getAllByRole('button', { pressed: false }).map((b) => b.textContent)).toEqual(['Without walnuts'])
    expect(within(orderItem(r.container, 'almond-tart', 3)).queryAllByRole('button', { pressed: false })).toEqual([])
    expect(within(orderItem(r.container, 'risotto', 3)).queryAllByRole('button', { pressed: false })).toEqual([])
    // No free-text change field anywhere on the menu or order.
    expect(r.screen.queryByLabelText(/change/i)).toBeNull()
    expect(document.body.textContent).not.toMatch(FORBIDDEN)
  })

  it('REQ-20: tapping "Without walnuts" picks it, shows the change line, and tapping again clears it (scenario 9, tablet)', async () => {
    const r = renderApp({ path: '/server', role: 'server', state: treeNutDrafts() })
    await openSeat3(r)
    const salad = () => orderItem(r.container, 'walnut-salad', 3)
    const toggle = () => within(salad()).getByRole('button', { name: 'Without walnuts' })

    expect(toggle().getAttribute('aria-pressed')).toBe('false')
    expect(text(salad())).not.toContain('Chef-approved change:')

    await r.user.click(toggle())
    expect(toggle().getAttribute('aria-pressed')).toBe('true')
    expect(text(salad())).toContain(LINE)
    expect(Object.values(r.store.getSnapshot().orderItems).find((i) => i.dishId === 'walnut-salad')!.pickedChange).toBe(
      'Without walnuts',
    )
    // C-12: the labels do not change.
    expect(labelsIn(salad())).toContain('Contains Tree nuts')
    expect(labelsIn(salad())).not.toContain(LINE)
    expect(document.body.textContent).not.toMatch(FORBIDDEN)

    await r.user.click(toggle())
    expect(toggle().getAttribute('aria-pressed')).toBe('false')
    expect(text(salad())).not.toContain('Chef-approved change:')
    expect(labelsIn(salad())).toContain('Contains Tree nuts')
  })

  it('REQ-20: almond tart (no approved change) shows no toggle', async () => {
    const r = renderApp({ path: '/server', role: 'server', state: treeNutDrafts() })
    await openSeat3(r)
    const tart = within(orderItem(r.container, 'almond-tart', 3))
    expect(tart.queryByRole('button', { name: 'Without walnuts' })).toBeNull()
    expect(labelsIn(orderItem(r.container, 'almond-tart', 3))).toContain('Contains Tree nuts')
  })

  it('REQ-20: a seat with no allergy gets no toggle on the walnut salad', async () => {
    const r = renderApp({ path: '/server', role: 'server', state: withDraftItem(seed(), 'T12', 3, 'walnut-salad') })
    await openSeat3(r)
    expect(within(orderItem(r.container, 'walnut-salad', 3)).queryByRole('button', { name: 'Without walnuts' })).toBeNull()
  })

  it('REQ-20: a sent item shows the picked change line but no toggle', async () => {
    const { state } = withSentAllergyTicket(withAllergy(seed(), 'T12', 3, { allergens: ['tree-nuts'] }), {
      tableId: 'T12',
      items: [{ seat: 3, dishId: 'walnut-salad', pickedChange: 'Without walnuts' }],
    })
    const r = renderApp({ path: '/server', role: 'server', state })
    await openSeat3(r)
    const salad = orderItem(r.container, 'walnut-salad', 3)
    expect(salad.dataset.sent).toBe('true')
    expect(text(salad)).toContain(LINE)
    expect(within(salad).queryByRole('button', { name: 'Without walnuts' })).toBeNull()
    expect(labelsIn(salad)).toContain('Contains Tree nuts')
  })

  it('REQ-20: a sent item with no picked change shows no change line and no toggle', async () => {
    const { state } = withSentAllergyTicket(withAllergy(seed(), 'T12', 3, { allergens: ['tree-nuts'] }), {
      tableId: 'T12',
      items: [{ seat: 3, dishId: 'walnut-salad' }],
    })
    const r = renderApp({ path: '/server', role: 'server', state })
    await openSeat3(r)
    const salad = orderItem(r.container, 'walnut-salad', 3)
    expect(text(salad)).not.toContain('Chef-approved change:')
    expect(within(salad).queryByRole('button', { name: 'Without walnuts' })).toBeNull()
  })
})

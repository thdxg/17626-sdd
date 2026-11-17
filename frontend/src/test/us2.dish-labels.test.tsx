import { describe, expect, it } from 'vitest'
import { LABEL } from '../domain/labels'
import { renderApp } from './renderApp'
import { seed, withAllergy } from './fixtures'
import { dishRow, labelsIn, orderItem, orderItems } from './dom'

async function setup() {
  const r = renderApp({ path: '/server', role: 'server', state: withAllergy(seed(), 'T12', 3) })
  await r.user.click(r.screen.getByRole('button', { name: 'Table 12' }))
  await r.user.click(r.screen.getByRole('button', { name: 'Seat 3' }))
  return r
}

const EXPECTED: Array<[string, string, string]> = [
  ['walnut-salad', 'Pear & walnut salad', 'Contains Tree nuts'],
  ['steak-frites', 'Steak frites', LABEL.notConfirmed],
  ['daily-special', 'Daily special', LABEL.cannotConfirm],
]

describe('US2 dish labels on the tablet', () => {
  it('REQ-04 REQ-05 REQ-16: the menu for a tree-nut seat shows the right label on each dish', async () => {
    const r = await setup()
    for (const [id, , label] of EXPECTED) expect(labelsIn(dishRow(r.container, id))).toContain(label)
    expect(labelsIn(dishRow(r.container, 'steak-frites'))).toEqual([LABEL.notConfirmed])
    expect(labelsIn(dishRow(r.container, 'daily-special'))).not.toContain(LABEL.notConfirmed)
  })

  it('REQ-04 REQ-05 REQ-16: draft items show the same labels; adding a "Contains" dish is allowed with no block or warning', async () => {
    const r = await setup()
    for (const [, name] of EXPECTED) await r.user.click(r.screen.getByRole('button', { name: `Add ${name}` }))
    expect(orderItems(r.container, { seat: 3 })).toHaveLength(3)
    for (const [id, , label] of EXPECTED) expect(labelsIn(orderItem(r.container, id, 3))).toContain(label)
    expect(document.querySelector('[role="alert"], [role="dialog"], [role="alertdialog"]')).toBeNull()
  })

  it('REQ-05: a seat with no allergy shows no "Not confirmed" on the menu (scenario 8)', async () => {
    const r = await setup()
    await r.user.click(r.screen.getByRole('button', { name: 'Seat 1' }))
    for (const id of ['walnut-salad', 'steak-frites', 'daily-special']) {
      expect(labelsIn(dishRow(r.container, id))).toEqual([])
    }
  })
})

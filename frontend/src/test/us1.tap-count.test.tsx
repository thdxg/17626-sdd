import { describe, expect, it } from 'vitest'
import { renderApp } from './renderApp'

/** Wrap user.click / user.type so every tap and keystroke burst is counted (research R-11). */
function counted(r: ReturnType<typeof renderApp>) {
  const counts = { click: 0, type: 0 }
  return {
    counts,
    click: (el: Element) => {
      counts.click++
      return r.user.click(el)
    },
    type: (el: Element, t: string) => {
      counts.type++
      return r.user.type(el, t)
    },
  }
}

describe('REQ-17 tap count', () => {
  it('REQ-17: recording one allergen from the seat view takes 4 taps, no typing, no navigation (scenario 5)', async () => {
    const r = renderApp({ path: '/server', role: 'server' })
    await r.user.click(r.screen.getByRole('button', { name: 'Table 12' }))
    await r.user.click(r.screen.getByRole('button', { name: 'Seat 3' }))
    const pathsBefore = [...r.pathSource.history]

    const c = counted(r)
    await c.click(r.screen.getByRole('button', { name: 'Tree nuts' }))
    await c.click(r.screen.getByRole('button', { name: 'severe allergy' }))
    await c.click(r.screen.getByRole('button', { name: 'Traces: yes' }))
    await c.click(r.screen.getByRole('button', { name: 'Save allergy' }))

    const saved = r.store.getSnapshot().seats['T12:3'].allergies
    expect(saved).toHaveLength(1)
    expect(saved[0]).toMatchObject({ allergens: ['tree-nuts'], severity: 'severe', traces: true })
    // Boundary rows 3 / 4 / 5: exactly 4 passes the "4 or fewer" limit; 5 would fail.
    expect(c.counts.click).toBe(4)
    expect(c.counts.click).toBeLessThanOrEqual(4)
    expect(c.counts.type).toBe(0)
    expect(r.pathSource.history).toEqual(pathsBefore)
    expect(r.pathSource.get()).toBe('/server')
    expect(document.querySelector('[role="dialog"]')).toBeNull()
  })

  it('REQ-17: the allergen chips are visible on the seat view with no other control pressed first', () => {
    const r = renderApp({ path: '/server', role: 'server' })
    // No click at all: the seat view of the default seat already shows the panel.
    expect(r.screen.getByRole('button', { name: 'Tree nuts' })).toBeTruthy()
    expect(r.screen.getByRole('button', { name: 'severe allergy' })).toBeTruthy()
    expect(r.screen.getByRole('button', { name: 'Traces: yes' })).toBeTruthy()
    expect(r.screen.getByRole('button', { name: 'Save allergy' })).toBeTruthy()
  })
})

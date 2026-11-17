import { describe, expect, it } from 'vitest'
import { createSeed } from '../data/seed'
import { renderApp } from './renderApp'
import { seed, withAllergy } from './fixtures'

describe('app shell', () => {
  it('REQ-09 REQ-10 REQ-11 REQ-14: the role menu shows the three roles and "Reset demo data"', () => {
    const { screen } = renderApp({ path: '/' })
    for (const name of ['Server', 'Station lead', 'Expediter', 'Reset demo data']) {
      expect(screen.getByRole('button', { name })).toBeTruthy()
    }
  })

  it('REQ-09: "Server" opens /server and saves the role for this tab', async () => {
    const { screen, user, pathSource, roleSource } = renderApp({ path: '/' })
    await user.click(screen.getByRole('button', { name: 'Server' }))
    expect(pathSource.get()).toBe('/server')
    expect(roleSource.get()).toBe('server')
    expect(screen.getByText('Role: server')).toBeTruthy()
  })

  it.each([
    ['Station lead', 'station lead'],
    ['Expediter', 'expediter'],
  ] as const)('REQ-10 REQ-14: "%s" opens /kitchen', async (label, role) => {
    const { screen, user, pathSource, roleSource } = renderApp({ path: '/' })
    await user.click(screen.getByRole('button', { name: label }))
    expect(pathSource.get()).toBe('/kitchen')
    expect(roleSource.get()).toBe(role)
  })

  it('A-3: /kitchen with no role goes to /', () => {
    const { screen, pathSource } = renderApp({ path: '/kitchen' })
    expect(pathSource.get()).toBe('/')
    expect(screen.getByRole('button', { name: 'Station lead' })).toBeTruthy()
  })

  it('A-3: /server with no role goes to /', () => {
    const { pathSource } = renderApp({ path: '/server' })
    expect(pathSource.get()).toBe('/')
  })

  it('A-10: "Reset demo data" in the header restores the seed', async () => {
    const changed = { ...withAllergy(seed(), 'T12', 3), revision: 3 }
    const { screen, user, store } = renderApp({ path: '/server', role: 'server', state: changed })
    expect(store.getSnapshot().seats['T12:3'].allergies.length).toBe(1)
    await user.click(screen.getByRole('button', { name: 'Reset demo data' }))
    expect({ ...store.getSnapshot(), revision: 0 }).toEqual(createSeed())
    expect(store.getSnapshot().revision).toBe(4)
  })

  it('A-3: "Change role" goes back to the role menu', async () => {
    const { screen, user, pathSource } = renderApp({ path: '/kitchen', role: 'expediter' })
    await user.click(screen.getByRole('link', { name: 'Change role' }))
    expect(pathSource.get()).toBe('/')
  })
})

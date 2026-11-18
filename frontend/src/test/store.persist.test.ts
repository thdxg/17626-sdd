import { describe, expect, it } from 'vitest'
import { createSeed } from '../data/seed'
import { STATE_KEY, createStore } from '../store/store'
import { fakeChannelPair, fixedClock, memoryStorage } from './fakes'

function makeStore(initial?: string) {
  const storage = memoryStorage(initial === undefined ? {} : { [STATE_KEY]: initial })
  const channels = fakeChannelPair()
  const clock = fixedClock()
  const store = createStore({ storage, channel: channels.create(), now: clock.now })
  return { store, storage, channels }
}

describe('store persistence (A-10)', () => {
  it('REQ-12: a missing document is reseeded with revision 0', () => {
    const { store, storage } = makeStore()
    expect(store.getSnapshot()).toEqual(createSeed())
    expect(store.getSnapshot().revision).toBe(0)
    expect(JSON.parse(storage.getItem(STATE_KEY)!)).toEqual(createSeed())
  })

  it('REQ-12: unparseable JSON is reseeded with revision 0', () => {
    const { store } = makeStore('{not json')
    expect(store.getSnapshot()).toEqual(createSeed())
  })

  it('REQ-12: an unknown schemaVersion (3) is reseeded with revision 0', () => {
    const { store } = makeStore(JSON.stringify({ ...createSeed(), schemaVersion: 3, revision: 9 }))
    expect(store.getSnapshot().schemaVersion).toBe(2)
    expect(store.getSnapshot().revision).toBe(0)
  })

  it('REQ-20: a stored V1 document (schemaVersion 1) is replaced by the V2 seed (R-14)', () => {
    const v1 = { ...createSeed(), schemaVersion: 1, revision: 12, tickets: [] }
    const { store, storage } = makeStore(JSON.stringify(v1))
    expect(store.getSnapshot()).toEqual(createSeed())
    expect(JSON.parse(storage.getItem(STATE_KEY)!)).toEqual(createSeed())
  })

  it('REQ-12: a valid document is kept as is', () => {
    const doc = { ...createSeed(), revision: 7 }
    const { store } = makeStore(JSON.stringify(doc))
    expect(store.getSnapshot()).toEqual(doc)
  })

  it('REQ-12: a guard-failing dispatch does not write or post', () => {
    const { store, storage, channels } = makeStore()
    const before = storage.getItem(STATE_KEY)
    const snap = store.getSnapshot()
    store.dispatch({ type: 'removeDraftItem', itemId: 'nope' })
    expect(storage.getItem(STATE_KEY)).toBe(before)
    expect(channels.posted).toEqual([])
    expect(store.getSnapshot()).toBe(snap)
  })

  it('REQ-12: reset writes the seed with a higher revision and posts a notice', () => {
    const { store, storage, channels } = makeStore(JSON.stringify({ ...createSeed(), revision: 4, tickets: [] }))
    store.dispatch({ type: 'reset' })
    const saved = JSON.parse(storage.getItem(STATE_KEY)!)
    expect(saved).toEqual({ ...createSeed(), revision: 5 })
    expect(channels.posted).toEqual([{ type: 'state-changed', revision: 5 }])
  })

  it('REQ-12: getSnapshot returns a stable reference between changes', () => {
    const { store } = makeStore()
    expect(store.getSnapshot()).toBe(store.getSnapshot())
    store.refresh()
    expect(store.getSnapshot()).toBe(store.getSnapshot())
  })
})

// Shared state between the tablet tab and the kitchen tab (contracts/shared-state.md).
// REQ-12, REQ-13, REQ-15 (A-10)
import type { Action } from '../domain/actions'
import { reduce } from '../domain/actions'
import type { AppState } from '../domain/types'
import { createSeed } from '../data/seed'

export const STATE_KEY = 'allergy-round-trip/state'
export const CHANNEL_NAME = 'allergy-round-trip'

export interface StorageLike {
  getItem(k: string): string | null
  setItem(k: string, v: string): void
}

export interface ChannelLike {
  postMessage(m: unknown): void
  onmessage: ((e: { data: unknown }) => void) | null
  close(): void
}

/** Adapts a real BroadcastChannel to ChannelLike; null when the API is missing. */
export function browserChannel(name: string = CHANNEL_NAME): ChannelLike | null {
  if (typeof BroadcastChannel === 'undefined') return null
  const bc = new BroadcastChannel(name)
  const adapter: ChannelLike = {
    onmessage: null,
    postMessage: (m) => bc.postMessage(m),
    close: () => bc.close(),
  }
  bc.onmessage = (e) => adapter.onmessage?.({ data: e.data })
  return adapter
}

export interface StateChangedNotice {
  type: 'state-changed'
  revision: number
}

export interface StoreDeps {
  storage: StorageLike
  /** null when BroadcastChannel is unavailable */
  channel: ChannelLike | null
  now: () => Date
  /**
   * Lets the app re-read storage on other signals (a `storage` event for the key, a
   * `visibilitychange` to visible). The store passes a `refresh` callback; the hook may return
   * an unsubscribe function.
   */
  onExternalChange?: (refresh: () => void) => (() => void) | void
}

export interface Store {
  getSnapshot(): AppState
  subscribe(cb: () => void): () => void
  dispatch(action: Action): void
  /** Re-read storage now (used by external-change hooks). */
  refresh(): void
  now(): Date
  close(): void
}

function parseState(raw: string | null): AppState | null {
  if (raw === null) return null
  try {
    const doc = JSON.parse(raw) as Partial<AppState> | null
    if (
      !doc ||
      typeof doc !== 'object' ||
      doc.schemaVersion !== 2 ||
      typeof doc.revision !== 'number' ||
      !Array.isArray(doc.tables) ||
      !doc.seats ||
      typeof doc.seats !== 'object' ||
      !doc.orderItems ||
      typeof doc.orderItems !== 'object' ||
      !Array.isArray(doc.tickets)
    ) {
      return null
    }
    return doc as AppState
  } catch {
    return null
  }
}

function isNotice(m: unknown): m is StateChangedNotice {
  return (
    typeof m === 'object' &&
    m !== null &&
    (m as StateChangedNotice).type === 'state-changed' &&
    typeof (m as StateChangedNotice).revision === 'number'
  )
}

export function createStore(deps: StoreDeps): Store {
  const { storage, channel, now } = deps
  const listeners = new Set<() => void>()
  let lastRaw: string | null = null
  let current: AppState = load()

  /** Read the document; reseed it (revision 0) if it is missing or invalid. */
  function load(): AppState {
    const raw = storage.getItem(STATE_KEY)
    const parsed = parseState(raw)
    if (parsed) {
      lastRaw = raw
      return parsed
    }
    const seed: AppState = { ...createSeed(), revision: 0 }
    const seedRaw = JSON.stringify(seed)
    storage.setItem(STATE_KEY, seedRaw)
    lastRaw = seedRaw
    return seed
  }

  function notify() {
    for (const cb of [...listeners]) cb()
  }

  /** Re-read storage; notify only if the document changed. */
  function refresh() {
    const raw = storage.getItem(STATE_KEY)
    if (raw !== null && raw === lastRaw) return
    current = load()
    notify()
  }

  function dispatch(action: Action) {
    refresh() // read latest before every write (R-3)
    const next = reduce(current, action, now())
    if (next === current) return // guard failed: no write, no broadcast
    const revision = current.revision + 1
    const written: AppState = { ...next, revision }
    const raw = JSON.stringify(written)
    storage.setItem(STATE_KEY, raw)
    lastRaw = raw
    current = written
    channel?.postMessage({ type: 'state-changed', revision } satisfies StateChangedNotice)
    notify()
  }

  if (channel) {
    channel.onmessage = (e) => {
      if (!isNotice(e.data)) return
      if (e.data.revision <= current.revision) return // never roll back
      refresh()
    }
  }

  const unsubscribeExternal = deps.onExternalChange?.(refresh)

  return {
    getSnapshot: () => current,
    subscribe(cb) {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    dispatch,
    refresh,
    now,
    close() {
      if (channel) channel.onmessage = null
      if (typeof unsubscribeExternal === 'function') unsubscribeExternal()
      listeners.clear()
    },
  }
}

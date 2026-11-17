// In-memory fakes for the store (contracts/domain-api.md §store). REQ-12, REQ-13, REQ-15
import type { ChannelLike, StorageLike } from '../store/store'

export function memoryStorage(initial: Record<string, string> = {}): StorageLike & { data: Map<string, string> } {
  const data = new Map(Object.entries(initial))
  return {
    data,
    getItem: (k) => (data.has(k) ? data.get(k)! : null),
    setItem: (k, v) => {
      data.set(k, String(v))
    },
  }
}

export interface FakeChannelFactory {
  /** A new channel; its postMessage reaches every other open channel from this factory. */
  create(): ChannelLike
  /** Deliver queued messages (only used when created with `{ manual: true }`). */
  flush(): void
  /** Messages posted so far (for assertions). */
  posted: unknown[]
}

export function fakeChannelPair(opts: { manual?: boolean } = {}): FakeChannelFactory {
  const open = new Set<ChannelLike>()
  const queue: Array<() => void> = []
  const posted: unknown[] = []
  return {
    posted,
    create() {
      const ch: ChannelLike = {
        onmessage: null,
        postMessage(m) {
          posted.push(m)
          for (const other of open) {
            if (other === ch) continue
            const deliver = () => other.onmessage?.({ data: structuredClone(m) })
            if (opts.manual) queue.push(deliver)
            else deliver()
          }
        },
        close() {
          open.delete(ch)
        },
      }
      open.add(ch)
      return ch
    },
    flush() {
      while (queue.length) queue.shift()!()
    },
  }
}

export function fixedClock(ms: number = Date.parse('2026-11-16T12:00:00.000Z')) {
  let t = ms
  return {
    now: () => new Date(t),
    advance(delta: number) {
      t += delta
    },
    ms: () => t,
  }
}

// Minimal routing without a router dependency (research R-2). REQ-12 (A-10)
import { createContext, createElement, useContext, useSyncExternalStore } from 'react'
import type { ReactNode } from 'react'

export interface PathSource {
  get(): string
  navigate(path: string, opts?: { replace?: boolean }): void
  subscribe(cb: () => void): () => void
}

function createBrowserPathSource(): PathSource {
  const listeners = new Set<() => void>()
  const emit = () => {
    for (const cb of [...listeners]) cb()
  }
  return {
    get: () => window.location.pathname,
    navigate(path, opts) {
      if (path === window.location.pathname) return
      if (opts?.replace) window.history.replaceState(null, '', path)
      else window.history.pushState(null, '', path)
      emit()
    },
    subscribe(cb) {
      listeners.add(cb)
      if (listeners.size === 1) window.addEventListener('popstate', emit)
      return () => {
        listeners.delete(cb)
        if (listeners.size === 0) window.removeEventListener('popstate', emit)
      }
    },
  }
}

/** A path held in memory, so tests can render two tabs (/server and /kitchen) at once. */
export function createMemoryPathSource(initial: string): PathSource & { history: string[] } {
  let path = initial
  const history = [initial]
  const listeners = new Set<() => void>()
  return {
    history,
    get: () => path,
    navigate(next) {
      if (next === path) return
      path = next
      history.push(next)
      for (const cb of [...listeners]) cb()
    },
    subscribe(cb) {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
  }
}

let browserSource: PathSource | null = null

const PathContext = createContext<PathSource | null>(null)

export function PathProvider(props: { source: PathSource; children?: ReactNode }) {
  return createElement(PathContext.Provider, { value: props.source }, props.children)
}

export function usePath(): { path: string; navigate: PathSource['navigate'] } {
  const source = useContext(PathContext) ?? (browserSource ??= createBrowserPathSource())
  const path = useSyncExternalStore(source.subscribe, source.get, source.get)
  return { path, navigate: source.navigate }
}

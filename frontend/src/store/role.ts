// Role per tab in sessionStorage, never in shared state (contracts/shared-state.md §Per-tab, R-5).
// REQ-09, REQ-10, REQ-11, REQ-14 (A-3, A-9)
import { createContext, createElement, useCallback, useContext, useSyncExternalStore } from 'react'
import type { ReactNode } from 'react'
import { ROLES } from '../domain/types'
import type { Role } from '../domain/types'
import type { StorageLike } from './store'

export const ROLE_KEY = 'allergy-round-trip/role'

function isRole(v: unknown): v is Role {
  return typeof v === 'string' && (ROLES as readonly string[]).includes(v)
}

export function getRole(storage: StorageLike = window.sessionStorage): Role | null {
  const v = storage.getItem(ROLE_KEY)
  return isRole(v) ? v : null
}

export function setRole(role: Role, storage: StorageLike = window.sessionStorage): void {
  storage.setItem(ROLE_KEY, role)
}

/** Reactive wrapper so a role switch re-renders the tab. */
export interface RoleSource {
  get(): Role | null
  set(role: Role): void
  subscribe(cb: () => void): () => void
}

export function createRoleSource(storage: StorageLike): RoleSource {
  const listeners = new Set<() => void>()
  return {
    get: () => getRole(storage),
    set(role) {
      setRole(role, storage)
      for (const cb of [...listeners]) cb()
    },
    subscribe(cb) {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
  }
}

let browserSource: RoleSource | null = null
function browserRoleSource(): RoleSource {
  browserSource ??= createRoleSource(window.sessionStorage)
  return browserSource
}

const RoleContext = createContext<RoleSource | null>(null)

export function RoleProvider(props: { source: RoleSource; children?: ReactNode }) {
  return createElement(RoleContext.Provider, { value: props.source }, props.children)
}

export function useRole(): [Role | null, (role: Role) => void] {
  const source = useContext(RoleContext) ?? browserRoleSource()
  const role = useSyncExternalStore(source.subscribe, source.get, source.get)
  const set = useCallback((r: Role) => source.set(r), [source])
  return [role, set]
}

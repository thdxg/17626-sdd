// React binding for the shared store via useSyncExternalStore (research R-3). REQ-12
import { createContext, createElement, useContext, useSyncExternalStore } from 'react'
import type { ReactNode } from 'react'
import type { Action } from '../domain/actions'
import type { AppState } from '../domain/types'
import type { Store } from './store'

const StoreContext = createContext<Store | null>(null)

export function StoreProvider(props: { store: Store; children?: ReactNode }) {
  return createElement(StoreContext.Provider, { value: props.store }, props.children)
}

export function useStore(): Store {
  const store = useContext(StoreContext)
  if (!store) throw new Error('useStore must be used inside StoreProvider')
  return store
}

export function useAppState(): AppState {
  const store = useStore()
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot)
}

export function useDispatch(): (action: Action) => void {
  return useStore().dispatch
}

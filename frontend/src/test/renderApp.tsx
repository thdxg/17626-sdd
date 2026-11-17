// Renders <App/> for one "tab": its own path and role, over a store on shared fakes.
// Test support for REQ-01–REQ-17 (Constitution V).
import { render, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../App'
import type { AppState, Role } from '../domain/types'
import { PathProvider, createMemoryPathSource } from '../routing/usePath'
import { RoleProvider, createRoleSource } from '../store/role'
import { STATE_KEY, createStore } from '../store/store'
import type { Store, StorageLike } from '../store/store'
import { StoreProvider } from '../store/useAppState'
import { BeepProvider } from '../views/kitchen/beep'
import { fakeChannelPair, fixedClock, memoryStorage } from './fakes'
import type { FakeChannelFactory } from './fakes'

export interface Shared {
  storage: StorageLike
  channels: FakeChannelFactory
  clock: ReturnType<typeof fixedClock>
}

export function createShared(state?: AppState): Shared {
  const storage = memoryStorage()
  if (state) storage.setItem(STATE_KEY, JSON.stringify(state))
  return { storage, channels: fakeChannelPair(), clock: fixedClock() }
}

export function createTestStore(shared: Shared): Store {
  return createStore({ storage: shared.storage, channel: shared.channels.create(), now: shared.clock.now })
}

export interface RenderAppOptions {
  path: string
  role?: Role | null
  state?: AppState
  store?: Store
  shared?: Shared
  /** Replaces the Web Audio beep (REQ-21); defaults to a no-op in tests. */
  playBeep?: () => void
}

export function renderApp(opts: RenderAppOptions) {
  const shared = opts.shared ?? createShared(opts.state)
  if (opts.shared && opts.state) shared.storage.setItem(STATE_KEY, JSON.stringify(opts.state))
  const store = opts.store ?? createTestStore(shared)
  const pathSource = createMemoryPathSource(opts.path)
  const roleSource = createRoleSource(memoryStorage())
  if (opts.role) roleSource.set(opts.role)
  const utils = render(
    <StoreProvider store={store}>
      <PathProvider source={pathSource}>
        <RoleProvider source={roleSource}>
          <BeepProvider playBeep={opts.playBeep ?? (() => {})}>
            <App />
          </BeepProvider>
        </RoleProvider>
      </PathProvider>
    </StoreProvider>,
  )
  return {
    ...utils,
    screen: within(utils.container),
    store,
    shared,
    pathSource,
    roleSource,
    user: userEvent.setup(),
  }
}

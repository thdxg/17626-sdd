import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { CHANNEL_NAME, STATE_KEY, browserChannel, createStore } from './store/store'
import { StoreProvider } from './store/useAppState'

// Shared state between tabs (A-10, REQ-12): localStorage + BroadcastChannel notices,
// with `storage` events and `visibilitychange` as fallbacks.
const store = createStore({
  storage: window.localStorage,
  channel: browserChannel(CHANNEL_NAME),
  now: () => new Date(),
  onExternalChange(refresh) {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STATE_KEY || e.key === null) refresh()
    }
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh()
    }
    window.addEventListener('storage', onStorage)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.removeEventListener('storage', onStorage)
      document.removeEventListener('visibilitychange', onVisible)
    }
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StoreProvider store={store}>
      <App />
    </StoreProvider>
  </StrictMode>,
)

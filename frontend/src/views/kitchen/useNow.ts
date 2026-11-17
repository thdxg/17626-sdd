// Re-render every `intervalMs` with the store's injected clock (research R-12). REQ-21
import { useEffect, useState } from 'react'
import { useStore } from '../../store/useAppState'

export function useNow(intervalMs = 1000): number {
  const store = useStore()
  const [now, setNow] = useState(() => store.now().getTime())
  useEffect(() => {
    const id = setInterval(() => setNow(store.now().getTime()), intervalMs)
    return () => clearInterval(id)
  }, [store, intervalMs])
  return now
}

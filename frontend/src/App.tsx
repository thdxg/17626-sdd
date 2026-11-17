// Path switch: / → RoleMenu, /server, /kitchen (contracts/ui.md §Routes). REQ-12 (A-3, A-10)
import { useEffect } from 'react'
import type { Role } from './domain/types'
import { usePath } from './routing/usePath'
import { useRole } from './store/role'
import { KitchenScreen } from './views/kitchen/KitchenScreen'
import { RoleMenu } from './views/RoleMenu'
import { ServerScreen } from './views/server/ServerScreen'

const ROUTE_ROLES: Record<string, readonly Role[]> = {
  '/server': ['server'],
  '/kitchen': ['station lead', 'expediter'],
}

export default function App() {
  const { path, navigate } = usePath()
  const [role] = useRole()
  const needs = ROUTE_ROLES[path]
  const allowed = needs !== undefined && role !== null && needs.includes(role)

  useEffect(() => {
    if (needs && !allowed) navigate('/', { replace: true })
  }, [needs, allowed, navigate])

  if (allowed && path === '/server') return <ServerScreen />
  if (allowed && path === '/kitchen') return <KitchenScreen />
  return <RoleMenu />
}

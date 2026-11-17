// Kitchen display (/kitchen) with a station lead / expediter switch (R-5). REQ-06, REQ-07, REQ-08, REQ-09
import type { Role } from '../../domain/types'
import { useRole } from '../../store/role'
import { useAppState } from '../../store/useAppState'
import { Header } from '../Header'
import { TicketList } from './TicketList'

const KITCHEN_ROLES: Array<{ role: Role; label: string }> = [
  { role: 'station lead', label: 'Station lead' },
  { role: 'expediter', label: 'Expediter' },
]

export function KitchenScreen() {
  const state = useAppState()
  const [role, setRole] = useRole()
  if (role === null) return null
  return (
    <div className="screen kitchen">
      <Header title="Kitchen display">
        <span className="row" role="group" aria-label="Kitchen role">
          {KITCHEN_ROLES.map((r) => (
            <button key={r.role} type="button" aria-pressed={role === r.role} onClick={() => setRole(r.role)}>
              {r.label}
            </button>
          ))}
        </span>
      </Header>
      <TicketList state={state} role={role} />
    </div>
  )
}

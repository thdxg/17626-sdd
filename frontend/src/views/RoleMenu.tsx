// Role menu, no login (contracts/ui.md §Role menu, Constitution IV). REQ-09, REQ-10, REQ-11, REQ-14 (A-3)
import type { Role } from '../domain/types'
import { usePath } from '../routing/usePath'
import { useRole } from '../store/role'
import { useDispatch } from '../store/useAppState'

const CHOICES: Array<{ role: Role; label: string; path: string }> = [
  { role: 'server', label: 'Server', path: '/server' },
  { role: 'station lead', label: 'Station lead', path: '/kitchen' },
  { role: 'expediter', label: 'Expediter', path: '/kitchen' },
]

export function RoleMenu() {
  const [, setRole] = useRole()
  const { navigate } = usePath()
  const dispatch = useDispatch()
  return (
    <main className="role-menu">
      <h1>Allergy order round trip</h1>
      <p>Pick a role for this tab.</p>
      <div className="row">
        {CHOICES.map((c) => (
          <button
            key={c.role}
            type="button"
            className="big"
            onClick={() => {
              setRole(c.role)
              navigate(c.path)
            }}
          >
            {c.label}
          </button>
        ))}
      </div>
      <p>
        <button type="button" onClick={() => dispatch({ type: 'reset' })}>
          Reset demo data
        </button>
      </p>
    </main>
  )
}

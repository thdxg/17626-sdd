// Screen header: role, "Change role", "Reset demo data" (contracts/ui.md §Routes). REQ-12 (A-3, A-10)
import type { ReactNode } from 'react'
import { usePath } from '../routing/usePath'
import { useRole } from '../store/role'
import { useDispatch } from '../store/useAppState'

export function Header(props: { title: string; children?: ReactNode }) {
  const [role] = useRole()
  const { navigate } = usePath()
  const dispatch = useDispatch()
  return (
    <header className="header">
      <h1>{props.title}</h1>
      <span className="header-role">Role: {role ?? 'none'}</span>
      {props.children}
      <a
        href="/"
        onClick={(e) => {
          e.preventDefault()
          navigate('/')
        }}
      >
        Change role
      </a>
      <button type="button" onClick={() => dispatch({ type: 'reset' })}>
        Reset demo data
      </button>
    </header>
  )
}

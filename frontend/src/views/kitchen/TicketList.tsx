// Tickets in sortTickets order (REQ-08). One sound per newly seen allergy ticket and a flashing
// label after the escalation time (REQ-21, SHOULD).
import { useEffect, useRef } from 'react'
import { isAllergyTicket, isEscalated, sortTickets } from '../../domain/kitchen'
import type { AppState, Role } from '../../domain/types'
import { useBeep } from './beep'
import { TicketCard } from './TicketCard'
import { useNow } from './useNow'

export function TicketList(props: { state: AppState; role: Role }) {
  const { state, role } = props
  const nowMs = useNow(1000)
  const beep = useBeep()
  const seen = useRef<Set<string>>(new Set())

  useEffect(() => {
    for (const t of state.tickets) {
      if (seen.current.has(t.id)) continue
      seen.current.add(t.id)
      // Never for a non-allergy ticket (REQ-21).
      if (isAllergyTicket(t, state.orderItems) && t.acknowledgedAt === null) beep()
    }
  }, [state.tickets, state.orderItems, beep])

  const tickets = sortTickets(state.tickets, state.orderItems)
  if (tickets.length === 0) return <p>No tickets.</p>
  return (
    <div className="ticket-list">
      {tickets.map((t) => (
        <TicketCard
          key={t.id}
          ticket={t}
          items={state.orderItems}
          role={role}
          flashing={isEscalated(t, state.orderItems, nowMs)}
        />
      ))}
    </div>
  )
}

// One ticket on the kitchen display. REQ-08, REQ-09
import { isAllergyTicket, offeredActions } from '../../domain/kitchen'
import { LABEL } from '../../domain/labels'
import type { AppState, Role, Ticket } from '../../domain/types'
import { dishById } from '../../data/dishes'
import { tableName } from '../../data/seed'
import { useDispatch } from '../../store/useAppState'
import { formatTime } from '../time'
import { AllergyItemRow } from './AllergyItemRow'
import { NormalItemRow } from './NormalItemRow'

export function TicketCard(props: { ticket: Ticket; items: AppState['orderItems']; role: Role; flashing?: boolean }) {
  const { ticket, items, role } = props
  const dispatch = useDispatch()
  const allergy = isAllergyTicket(ticket, items)
  const unacknowledged = allergy && ticket.acknowledgedAt === null
  const rows = ticket.itemIds.map((id) => items[id]).filter((i) => i !== undefined)
  const canAcknowledge = rows.some((i) => {
    const dish = dishById(i.dishId)
    return dish !== undefined && offeredActions(i, ticket, dish, role).includes('acknowledge')
  })

  return (
    <article
      className={`ticket${allergy ? ' allergy' : ''}${unacknowledged ? ' unacknowledged' : ''}`}
      data-testid="ticket"
      data-ticket={ticket.id}
    >
      <header className="ticket-head">
        <strong>{tableName(ticket.tableId)}</strong>
        <span>Sent at {formatTime(ticket.sentAt)}</span>
      </header>
      {unacknowledged && (
        <p className="alarm" data-testid="allergy-label" data-flashing={props.flashing ? 'true' : 'false'}>
          {LABEL.allergyNotAcknowledged}
        </p>
      )}
      {canAcknowledge && (
        <button
          type="button"
          className="primary"
          onClick={() => dispatch({ type: 'acknowledge', ticketId: ticket.id, role })}
        >
          Acknowledge
        </button>
      )}
      <ul className="ticket-items">
        {rows.map((i) => {
          const dish = dishById(i.dishId)
          if (!dish) return null
          return i.isAllergyOrder ? (
            <AllergyItemRow key={i.id} item={i} dish={dish} ticket={ticket} role={role} />
          ) : (
            <NormalItemRow key={i.id} item={i} dish={dish} />
          )
        })}
      </ul>
    </article>
  )
}

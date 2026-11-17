// An allergy item on the kitchen display: kitchenItemText lines, the kitchen status as text, the
// saved review / reason / sign-off, and only the buttons offeredActions returns.
// REQ-06, REQ-07, REQ-10, REQ-11, REQ-14
import { useState } from 'react'
import { offeredActions } from '../../domain/kitchen'
import { LABEL, kitchenItemText } from '../../domain/labels'
import type { DishRecord, OrderItem, Role, Ticket } from '../../domain/types'
import { useDispatch } from '../../store/useAppState'
import { formatTime } from '../time'
import { CannotConfirmForm } from './CannotConfirmForm'

export function AllergyItemRow({ item, dish, ticket, role }: { item: OrderItem; dish: DishRecord; ticket: Ticket; role: Role }) {
  const dispatch = useDispatch()
  const [reasonOpen, setReasonOpen] = useState(false)
  const actions = offeredActions(item, ticket, dish, role)
  return (
    <li className="kitchen-item allergy" data-testid="kitchen-item" data-kind="allergy" data-dish={item.dishId} data-seat={item.seatNumber}>
      <div className="item-head">
        <span className="dish-name">{dish.name}</span>
        <span className="status" data-testid="kitchen-status">
          {item.kitchenStatus}
        </span>
      </div>
      <ul className="item-lines">
        {kitchenItemText(item, dish).map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      {item.review && (
        <p className="record">
          {LABEL.confirmed} by {item.review.role} at {formatTime(item.review.at)}
        </p>
      )}
      {item.cannotConfirm && (
        <p className="record">
          {LABEL.reasonPrefix}
          {item.cannotConfirm.reason} ({item.cannotConfirm.role}, {formatTime(item.cannotConfirm.at)})
        </p>
      )}
      {item.signOff && (
        <p className="record">
          Signed off by {item.signOff.role} at {formatTime(item.signOff.at)}
        </p>
      )}
      <div className="row actions">
        {actions.includes('confirm') && (
          <button type="button" className="primary" onClick={() => dispatch({ type: 'confirm', itemId: item.id, role })}>
            Confirm
          </button>
        )}
        {actions.includes('cannotConfirm') && !reasonOpen && (
          <button type="button" onClick={() => setReasonOpen(true)}>
            Cannot confirm
          </button>
        )}
        {actions.includes('signOff') && (
          <button type="button" className="primary" onClick={() => dispatch({ type: 'signOff', itemId: item.id, role })}>
            Sign off
          </button>
        )}
      </div>
      {actions.includes('cannotConfirm') && reasonOpen && (
        <CannotConfirmForm itemId={item.id} role={role} onClose={() => setReasonOpen(false)} />
      )}
    </li>
  )
}

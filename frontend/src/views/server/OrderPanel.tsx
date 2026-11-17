// Order for the selected table, grouped by seat.
// REQ-02, REQ-03, REQ-04, REQ-05, REQ-12, REQ-13, REQ-15, REQ-16, REQ-20
import { isAllergyOrder } from '../../domain/allergyOrder'
import { LABEL, dishLabels } from '../../domain/labels'
import { Labels } from '../Labels'
import type { AppState, OrderItem, Table } from '../../domain/types'
import { seatKey } from '../../domain/types'
import { dishById } from '../../data/dishes'
import { useDispatch } from '../../store/useAppState'
import { allergyText } from './text'
import { ApprovedChanges } from './ApprovedChanges'

function OrderItemRow({ item, state }: { item: OrderItem; state: AppState }) {
  const dispatch = useDispatch()
  const dish = dishById(item.dishId)
  if (!dish) return null
  const draft = item.ticketId === null
  // Draft items use the seat's current allergies; sent items use the snapshot (R-10).
  const allergies = draft ? (state.seats[seatKey(item.tableId, item.seatNumber)]?.allergies ?? []) : (item.allergySnapshot ?? [])
  const allergyOrder = draft ? isAllergyOrder(allergies) : item.isAllergyOrder === true
  return (
    <li data-testid="order-item" data-dish={item.dishId} data-seat={item.seatNumber} data-sent={!draft}>
      <span className="dish-name">{dish.name}</span>
      {allergyOrder && (
        <span className="tag allergy-order" data-label>
          {LABEL.allergyOrder}
        </span>
      )}
      {/* Recomputed from the latest snapshot on every render (REQ-12, REQ-13, REQ-15). */}
      <Labels labels={draft ? dishLabels(dish, allergies) : dishLabels(dish, allergies, item)} />
      <ApprovedChanges dish={dish} seatAllergies={allergies} />
      {allergies.length > 0 && (
        <span className="item-allergies">{allergies.map(allergyText).join('; ')}</span>
      )}
      {draft && (
        <button type="button" aria-label={`Remove ${dish.name}`} onClick={() => dispatch({ type: 'removeDraftItem', itemId: item.id })}>
          Remove
        </button>
      )}
    </li>
  )
}

export function OrderPanel(props: { state: AppState; table: Table }) {
  const { state, table } = props
  const dispatch = useDispatch()
  const items = Object.values(state.orderItems).filter((i) => i.tableId === table.id)
  const seats = Array.from({ length: table.seatCount }, (_, i) => i + 1)
  return (
    <section className="panel" aria-label="Order">
      <h2>Order</h2>
      {seats.map((n) => {
        const seatItems = items.filter((i) => i.seatNumber === n)
        if (seatItems.length === 0) return null
        return (
          <div key={n} className="order-seat" data-order-seat={n}>
            <h3>Seat {n}</h3>
            <ul>
              {seatItems.map((i) => (
                <OrderItemRow key={i.id} item={i} state={state} />
              ))}
            </ul>
          </div>
        )
      })}
      {items.length === 0 && <p>No items yet.</p>}
      {/* Sending a "Contains" dish is allowed with no block or warning (Clarifications). REQ-03, REQ-06 */}
      <button
        type="button"
        className="primary"
        disabled={!items.some((i) => i.ticketId === null)}
        onClick={() => dispatch({ type: 'sendOrder', tableId: table.id })}
      >
        Send order
      </button>
    </section>
  )
}

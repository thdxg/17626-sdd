// A normal (non-allergy) item: dish name and seat only, never an allergy label. REQ-06, REQ-21
import type { DishRecord, OrderItem } from '../../domain/types'

export function NormalItemRow({ item, dish }: { item: OrderItem; dish: DishRecord }) {
  return (
    <li className="kitchen-item normal" data-testid="kitchen-item" data-kind="normal" data-dish={item.dishId} data-seat={item.seatNumber}>
      <span className="dish-name">{dish.name}</span> · <span>seat {item.seatNumber}</span>
    </li>
  )
}

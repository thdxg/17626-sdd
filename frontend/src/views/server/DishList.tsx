// Menu for the selected seat: one row per dish with its labels and "Add".
// REQ-02, REQ-03, REQ-04, REQ-05, REQ-16, REQ-20
import { dishLabels } from '../../domain/labels'
import type { Allergy } from '../../domain/types'
import { Labels } from '../Labels'
import { ApprovedChanges } from './ApprovedChanges'
import { DISHES } from '../../data/dishes'
import { useDispatch } from '../../store/useAppState'

export function DishList(props: { tableId: string; seatNumber: number; seatAllergies: Allergy[] }) {
  const dispatch = useDispatch()
  return (
    <section className="panel" aria-label="Menu">
      <h2>Menu for seat {props.seatNumber}</h2>
      <ul className="dish-list">
        {DISHES.map((dish) => (
          <li key={dish.id} data-testid="dish-row" data-dish={dish.id}>
            <span className="dish-name">{dish.name}</span>
            <Labels labels={dishLabels(dish, props.seatAllergies)} />
            <button
              type="button"
              aria-label={`Add ${dish.name}`}
              onClick={() =>
                dispatch({ type: 'addItem', tableId: props.tableId, seatNumber: props.seatNumber, dishId: dish.id })
              }
            >
              Add
            </button>
            <ApprovedChanges dish={dish} seatAllergies={props.seatAllergies} />
          </li>
        ))}
      </ul>
    </section>
  )
}

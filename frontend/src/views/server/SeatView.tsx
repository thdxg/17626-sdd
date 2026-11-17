// Seat view: the allergy panel (always visible, R-11) and the seat's recorded allergies.
// REQ-01, REQ-02, REQ-17
import type { Allergy } from '../../domain/types'
import { AllergyPanel } from './AllergyPanel'
import { allergyText } from './text'

export function SeatView(props: { tableId: string; seatNumber: number; allergies: Allergy[] }) {
  return (
    <section className="seat-view" aria-label={`Seat ${props.seatNumber}`}>
      <h2>Seat {props.seatNumber}</h2>
      <AllergyPanel key={`${props.tableId}:${props.seatNumber}`} tableId={props.tableId} seatNumber={props.seatNumber} />
      <ul className="allergy-list" data-testid="seat-allergies">
        {props.allergies.map((a) => (
          <li key={a.id}>{allergyText(a)}</li>
        ))}
      </ul>
    </section>
  )
}

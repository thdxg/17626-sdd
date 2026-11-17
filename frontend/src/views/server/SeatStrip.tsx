// Seat strip: one button per seat; a seat with allergies shows their names (REQ-02).
import type { AppState, Table } from '../../domain/types'
import { seatAllergenNames } from './text'

export function SeatStrip(props: { state: AppState; table: Table; selected: number; onSelect: (seat: number) => void }) {
  const { table } = props
  return (
    <div className="row seat-strip" data-testid="seat-strip" role="group" aria-label="Seats">
      {Array.from({ length: table.seatCount }, (_, i) => i + 1).map((n) => {
        const names = seatAllergenNames(props.state, table.id, n)
        return (
          <span key={n} className="seat" data-seat={n}>
            <button type="button" aria-pressed={n === props.selected} onClick={() => props.onSelect(n)}>
              Seat {n}
            </button>
            {names.length > 0 && <small className="seat-allergens">{names.join(', ')}</small>}
          </span>
        )
      })}
    </div>
  )
}

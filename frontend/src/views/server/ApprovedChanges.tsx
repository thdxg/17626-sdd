// Chef-approved changes listed as text on a menu row under a "Contains" dish; nothing else is
// offered. The order item has the picker (OrderPanel). REQ-20
import { approvedChangesFor } from '../../domain/labels'
import type { Allergy, DishRecord } from '../../domain/types'

export function ApprovedChanges(props: { dish: DishRecord; seatAllergies: readonly Allergy[] }) {
  const changes = approvedChangesFor(props.dish, props.seatAllergies)
  if (changes.length === 0) return null
  return (
    <span className="changes">
      Chef-approved change:{' '}
      {changes.map((c, i) => (
        <span key={c}>
          {i > 0 && ', '}
          <span data-approved-change>{c}</span>
        </span>
      ))}
    </span>
  )
}

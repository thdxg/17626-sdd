// Inline allergy panel, always visible on the seat view (contracts/ui.md §Server tablet 3, R-11).
// Recording one allergen: allergen → severity → traces → Save = 4 taps. REQ-01, REQ-17
import { useState } from 'react'
import type { AllergenId, Severity } from '../../domain/types'
import { SEVERITIES, SEVERITY_DISPLAY } from '../../domain/types'
import { ALLERGENS } from '../../data/allergens'
import { useDispatch } from '../../store/useAppState'

export function AllergyPanel(props: { tableId: string; seatNumber: number }) {
  const dispatch = useDispatch()
  const [allergens, setAllergens] = useState<AllergenId[]>([])
  const [severity, setSeverity] = useState<Severity | null>(null) // no default
  const [traces, setTraces] = useState<boolean | null>(null) // no default
  const [note, setNote] = useState('')

  const canSave = allergens.length > 0 && severity !== null && traces !== null

  const toggle = (id: AllergenId) =>
    setAllergens((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]))

  const save = () => {
    if (!canSave) return
    dispatch({
      type: 'recordAllergy',
      tableId: props.tableId,
      seatNumber: props.seatNumber,
      allergens,
      severity,
      traces,
      note,
    })
    setAllergens([])
    setSeverity(null)
    setTraces(null)
    setNote('')
  }

  return (
    <section className="panel allergy-panel" aria-label="Record allergy">
      <div className="chips" role="group" aria-label="Allergens">
        {ALLERGENS.map((a) => (
          <button
            key={a.id}
            type="button"
            className="chip"
            aria-pressed={allergens.includes(a.id)}
            onClick={() => toggle(a.id)}
          >
            {a.name}
          </button>
        ))}
      </div>
      <div className="chips" role="group" aria-label="Severity">
        {SEVERITIES.map((s) => (
          <button
            key={s}
            type="button"
            className="chip"
            aria-pressed={severity === s}
            onClick={() => setSeverity(s)}
          >
            {SEVERITY_DISPLAY[s]}
          </button>
        ))}
      </div>
      <div className="chips" role="group" aria-label="Traces">
        <button type="button" className="chip" aria-pressed={traces === true} onClick={() => setTraces(true)}>
          Traces: yes
        </button>
        <button type="button" className="chip" aria-pressed={traces === false} onClick={() => setTraces(false)}>
          Traces: no
        </button>
      </div>
      <details className="note">
        <summary>Add a note</summary>
        <label>
          Note (optional)
          <input type="text" value={note} onChange={(e) => setNote(e.target.value)} />
        </label>
      </details>
      <button type="button" className="primary" disabled={!canSave} onClick={save}>
        Save allergy
      </button>
    </section>
  )
}

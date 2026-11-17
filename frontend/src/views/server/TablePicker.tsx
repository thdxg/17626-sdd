// Table picker (contracts/ui.md §Server tablet 1). REQ-02
import type { Table } from '../../domain/types'
import { tableName } from '../../data/seed'

export function TablePicker(props: { tables: Table[]; selected: string; onSelect: (tableId: string) => void }) {
  return (
    <nav className="row" aria-label="Tables">
      {props.tables.map((t) => (
        <button
          key={t.id}
          type="button"
          aria-pressed={t.id === props.selected}
          onClick={() => props.onSelect(t.id)}
        >
          {tableName(t.id)}
        </button>
      ))}
    </nav>
  )
}

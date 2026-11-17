// Server tablet (/server). REQ-01, REQ-02, REQ-03, REQ-17
import { useState } from 'react'
import { seatKey } from '../../domain/types'
import { useAppState } from '../../store/useAppState'
import { Header } from '../Header'
import { DishList } from './DishList'
import { OrderPanel } from './OrderPanel'
import { SeatStrip } from './SeatStrip'
import { SeatView } from './SeatView'
import { TablePicker } from './TablePicker'

export function ServerScreen() {
  const state = useAppState()
  const [tableId, setTableId] = useState(state.tables[0]?.id ?? '')
  const [seatNumber, setSeatNumber] = useState(1)
  const table = state.tables.find((t) => t.id === tableId) ?? state.tables[0]
  if (!table) return null
  const seat = Math.min(seatNumber, table.seatCount)
  const allergies = state.seats[seatKey(table.id, seat)]?.allergies ?? []

  return (
    <div className="screen server">
      <Header title="Server tablet" />
      <TablePicker
        tables={state.tables}
        selected={table.id}
        onSelect={(id) => {
          setTableId(id)
          setSeatNumber(1)
        }}
      />
      <SeatStrip state={state} table={table} selected={seat} onSelect={setSeatNumber} />
      <div className="server-grid">
        <SeatView tableId={table.id} seatNumber={seat} allergies={allergies} />
        <DishList tableId={table.id} seatNumber={seat} seatAllergies={allergies} />
        <OrderPanel state={state} table={table} />
      </div>
    </div>
  )
}

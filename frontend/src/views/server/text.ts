// Plain-text helpers for the server tablet views. REQ-01, REQ-02
import type { Allergy, AppState } from '../../domain/types'
import { SEVERITY_DISPLAY, seatKey } from '../../domain/types'
import { allergenName } from '../../data/allergens'

export function allergyText(a: Allergy): string {
  const parts = [a.allergens.map(allergenName).join(', '), SEVERITY_DISPLAY[a.severity], `Traces: ${a.traces ? 'yes' : 'no'}`]
  if (a.note) parts.push(a.note)
  return parts.join(' · ')
}

export function seatAllergenNames(state: AppState, tableId: string, seat: number): string[] {
  const allergies = state.seats[seatKey(tableId, seat)]?.allergies ?? []
  return [...new Set(allergies.flatMap((a) => a.allergens))].map(allergenName)
}

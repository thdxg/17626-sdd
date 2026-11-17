// REQ-03 (and REQ-18: a preference-only seat gives false; tested in the SHOULD phase).
import type { Allergy, Severity } from './types'

const ALLERGY_ORDER_SEVERITIES: ReadonlySet<Severity> = new Set(['severe', 'intolerance', 'unknown'])

export function isAllergyOrder(allergies: readonly Allergy[]): boolean {
  return allergies.some((a) => ALLERGY_ORDER_SEVERITIES.has(a.severity))
}

import { describe, expect, it } from 'vitest'
import { ALLERGENS } from '../data/allergens'
import { DISHES } from '../data/dishes'

const FORBIDDEN = /safe|allergen[\s-]*free/i

function allStrings(value: unknown): string[] {
  if (typeof value === 'string') return [value]
  if (Array.isArray(value)) return value.flatMap(allStrings)
  if (value && typeof value === 'object') {
    return Object.entries(value).flatMap(([k, v]) => [k, ...allStrings(v)])
  }
  return []
}

describe('mock data', () => {
  it('REQ-05: no string in dishes.ts or allergens.ts says "safe" or "allergen-free"', () => {
    const strings = [...allStrings(DISHES), ...allStrings(ALLERGENS)]
    expect(strings.length).toBeGreaterThan(0)
    for (const s of strings) expect(s).not.toMatch(FORBIDDEN)
  })

  it('A-2: the menu covers tree nuts, the shared fryer, a chef-approved change and missing info', () => {
    expect(DISHES.length).toBe(8)
    expect(DISHES.some((d) => d.allergens.includes('tree-nuts'))).toBe(true)
    expect(DISHES.some((d) => d.sharedEquipment.includes('fryer'))).toBe(true)
    expect(DISHES.some((d) => Object.values(d.approvedChanges).some((v) => (v?.length ?? 0) > 0))).toBe(true)
    expect(DISHES.some((d) => d.allergenInfo === 'missing')).toBe(true)
  })

  it('REQ-01: the allergen list has exactly 14 unique ids', () => {
    expect(ALLERGENS.length).toBe(14)
    expect(new Set(ALLERGENS.map((a) => a.id)).size).toBe(14)
  })

  it('A-1: dish records are read-only', () => {
    expect(Object.isFrozen(DISHES)).toBe(true)
    for (const d of DISHES) expect(Object.isFrozen(d)).toBe(true)
  })
})

import { describe, expect, it } from 'vitest'
import { isAllergyOrder } from '../domain/allergyOrder'
import type { Allergy, Severity } from '../domain/types'

const allergy = (severity: Severity): Allergy => ({
  id: severity,
  allergens: ['tree-nuts'],
  severity,
  traces: true,
  recordedAt: '2026-11-16T12:00:00.000Z',
})

describe('isAllergyOrder', () => {
  it.each(['severe', 'intolerance', 'unknown'] as const)(
    'REQ-03: a seat with severity "%s" makes every item an allergy order (A-5)',
    (severity) => {
      expect(isAllergyOrder([allergy(severity)])).toBe(true)
    },
  )

  it('REQ-03: one preference and one severe allergy on a seat → allergy order (Edge Cases)', () => {
    expect(isAllergyOrder([allergy('preference'), allergy('severe')])).toBe(true)
  })

  it('REQ-03: a seat with no allergy is not an allergy order', () => {
    expect(isAllergyOrder([])).toBe(false)
  })
})

// SHOULD: enabled after the MUST gate passed (T063, 2026-11-16; Constitution IV, SC-007).
describe('REQ-18 (SHOULD)', () => {
  it('REQ-18: a seat whose only severity is preference is not an allergy order', () => {
    expect(isAllergyOrder([allergy('preference')])).toBe(false)
  })
})

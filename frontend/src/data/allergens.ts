// Fixed allergen list (research R-8). The UI cannot add allergens. REQ-01, REQ-04, REQ-06
import type { Allergen, AllergenId } from '../domain/types'

export const ALLERGENS: readonly Allergen[] = Object.freeze(
  (
    [
      ['gluten', 'Gluten'],
      ['crustaceans', 'Crustaceans'],
      ['eggs', 'Eggs'],
      ['fish', 'Fish'],
      ['peanuts', 'Peanuts'],
      ['soybeans', 'Soybeans'],
      ['milk', 'Milk'],
      ['tree-nuts', 'Tree nuts'],
      ['celery', 'Celery'],
      ['mustard', 'Mustard'],
      ['sesame', 'Sesame'],
      ['sulphites', 'Sulphites'],
      ['lupin', 'Lupin'],
      ['molluscs', 'Molluscs'],
    ] as const
  ).map(([id, name]) => Object.freeze({ id, name })),
)

const BY_ID = new Map<string, Allergen>(ALLERGENS.map((a) => [a.id, a]))

export function isAllergenId(value: unknown): value is AllergenId {
  return typeof value === 'string' && BY_ID.has(value)
}

export function allergenName(id: AllergenId): string {
  return BY_ID.get(id)?.name ?? id
}

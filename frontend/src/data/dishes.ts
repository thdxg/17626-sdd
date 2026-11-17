// Read-only mock dish records (research R-8). Both screens import this one module (A-1, A-2).
// REQ-04, REQ-07, REQ-10, REQ-16, REQ-20
import type { DishRecord } from '../domain/types'

function freezeDish(d: DishRecord): DishRecord {
  return Object.freeze({
    ...d,
    allergens: Object.freeze([...d.allergens]),
    sharedEquipment: Object.freeze([...d.sharedEquipment]),
    approvedChanges: Object.freeze(
      Object.fromEntries(
        Object.entries(d.approvedChanges).map(([k, v]) => [k, Object.freeze([...(v ?? [])])]),
      ),
    ),
  })
}

export const DISHES: readonly DishRecord[] = Object.freeze(
  [
    {
      id: 'walnut-salad',
      name: 'Pear & walnut salad',
      allergens: ['tree-nuts', 'mustard'],
      allergenInfo: 'complete',
      sharedEquipment: [],
      approvedChanges: { 'tree-nuts': ['Without walnuts'] },
    },
    {
      id: 'almond-tart',
      name: 'Almond tart',
      allergens: ['tree-nuts', 'gluten', 'eggs', 'milk'],
      allergenInfo: 'complete',
      sharedEquipment: [],
      approvedChanges: {},
    },
    {
      id: 'fish-chips',
      name: 'Fish & chips',
      allergens: ['fish', 'gluten'],
      allergenInfo: 'complete',
      sharedEquipment: ['fryer'],
      approvedChanges: {},
    },
    {
      id: 'steak-frites',
      name: 'Steak frites',
      allergens: [],
      allergenInfo: 'complete',
      sharedEquipment: ['fryer'],
      approvedChanges: {},
    },
    {
      id: 'risotto',
      name: 'Mushroom risotto',
      allergens: ['milk', 'celery'],
      allergenInfo: 'complete',
      sharedEquipment: [],
      approvedChanges: { milk: ['Olive oil instead of butter and parmesan'] },
    },
    {
      id: 'roast-chicken',
      name: 'Roast chicken',
      allergens: ['celery', 'sulphites'],
      allergenInfo: 'complete',
      sharedEquipment: ['base'],
      approvedChanges: {},
    },
    {
      id: 'green-salad',
      name: 'Green salad',
      allergens: [],
      allergenInfo: 'complete',
      sharedEquipment: ['utensil'],
      approvedChanges: {},
    },
    {
      id: 'daily-special',
      name: 'Daily special',
      allergens: [],
      allergenInfo: 'missing',
      sharedEquipment: [],
      approvedChanges: {},
    },
  ].map((d) => freezeDish(d as DishRecord)),
)

const BY_ID = new Map(DISHES.map((d) => [d.id, d]))

export function dishById(id: string): DishRecord | undefined {
  return BY_ID.get(id)
}

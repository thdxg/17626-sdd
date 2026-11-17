import { describe, expect, it } from 'vitest'
import { dishById } from '../data/dishes'
import { LABEL, dishLabels } from '../domain/labels'
import type { Allergy, DishRecord, OrderItem } from '../domain/types'
import { seed, withAllergy, withSentAllergyTicket } from './fixtures'

const dish = (id: string): DishRecord => dishById(id)!

const allergy = (over: Partial<Allergy> = {}): Allergy => ({
  id: 'a1',
  allergens: ['tree-nuts'],
  severity: 'severe',
  traces: true,
  recordedAt: '2026-11-16T12:00:00.000Z',
  ...over,
})

const TREE_NUT_SEAT = [allergy()]
const NO_ALLERGY: Allergy[] = []

describe('dishLabels — menu rows (no item)', () => {
  it.each(['walnut-salad', 'almond-tart'])('REQ-04: tree-nut seat × %s → "Contains Tree nuts" (scenario 1)', (id) => {
    expect(dishLabels(dish(id), TREE_NUT_SEAT)).toContain('Contains Tree nuts')
  })

  it('REQ-04: tree-nut seat × risotto → no "Contains" label (scenario 2)', () => {
    expect(dishLabels(dish('risotto'), TREE_NUT_SEAT).some((l) => l.startsWith('Contains'))).toBe(false)
  })

  it('REQ-04: a seat with two matching allergens gets one "Contains" per match', () => {
    const seat = [allergy({ allergens: ['tree-nuts', 'milk'] }), allergy({ id: 'a2', allergens: ['milk'] })]
    const labels = dishLabels(dish('almond-tart'), seat)
    expect(labels.filter((l) => l.startsWith('Contains')).sort()).toEqual(['Contains Milk', 'Contains Tree nuts'])
  })

  it('REQ-05: tree-nut seat × steak-frites → ["Not confirmed"] (scenario 3)', () => {
    expect(dishLabels(dish('steak-frites'), TREE_NUT_SEAT)).toEqual([LABEL.notConfirmed])
  })

  it('REQ-05: a "Contains" dish does not also get "Not confirmed"', () => {
    expect(dishLabels(dish('walnut-salad'), TREE_NUT_SEAT)).not.toContain(LABEL.notConfirmed)
  })

  it('REQ-05: a seat with no allergy × any complete dish → no "Not confirmed" (scenario 8)', () => {
    for (const id of ['walnut-salad', 'almond-tart', 'fish-chips', 'steak-frites', 'risotto', 'roast-chicken', 'green-salad']) {
      expect(dishLabels(dish(id), NO_ALLERGY)).toEqual([])
    }
  })

  it('REQ-16: any allergy seat × daily-special → "Cannot confirm", not "Not confirmed" (scenario 5)', () => {
    for (const severity of ['severe', 'intolerance', 'preference', 'unknown'] as const) {
      const labels = dishLabels(dish('daily-special'), [allergy({ severity })])
      expect(labels).toContain(LABEL.cannotConfirm)
      expect(labels).not.toContain(LABEL.notConfirmed)
    }
  })

  it('REQ-16: a seat with no allergy × daily-special → no "Cannot confirm"', () => {
    expect(dishLabels(dish('daily-special'), NO_ALLERGY)).not.toContain(LABEL.cannotConfirm)
  })

  it('REQ-04 REQ-16: a dish that lists the allergen and is "unverified" shows both "Contains …" and "Cannot confirm" (Edge Cases)', () => {
    const unverified: DishRecord = {
      id: 'test-unverified',
      name: 'Test nut bake',
      allergens: ['tree-nuts'],
      allergenInfo: 'unverified',
      sharedEquipment: [],
      approvedChanges: {},
    }
    const labels = dishLabels(unverified, TREE_NUT_SEAT)
    expect(labels).toContain('Contains Tree nuts')
    expect(labels).toContain(LABEL.cannotConfirm)
    expect(labels).not.toContain(LABEL.notConfirmed)
  })

  it('REQ-05: menu labels never say "safe" or "allergen-free"', () => {
    for (const id of ['walnut-salad', 'almond-tart', 'fish-chips', 'steak-frites', 'risotto', 'roast-chicken', 'green-salad', 'daily-special']) {
      for (const seat of [TREE_NUT_SEAT, NO_ALLERGY, [allergy({ severity: 'preference' })]]) {
        for (const l of dishLabels(dish(id), seat)) expect(l).not.toMatch(/safe|allergen[\s-]*free/i)
      }
    }
  })
})

describe('dishLabels — kitchen status of a sent allergy item', () => {
  type Status = NonNullable<OrderItem['kitchenStatus']>
  function sent(dishId: string, status: Status, opts: { signOff?: boolean; reason?: string } = {}) {
    const s = withAllergy(seed(), 'T12', 3)
    const { items } = withSentAllergyTicket(s, {
      tableId: 'T12',
      items: [{ seat: 3, dishId, kitchenStatus: status, signOff: opts.signOff, cannotConfirm: opts.reason }],
    })
    const item = items[0]
    return dishLabels(dish(dishId), item.allergySnapshot ?? [], item)
  }

  it('REQ-12: Sent → "Kitchen: Sent" + "Not confirmed" (no conflict)', () => {
    expect(sent('steak-frites', 'Sent')).toEqual([LABEL.kitchenSent, LABEL.notConfirmed])
  })

  it('REQ-12: Acknowledged → "Kitchen: Acknowledged" + "Not confirmed"', () => {
    expect(sent('steak-frites', 'Acknowledged')).toEqual([LABEL.kitchenAcknowledged, LABEL.notConfirmed])
  })

  it('REQ-12: Sent "Contains" dish → "Contains Tree nuts" + "Kitchen: Sent", no "Not confirmed"', () => {
    expect(sent('walnut-salad', 'Sent')).toEqual(['Contains Tree nuts', LABEL.kitchenSent])
  })

  it('REQ-13 REQ-15: Confirmed without sign-off → "Confirmed" and not "OK to serve" (REQ-15 scenario 5)', () => {
    const labels = sent('steak-frites', 'Confirmed')
    expect(labels).toEqual([LABEL.confirmed])
    expect(labels).not.toContain(LABEL.okToServe)
    expect(labels).not.toContain(LABEL.notConfirmed)
  })

  it('REQ-15: Confirmed + sign-off → "Confirmed" + "OK to serve" (scenario 4)', () => {
    expect(sent('steak-frites', 'Confirmed', { signOff: true })).toEqual([LABEL.confirmed, LABEL.okToServe])
  })

  it('REQ-12: Cannot confirm → "Cannot confirm" + "Reason: <reason>" (scenario 2)', () => {
    const labels = sent('steak-frites', 'Cannot confirm', { reason: 'Shared fryer today' })
    expect(labels).toEqual([LABEL.cannotConfirm, 'Reason: Shared fryer today'])
  })

  it('REQ-12 REQ-16: daily special + Cannot confirm shows "Cannot confirm" once, with the reason', () => {
    const labels = sent('daily-special', 'Cannot confirm', { reason: 'Supplier sheet missing' })
    expect(labels.filter((l) => l === LABEL.cannotConfirm)).toHaveLength(1)
    expect(labels).toContain('Reason: Supplier sheet missing')
    expect(labels).not.toContain(LABEL.notConfirmed)
  })

  it('REQ-13: "Confirmed" is absent for every status except Confirmed (scenario 3)', () => {
    for (const id of DISH_IDS) {
      for (const status of ['Sent', 'Acknowledged', 'Cannot confirm'] as const) {
        expect(sent(id, status)).not.toContain(LABEL.confirmed)
      }
    }
  })

  it('REQ-15: "OK to serve" is absent whenever there is no sign-off', () => {
    for (const id of DISH_IDS) {
      for (const status of ['Sent', 'Acknowledged', 'Confirmed', 'Cannot confirm'] as const) {
        expect(sent(id, status)).not.toContain(LABEL.okToServe)
      }
    }
  })

  it('REQ-13: a normal (non-allergy) sent item never gets a kitchen status label', () => {
    const { items } = withSentAllergyTicket(seed(), { tableId: 'T12', items: [{ seat: 1, dishId: 'risotto' }] })
    expect(dishLabels(dish('risotto'), items[0].allergySnapshot ?? [], items[0])).toEqual([])
  })
})

const DISH_IDS = ['walnut-salad', 'almond-tart', 'fish-chips', 'steak-frites', 'risotto', 'roast-chicken', 'green-salad', 'daily-special']

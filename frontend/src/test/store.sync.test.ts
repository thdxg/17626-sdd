import { describe, expect, it } from 'vitest'
import { createSeed } from '../data/seed'
import { dishLabels, LABEL } from '../domain/labels'
import { dishById } from '../data/dishes'
import { STATE_KEY, createStore } from '../store/store'
import { fakeChannelPair, fixedClock, memoryStorage } from './fakes'
import { seed, withAllergy, withSentAllergyTicket } from './fixtures'

function twoTabs(opts: { manual?: boolean } = {}) {
  const base = withAllergy(seed(), 'T12', 3)
  const { state, items, ticket } = withSentAllergyTicket(base, {
    tableId: 'T12',
    items: [{ seat: 3, dishId: 'steak-frites' }],
  })
  const storage = memoryStorage({ [STATE_KEY]: JSON.stringify(state) })
  const channels = fakeChannelPair(opts)
  const clock = fixedClock()
  const tablet = createStore({ storage, channel: channels.create(), now: clock.now })
  const kitchen = createStore({ storage, channel: channels.create(), now: clock.now })
  return { tablet, kitchen, storage, channels, itemId: items[0].id, ticketId: ticket.id }
}

const tabletLabels = (store: ReturnType<typeof twoTabs>['tablet'], itemId: string) => {
  const item = store.getSnapshot().orderItems[itemId]
  return dishLabels(dishById(item.dishId)!, item.allergySnapshot ?? [], item)
}

describe('store sync between two tabs (A-10)', () => {
  it('REQ-12: a confirm in the kitchen store is visible in the tablet store after one notice (scenario 1)', () => {
    const { tablet, kitchen, channels, itemId, ticketId } = twoTabs({ manual: true })
    kitchen.dispatch({ type: 'acknowledge', ticketId, role: 'station lead' })
    kitchen.dispatch({ type: 'confirm', itemId, role: 'station lead' })
    expect(tablet.getSnapshot().orderItems[itemId].kitchenStatus).toBe('Sent') // not delivered yet
    channels.flush()
    expect(tablet.getSnapshot().orderItems[itemId].kitchenStatus).toBe('Confirmed')
    expect(tablet.getSnapshot().revision).toBe(kitchen.getSnapshot().revision)
  })

  it('REQ-12: subscribers of the tablet store are notified', () => {
    const { tablet, kitchen, ticketId } = twoTabs()
    let calls = 0
    tablet.subscribe(() => calls++)
    kitchen.dispatch({ type: 'acknowledge', ticketId, role: 'station lead' })
    expect(calls).toBe(1)
  })

  it('REQ-13 REQ-15: a notice with an old revision does not roll the tablet back', () => {
    const { tablet, kitchen, storage, channels, itemId, ticketId } = twoTabs({ manual: true })
    kitchen.dispatch({ type: 'acknowledge', ticketId, role: 'station lead' })
    const olderDoc = storage.getItem(STATE_KEY)! // revision 1: Acknowledged
    kitchen.dispatch({ type: 'confirm', itemId, role: 'station lead' })
    channels.flush()
    const snap = tablet.getSnapshot()
    expect(snap.orderItems[itemId].kitchenStatus).toBe('Confirmed')

    // Late, reordered notices (and even an older document in storage) must not roll back.
    storage.setItem(STATE_KEY, olderDoc)
    let notified = 0
    tablet.subscribe(() => notified++)
    const injector = channels.create()
    for (const revision of [0, 1, snap.revision]) injector.postMessage({ type: 'state-changed', revision })
    channels.flush()
    expect(notified).toBe(0)
    expect(tablet.getSnapshot()).toBe(snap)
    expect(tablet.getSnapshot().orderItems[itemId].kitchenStatus).toBe('Confirmed')
  })

  it('REQ-13 REQ-15: acknowledge then confirm delivered quickly ends on "Confirmed" and never shows "OK to serve" before signOff (Edge Cases)', () => {
    const { tablet, kitchen, channels, itemId, ticketId } = twoTabs({ manual: true })
    const seen: string[][] = []
    tablet.subscribe(() => seen.push(tabletLabels(tablet, itemId)))
    kitchen.dispatch({ type: 'acknowledge', ticketId, role: 'station lead' })
    kitchen.dispatch({ type: 'confirm', itemId, role: 'station lead' })
    channels.flush()
    expect(tabletLabels(tablet, itemId)).toEqual([LABEL.confirmed])
    for (const labels of seen) expect(labels).not.toContain(LABEL.okToServe)
    kitchen.dispatch({ type: 'signOff', itemId, role: 'expediter' })
    channels.flush()
    expect(tabletLabels(tablet, itemId)).toEqual([LABEL.confirmed, LABEL.okToServe])
  })

  it('A-10: reset in the tablet reaches the kitchen', () => {
    const { tablet, kitchen } = twoTabs()
    tablet.dispatch({ type: 'reset' })
    expect({ ...kitchen.getSnapshot(), revision: 0 }).toEqual(createSeed())
    expect(kitchen.getSnapshot().revision).toBe(tablet.getSnapshot().revision)
  })

  it('REQ-12: both tabs write to one document; a write re-reads the latest state first', () => {
    const { tablet, kitchen, itemId, ticketId } = twoTabs()
    kitchen.dispatch({ type: 'acknowledge', ticketId, role: 'station lead' })
    tablet.dispatch({ type: 'recordAllergy', tableId: 'T12', seatNumber: 1, allergens: ['milk'], severity: 'severe', traces: false })
    const k = kitchen.getSnapshot()
    expect(k.orderItems[itemId].kitchenStatus).toBe('Acknowledged')
    expect(k.seats['T12:1'].allergies).toHaveLength(1)
  })

  it('A-10: with channel null, an onExternalChange callback still re-reads', () => {
    const storage = memoryStorage()
    const clock = fixedClock()
    let refresh: (() => void) | null = null
    const tablet = createStore({
      storage,
      channel: null,
      now: clock.now,
      onExternalChange: (cb) => {
        refresh = cb
      },
    })
    const kitchen = createStore({ storage, channel: null, now: clock.now })
    kitchen.dispatch({ type: 'recordAllergy', tableId: 'T12', seatNumber: 3, allergens: ['milk'], severity: 'severe', traces: true })
    expect(tablet.getSnapshot().seats['T12:3'].allergies).toHaveLength(0)
    expect(refresh).not.toBeNull()
    refresh!()
    expect(tablet.getSnapshot().seats['T12:3'].allergies).toHaveLength(1)
  })
})

// DOM query helpers shared by RTL tests.
export function orderItems(root: HTMLElement, filter: { dish?: string; seat?: number } = {}): HTMLElement[] {
  return [...root.querySelectorAll<HTMLElement>('[data-testid="order-item"]')].filter(
    (el) =>
      (filter.dish === undefined || el.dataset.dish === filter.dish) &&
      (filter.seat === undefined || el.dataset.seat === String(filter.seat)),
  )
}

export function orderItem(root: HTMLElement, dish: string, seat: number): HTMLElement {
  const found = orderItems(root, { dish, seat })
  if (found.length !== 1) throw new Error(`expected one order item ${dish} seat ${seat}, found ${found.length}`)
  return found[0]
}

export function dishRow(root: HTMLElement, dishId: string): HTMLElement {
  const el = root.querySelector<HTMLElement>(`[data-testid="dish-row"][data-dish="${dishId}"]`)
  if (!el) throw new Error(`no dish row ${dishId}`)
  return el
}

export function ticketCards(root: HTMLElement): HTMLElement[] {
  return [...root.querySelectorAll<HTMLElement>('[data-testid="ticket"]')]
}

export function kitchenItem(root: HTMLElement, dish: string, seat?: number): HTMLElement {
  const found = [...root.querySelectorAll<HTMLElement>('[data-testid="kitchen-item"]')].filter(
    (el) => el.dataset.dish === dish && (seat === undefined || el.dataset.seat === String(seat)),
  )
  if (found.length !== 1) throw new Error(`expected one kitchen item ${dish}, found ${found.length}`)
  return found[0]
}

/** The visible label texts inside an element (each label is a [data-label] element). */
export function labelsIn(el: HTMLElement): string[] {
  return [...el.querySelectorAll<HTMLElement>('[data-label]')].map((l) => l.textContent ?? '')
}

export function text(el: HTMLElement): string {
  return el.textContent ?? ''
}

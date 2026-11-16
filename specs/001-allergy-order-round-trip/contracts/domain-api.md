# Contract: Domain and Store API

These are the TypeScript signatures that the views and tests depend on. The bodies are written
during implementation. The types are defined in data-model.md. Every function in `domain/` is
pure: it has no DOM, no storage and no `Date.now()`, and gets time as a parameter.

## `domain/allergyOrder.ts`

```ts
export function isAllergyOrder(allergies: readonly Allergy[]): boolean;          // REQ-03, REQ-18
```

## `domain/labels.ts`

```ts
export const LABEL: {
  notConfirmed: "Not confirmed";                 // REQ-05
  cannotConfirm: "Cannot confirm";               // REQ-16, REQ-11
  confirmed: "Confirmed";                        // REQ-13
  okToServe: "OK to serve";                      // REQ-15
  allergyNotAcknowledged: "ALLERGY – NOT ACKNOWLEDGED"; // REQ-08
};
export function containsLabel(allergen: AllergenId): `Contains ${string}`;        // REQ-04
export function crossContactLabel(eq: Equipment): `Cross-contact: ${string}`;     // REQ-07

/** Labels for one dish (menu row) or one order item, for one seat, on the tablet. */
export function dishLabels(
  dish: DishRecord,
  seatAllergies: readonly Allergy[],
  item?: OrderItem,                                  // omitted for menu rows
): string[];                                         // REQ-04, REQ-05, REQ-12, REQ-13, REQ-15, REQ-16

/** Text lines for one allergy item on the kitchen display. */
export function kitchenItemText(item: OrderItem, dish: DishRecord): string[];      // REQ-06, REQ-07
```

## `domain/kitchen.ts`

```ts
export type KitchenAction = "acknowledge" | "confirm" | "cannotConfirm" | "signOff";

export function offeredActions(
  item: OrderItem, ticket: Ticket, dish: DishRecord, role: Role,
): KitchenAction[];                                  // REQ-09, REQ-10, REQ-11, REQ-14

export function sortTickets(tickets: readonly Ticket[], items: AppState["orderItems"]): Ticket[]; // REQ-08

export function isEscalated(ticket: Ticket, items: AppState["orderItems"], nowMs: number,
  escalationMs?: number): boolean;                   // REQ-21 (SHOULD), default 60_000 (A-4)
```

## `domain/actions.ts` (pure reducers: `(state, action, now) => state`)

| Action | Payload | REQ | Guard failure |
|---|---|---|---|
| `recordAllergy` | `{tableId, seatNumber, allergens, severity, traces, note?}` | REQ-01, REQ-02 | Empty allergens / missing severity / missing traces → unchanged |
| `addItem` | `{tableId, seatNumber, dishId}` | REQ-02, REQ-03 | Unknown dish → unchanged |
| `removeDraftItem` | `{itemId}` | – | Item already sent → unchanged |
| `sendOrder` | `{tableId}` | REQ-03, REQ-06, A-7, A-8 | No draft items → unchanged |
| `acknowledge` | `{ticketId, role}` | REQ-09 | Role ≠ station lead, or ticket already acknowledged → unchanged |
| `confirm` | `{itemId, role}` | REQ-10 | Role ≠ station lead, status ≠ Acknowledged, or dish info not complete → unchanged |
| `cannotConfirm` | `{itemId, role, reason}` | REQ-11 | Role ≠ station lead, status ≠ Acknowledged, or blank reason → unchanged |
| `signOff` | `{itemId, role}` | REQ-14 | Role ≠ expediter, status ≠ Confirmed, or already signed off → unchanged |
| `reset` | – | A-10 | – |

"Unchanged" means the reducer returns the same object reference, so the store skips the write
and the broadcast.

## `store/store.ts`

```ts
export interface StorageLike { getItem(k: string): string | null; setItem(k: string, v: string): void; }
export interface ChannelLike { postMessage(m: unknown): void; onmessage: ((e: { data: unknown }) => void) | null; close(): void; }

export function createStore(deps: {
  storage: StorageLike;
  channel: ChannelLike | null;      // null when BroadcastChannel is unavailable
  now: () => Date;
  onExternalChange?: (subscribe: (cb: () => void) => () => void) => void; // storage/visibility hooks
}): {
  getSnapshot(): AppState;
  subscribe(cb: () => void): () => void;
  dispatch(action: Action): void;
};
```

`store/useAppState.ts` wraps the store with `useSyncExternalStore`. `src/test/fakes.ts` provides
`memoryStorage()`, `fakeChannelPair()` (a fake channel shared by several stores) and
`fixedClock(ms)`.

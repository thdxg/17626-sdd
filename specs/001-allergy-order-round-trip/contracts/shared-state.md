# Contract: Shared State Between Tabs (A-10, REQ-12)

This contract covers the only interface between the server tablet tab and the kitchen display
tab. There is no network interface (Constitution IV). Design rationale: research.md R-1, R-3,
R-4, R-14.

## localStorage document

- **Key**: `allergy-round-trip/state`
- **Value**: JSON of `AppState` (data-model.md), `schemaVersion: 1`.
- **Writer rule**: every write is `read latest → apply pure reducer → revision + 1 → write →
  broadcast`, done synchronously in one tab.
- **Reader rule**: a tab re-reads the key when it gets a broadcast notice, a `storage` event for
  this key, or a `visibilitychange` to visible. It also re-reads before every write.
- **Invalid document** (missing, parse error, `schemaVersion ≠ 1`): replace it with the seed
  (`data/seed.ts`), `revision: 0`.

## BroadcastChannel notice

- **Channel name**: `allergy-round-trip`
- **Message**: `{ "type": "state-changed", "revision": number }`. The message never carries
  state.
- **Receiver rule**: ignore it if `revision ≤` the tab's current revision; otherwise re-read
  storage and notify subscribers.
- **If BroadcastChannel is missing**: skip posting; the `storage` event still updates other
  tabs.

## Per-tab (not shared)

- **Key** `allergy-round-trip/role` in `sessionStorage`: `"server" | "station lead" |
  "expediter"`.

## Reset demo data

`reset()` writes the seed with `revision = current + 1` and broadcasts. Every open tab shows the
seed after its next re-read. It is offered on the role menu and in both screen headers.

## Guarantees tested

| Guarantee | REQ / A | Test |
|---|---|---|
| A change in tab A shows in tab B after one notice | REQ-12, A-10 | `store.sync.test.ts` (two stores, shared fake storage + fake channel) |
| A notice with an old revision does not roll back the view | REQ-13, REQ-15 | `store.sync.test.ts` |
| A corrupt or old-version document reseeds | A-10 | `store.persist.test.ts` |
| Reset reaches every tab | A-10 | `store.sync.test.ts` |
| Within 5 s in real browsers | REQ-12, SC-004 | Manual, quickstart.md §3 |

# frontend — Allergy Order Round Trip

Vite + React + TypeScript, static build with mock data. No backend, no login and no external
calls (Constitution IV). Spec, plan and design: [`specs/001-allergy-order-round-trip/`](../specs/001-allergy-order-round-trip/).

## Run

```bash
npm install
npm run dev     # open the printed URL
npm run build   # tsc -b && vite build → dist/
```

Routes: `/` role menu · `/server` server tablet · `/kitchen` kitchen display (station lead or
expediter). The role is kept per tab in `sessionStorage`.

## Test

```bash
npm test        # vitest run: every acceptance test
npm run lint    # oxlint
```

Test names start with the REQ IDs they cover (REQ-01…REQ-22), so you can run one requirement:

```bash
npx vitest run -t "REQ-10"
```

The scenario → test map is in [`quickstart.md` §2](../specs/001-allergy-order-round-trip/quickstart.md).

## Two-tab demo (A-10)

The tablet and the kitchen display are two tabs of the same browser. They share one document in
`localStorage` (`allergy-round-trip/state`), and a `BroadcastChannel` (`allergy-round-trip`) tells
the other tab to re-read it.

1. Tab A → `/` → "Reset demo data" → "Server".
2. Tab B → `/` → "Station lead".
3. Follow [`quickstart.md` §3](../specs/001-allergy-order-round-trip/quickstart.md): record tree
   nuts / severe allergy / traces yes on Table 12 seat 3 (4 taps), add dishes, "Send order",
   acknowledge, confirm or cannot-confirm in tab B, switch tab B to "Expediter" and sign off, and
   watch tab A show "Confirmed" and then "OK to serve".

"Reset demo data" (role menu or any screen header) restores the seed in every open tab.

## Deploy (Vercel)

Root directory `frontend`, framework preset Vite, build `npm run build`, output `dist`.
`vercel.json` rewrites every path to `index.html`, so `/server` and `/kitchen` load on a direct
visit or reload.

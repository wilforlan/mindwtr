# mindwtr

Local Electron note app for journaling and thinking.

## Stack

- Electron + React + TypeScript + Vite
- Tailwind CSS + shadcn-style UI
- SQLite (`better-sqlite3`)
- TipTap editor
- React Flow graph

## Develop

```bash
npm install
npm test
npm run dev
```

## Scripts

- `npm run dev` — Electron app
- `npm test` — Vitest behavior tests
- `npm run typecheck` — TypeScript
- `npm run build` — production build
- `npm run dist:dmg` — build a macOS `.dmg` installer into `release/`

## macOS installer

```bash
npm run dist:dmg
```

The signed-unsigned DMG lands in `release/` (for example `mindwtr-0.1.0-arm64.dmg`). Open it and drag **mindwtr** into Applications.

App icon assets live in `build/icon.icns` and `build/icon.png`.

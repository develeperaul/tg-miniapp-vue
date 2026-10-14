# Migration to Quasar CLI + Vite

This branch upgrades the existing FinClub Vue/Vite Telegram Mini App to Quasar CLI with Vite without changing the business screens.

## Structure

- `quasar.config.ts` — Quasar CLI, Vite, PWA, history router and VITE_* environment compatibility.
- `src/boot/telegram.ts` — existing Telegram Mini App initialization.
- `src/stores/index.ts` — Pinia initialization for existing stores.
- `src/router/index.ts` — existing protected routes and PIN checks, wrapped in `defineRouter`.
- `src/css/app.scss` — includes existing Tailwind and Inter styles without rewriting them.
- `src/css/quasar.variables.sass` — matches current color palette.
- `src-pwa/sw/custom-sw.js` — existing Firebase push/notifications + Workbox precache.
- `src-pwa/register-sw.js` — registers the generated `firebase-messaging-sw.js`.

## Commands

Requires Node.js 22.22+ or Node.js 24+.

```sh
npm install
npm run dev          # Quasar PWA
npm run dev:spa      # Quasar SPA without service worker
npm run build        # Quasar PWA -> dist/pwa
npm run build:spa    # Quasar SPA -> dist/spa
```

The previous `src/main.ts` and `vite.config.ts` remain as reference files but Quasar CLI uses `quasar.config.ts` and its own generated entry point.

## Important deployment notes

Keep the `VITE_*` variables at deploy/build time (e.g. Firebase and API endpoints). The legacy `public/manifest.json` is retained as a reference; Quasar PWA generates its own `finclub.webmanifest`. Quasar PWA generates `/firebase-messaging-sw.js`; deploy it alongside the app and do not register a second SW for the same scope. History-mode routing needs server fallback to `index.html`. Validate Firebase push and Telegram login on real devices before merging.

Automated GitHub Actions checks build the PWA on a clean Node.js 24 runner. The first workflow run also refreshes `package-lock.json` to match the new Quasar dependencies.

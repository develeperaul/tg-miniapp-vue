# FinClub Online — Quasar CLI + Vite

App ID (Capacitor): \`ru.finclubonline\`. App display name: \`FinClub Online\`.

Initialized from the official Quasar CLI generator in a fresh branch based on \`main\`.
Existing views, components, layout, Pinia stores, router guards, Firebase modules, API clients, Inter fonts and Tailwind styles have been retained.

Commands: \`npm install\`, \`npm run dev\`, \`npm run build\` (SPA).

**PWA mode is intentionally not enabled; \`src-pwa\` is not created.**
The old custom Firebase/Workbox worker source remains in the repository as legacy code; Firebase background notifications require separate service-worker integration and device testing before they can be considered operational.

The generated Capacitor scaffolding stores its native \`appId\` in \`src-capacitor/capacitor.config.*\`. No Android or iOS binary is built here.

---
name: add-native-feature
description: Use when integrating a device capability in this project — "add native X", "use the camera", "secure storage", "biometric auth", "push notification", "badge", "document scanner". Enforces a typed plugin wrapper with platform guards, a web fallback, and explicit permission handling.
---

# Add a native feature

Wrap a Capacitor plugin behind a typed service or hook so platform branching and
permissions live in one place. See [docs/NATIVE.md](../../../docs/NATIVE.md). Read
an existing wrapper first — `src/services/badge.service.ts` — and copy the
pattern. Note: native wrappers in this app follow `badge.service.ts`'s
`static getInstance()` singleton pattern, which is distinct from the
constructor-injected API services under `src/api/services/`.

## Checklist

1. Install the plugin (`npm install <plugin>`), then `npx cap sync`.
2. Create `src/services/<name>.service.ts` (or a hook) exposing typed methods.
3. Guard every native call with `Capacitor.isNativePlatform()` and provide a
   **web fallback** (the app runs on web too).
4. Handle **permissions** explicitly: check, request when needed, degrade
   gracefully on denial.
5. Keep user-facing text in **Dutch**.
6. Add a unit test that mocks the plugin and verifies the web-fallback branch;
   run `npm run test.unit`.

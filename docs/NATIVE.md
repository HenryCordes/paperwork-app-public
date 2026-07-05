# Native Functionality (Capacitor)

> Read this when using a device capability: camera, document scanner, OCR,
> secure storage, biometric auth, push notifications, badges, filesystem.

## Rules

- Access native features through **Capacitor plugins** only.
- Guard native calls with `Capacitor.isNativePlatform()` and implement a **web
  fallback** for every native feature (the app also runs on the web).
- Handle **permissions** explicitly (camera, storage, notifications, badge):
  check first, request when needed, degrade gracefully on denial.
- Wrap each plugin behind a typed **service** (`src/services/<name>.service.ts`)
  or hook, so platform branching and permission handling live in one place.
  Example: `src/services/badge.service.ts`. New wrappers in `src/services/`
  follow `badge.service.ts`'s `static getInstance()` singleton pattern, which is
  distinct from the constructor-injected, exported-singleton pattern used by
  `src/api/services/`. Some features use a subdirectory under
  `src/hooks/<feature>/` (e.g. biometrics at `src/hooks/biometrics/`) — follow
  the pattern already established for the feature you're touching.
- Handle platform-specific code and styling appropriately; test on real devices
  regularly (`npm run run:ios` / `npm run run:android`).
- Use the camera / document-scanner / OCR plugins for receipt capture.

## Localization

The app is for a **Dutch** audience primarily — user-facing text is in Dutch,
including error messages.

The `add-native-feature` skill scaffolds a new plugin wrapper.

---
name: add-page
description: Use when adding a new screen in this project — "add a page", "new screen", "new route", "create the X view". Enforces the feature-folder page structure, route registration, and the Dutch-first, Ionic styling conventions.
---

# Add a page

Scaffold a new screen under `src/pages/<Feature>/` and register its route. See
[docs/ARCHITECTURE.md](../../../docs/ARCHITECTURE.md) and
[docs/FRONTEND.md](../../../docs/FRONTEND.md). Read an existing feature folder
(its `List` / `Details` / `Edit` components) and `src/routes/privateRoutes.tsx`
first, then copy the pattern.

## Checklist

1. Create the page component(s) under `src/pages/<Feature>/` following the
   feature's existing `List` / `Details` / `Edit` split where it applies.
2. Keep business logic in a hook (see `add-api-hook`); the page renders state and
   handles loading/error UI (`IonToast` for errors, in Dutch).
3. Register the route in `src/routes/privateRoutes.tsx` (or
   `src/routes/publicRoutes.tsx` if unauthenticated), importing the page component
   statically at the top of the file like the existing routes (no `React.lazy`).
4. Navigate with `useHistory` by default; use `useIonRouter` only if the area you're working in already does (e.g. session management, detail pages) — check the existing file first.
5. Co-locate styles (`.css` or Emotion) with the component; class names describe
   purpose, not appearance.
6. Add a component test under `src/__tests__/` and run `npm run test.unit`.

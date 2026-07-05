# Architecture

> Read this when working on app structure, routing, folder layout, or where a new
> file should live.

## Overview

Ionic React mobile application using Capacitor for native functionality. The app
follows a **feature-based** folder structure: code is organized by domain
(Emails, Expenses, Invoices, Contacts, Taxes, Dashboard, Notifications, ...),
not by technical layer.

## Layers

- **Pages** (`src/pages/<Feature>/`) — full screens, organized by feature. Each
  feature typically has `List`, `Details`, and `Edit` components.
- **Components** (`src/components/`) — reusable UI elements shared across pages.
- **Hooks** (`src/hooks/`) — business logic and data operations, kept out of UI
  components. Naming: `use<Entity>.ts` (e.g. `useExpenses.ts`).
- **API services** (`src/api/services/`) — all external API communication, one
  file per domain entity (`<entity>Service.ts`). Each service is a class with
  constructor-injected `axiosInstance` that exports a pre-built singleton
  (see `expensesService.ts`). Shared axios client in `src/api/axiosInstance.ts`.
  Query keys in `src/api/queryKeys.ts`.
- **API types** — domain entity types in `src/api/types/<entity>.ts` (one file
  per entity); shared/cross-cutting types (e.g. `ApiError`, auth/user types) in
  `src/api/types.ts`.
- **Utils** (`src/utils/`) — pure helpers.

## Routing

- React Router 5.x. Public routes in `src/routes/publicRoutes.tsx`, private
  routes in `src/routes/privateRoutes.tsx`, wired in `src/App.tsx`.
- `useHistory` is the preferred default for navigation; `useIonRouter` appears
  in a few session-management and detail-page contexts. Follow the prevailing
  pattern of the area you're editing.

## Conventions

- Define entity-specific data models in `src/api/types/<entity>.ts`; shared types (e.g. `ApiError`) in `src/api/types.ts`.
- Naming: `camelCase` for functions/variables, `PascalCase` for components/types,
  `kebab-case` for file and directory names (note: existing hook/service files
  use `camelCase.ts` — follow the local pattern of the directory you are in).
- Keep API communication isolated in services with clear separation of concerns.
- Tests live in `src/__tests__/`, mirroring the source structure.

# State Management & Data Layer

> Read this when fetching/mutating server data, adding an API service or hook, or
> deciding where a piece of state belongs.

## Principles

- **Server state** → React Query (TanStack Query v5): data fetching, caching,
  background updates.
- **Local UI state** → React `useState` / `useReducer`. Keep state as close as
  possible to where it is used.
- **Shared stateful logic** → custom hooks.
- Always handle loading, error, and success states for every data operation.

## The service + hook pattern (required)

API calls live in a **service**; React Query queries/mutations live in a
**hook**. Never call axios directly from a component.

1. **Service** — `src/api/services/<entity>Service.ts`. A class that receives the
   shared `axiosInstance` (`src/api/axiosInstance.ts`) via constructor injection
   and exports a pre-built singleton as the default, mirroring `expensesService`.
   Methods wrap axios calls in try/catch and throw an `Error` with a Dutch,
   user-safe message. One file per domain entity.
2. **Types** — domain entity types in `src/api/types/<entity>.ts`; shared/cross-cutting types (e.g. `ApiError`) in `src/api/types.ts`.
3. **Query keys** — add an entry to `src/api/queryKeys.ts` following the existing
   shape: a `base` tuple plus `list(offset)` and `detail(id)` factories. Add
   entity-specific factories (e.g. `summary(...)`/`periods()`) only when needed.
   Reuse existing keys; invalidate via the relevant factory rather than inventing
   a parallel scheme.
4. **Hook** — `src/hooks/use<Entity>.ts`. `useQuery` for reads, `useMutation`
   for writes. On mutation success, invalidate the relevant query keys.

## Caching & invalidation

- Use deliberate cache-invalidation strategies; invalidate the narrowest key
  that covers the changed data.
- Reuse existing query-key factories before inventing new ones — read
  `src/api/queryKeys.ts` first.

Read an existing implementation end to end before adding a new one, e.g.
`src/api/services/expensesService.ts` + `src/hooks/useExpenses.ts`.

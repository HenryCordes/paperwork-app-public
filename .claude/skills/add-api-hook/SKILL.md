---
name: add-api-hook
description: Use when adding data fetching or mutation in this project — "add a hook", "fetch X", "new query", "new mutation", "call the API for Y". Enforces the service + hook pattern, the query-key factory, error/loading states, and cache invalidation so a new data path matches the rest of the app.
---

# Add an API hook

Add server-state access through the **service + hook** pattern. Never call axios
from a component. See [docs/STATE_MANAGEMENT.md](../../../docs/STATE_MANAGEMENT.md).
Read an existing pair first — `src/api/services/expensesService.ts` and
`src/hooks/useExpenses.ts` — and copy the pattern.

## Checklist

1. **Types** — add request/response interfaces to `src/api/types/<entity>.ts`
   (no `any`). Entity types live in `src/api/types/`; shared cross-cutting types
   like `ApiError` live in the flat `src/api/types.ts`.
2. **Service** — create `src/api/services/<entity>Service.ts` as a class that
   receives the shared `axiosInstance` via constructor injection and exports a
   pre-built singleton as the default, mirroring `expensesService`. Methods wrap
   axios calls in try/catch and throw an `Error` with a Dutch, user-safe message.
   One file per domain entity.
3. **Query keys** — add an entry to `src/api/queryKeys.ts` following the existing
   shape — a `base` tuple plus `list(offset)` and `detail(id)` factories (add
   entity-specific factories such as `summary(...)`/`periods()` only when needed).
   Reuse existing keys; invalidate via the relevant factory rather than inventing
   a parallel scheme.
4. **Hook** — add `src/hooks/use<Entity>.ts`: `useQuery` for reads, `useMutation`
   for writes. Handle loading and error states. On mutation success, invalidate
   the narrowest relevant query key.
5. **Test** — add a unit test under `src/__tests__/` mirroring the source path;
   mock the service. Run `npm run test.unit`.

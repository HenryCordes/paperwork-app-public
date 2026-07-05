# Design: Unit-test expansion for paperwork-app

Date: 2026-06-09
Status: Approved (design), pending implementation plan
Branch: `chore/unit-test-expansion`

## Problem

The app has Vitest, Testing Library, jsdom, and `src/setupTests.ts` already
configured, but the only tests are the 18 receipt-parsing suites under
`src/__tests__/hooks/receipt-parsing/`. Everything else — 42 hooks, 11
components, 6 utils, 3 services — is untested. There is no coverage measurement,
no CI, and no git hooks, so regressions can land silently.

We want meaningful unit coverage across pure logic, data hooks, and components,
built on the existing Vitest setup, plus the enforcement layer (coverage target,
husky hooks, CI) the sibling backend repo `paperwork` adopted
(`specs/2026-06-08-*`, `specs/2026-06-09-coverage-thresholds/`).

This is Cycle 2; Cycle 1 (`specs/2026-06-09-claude-code-agentic-setup/`)
establishes AGENTS.md/docs/skills and is assumed merged first.

## Goals

- A shared test harness (`renderWithProviders`, `renderHookWithClient`) so tests
  are consistent and components/hooks can be refactored with confidence.
- Behavioral coverage (not "renders") of pure logic, the domain data hooks, and
  the shared components.
- Coverage measured honestly against the whole `src` tree, reported on every run,
  with a documented target that gates only once reached.
- Enforcement: husky `pre-commit` (lint + typecheck) and `pre-push`
  (`test.unit`), plus GitHub Actions CI.
- Reusable, committed test-generation Workflows for the bulk fan-out.

## Non-goals (out of scope)

- Page-level integration tests (`src/pages/`, 31 files) — a later cycle.
- Cypress / E2E expansion.
- Snapshot tests.
- Prettier adoption (the app uses eslint only today; do not introduce it here).

## Approach to producing tests (hybrid)

Phase 0 and the **first exemplar** in each of Phases 1, 2, and 3 are written by
hand to lock the patterns. The remaining files are produced by adapted
test-generation Workflows ported from the reference repo
(`paperwork/.claude/workflows/client-component-tests.js`): one agent writes each
test, a `code-reviewer` agent adversarially verifies it is test-only,
non-vacuous, and green. Workflow opt-in happens at execution time.

## Test conventions (locked by Phase 0)

- Location: `src/__tests__/` mirroring the source path (existing convention).
- Naming: `<source>.test.ts` / `<source>.test.tsx`.
- Behavior over implementation; assert observable output (rendered text, control
  state, mock call args), never a bare "is in the document" on a wrapper.
- Table-driven where it reads cleanly (formatter/branch cases). No snapshots.
- No `any` (a small `as <RealType>` on a mock return is acceptable).
- Hooks: mock the **service module** (the data layer), render the real hook with a
  fresh `QueryClient { retry: false }`. Components: **Approach A** — mock the
  hooks the component imports, render the real component via
  `renderWithProviders`.
- Tests never modify production files. If a test reveals a bug, characterize it
  with an inline `// FIXME(<topic>)` and report it; do not edit source to make a
  test pass.

## Phase 0 — Test infrastructure

**Dependencies:** add `@vitest/coverage-v8` (matches the installed Vitest).

**`package.json` scripts:** add
`"test.unit.coverage": "vitest --run --coverage"`.

**`vite.config.ts`** — extend the `test` block:

```ts
test: {
  globals: true,
  environment: "jsdom",
  setupFiles: "./src/setupTests.ts",
  coverage: {
    provider: "v8",
    reporter: ["text", "html", "lcov"],
    include: ["src/**/*.{ts,tsx}"],
    exclude: [
      "src/**/*.d.ts",
      "src/main.tsx",
      "src/setupTests.ts",
      "src/vite-env.d.ts",
      "src/theme/**",
      "src/**/*.test.{ts,tsx}",
      "src/__tests__/**",
    ],
    // thresholds added commented-out in Phase 4 (report-only until reached)
  },
}
```

**`src/setupTests.ts`** — boy-scout fixes required before components render:
- Replace the legacy `import '@testing-library/jest-dom/extend-expect';` with the
  Vitest-compatible `import '@testing-library/jest-dom/vitest';`.
- Call `setupIonicReact()` from `@ionic/react` so Ionic components mount in jsdom.
- Keep the existing `matchMedia` mock.

**`src/__tests__/test-utils.tsx`** — the shared harness:
- `renderWithProviders(ui, options?)` — wraps in a fresh
  `QueryClientProvider` (`new QueryClient({ defaultOptions: { queries: { retry: false } } })`),
  `MemoryRouter` (configurable `initialEntries`), and the app contexts from
  `src/contexts/`. Returns RTL's render result.
- `renderHookWithClient(hook, options?)` — `renderHook` with the same
  `QueryClientProvider` wrapper, for Phase 2.
- Re-export everything from `@testing-library/react` plus a default
  `userEvent` import convenience.

## Phase 1 — Pure logic (no rendering)

Targets, each behavior/branch exercised, table-driven where it fits:

- **`src/utils/` (6 files)** — formatters and helpers. The Dutch currency
  formatter (comma decimal, period thousands) is the highest-value target;
  cover falsy inputs, numbers, and strings.
- **`src/services/notification-navigation.service.ts`** — pure routing switch;
  assert each notification `type`/`action` maps to the right `history.push`
  path (mock `history`).
- **`src/services/badge.service.ts`** — mock `@capacitor/core`
  `Capacitor.isNativePlatform()` and the `Badge` plugin; assert native vs
  web-fallback branches (set/clear/increment/decrement/permissions).
- **`src/services/firebase-messaging.service.ts`** — cover the pure/parsing parts
  reachable without a live Firebase; mock the plugin. Partial coverage is
  acceptable; note what cannot be unit-tested and why.

Receipt parsing is already covered — not repeated here.

## Phase 2 — Data hooks

Mock the service module; render with `renderHookWithClient`. For each hook
assert: the query maps service data into the hook result; a mutation calls the
service with the right arguments; `onSuccess` invalidates the correct query key
(spy on the `QueryClient`). Cover `enabled`/guard branches (e.g.
`useExpenseById` rejecting `"create"`).

Priority order (domain data hooks first; the 42-hook tail follows via Workflow):
`useExpenses`, `useInvoices`, `useContacts`, `useTaxes`, `useDashboard`,
`useEmails`, `useDocuments`, `useNotificationCenter`, `useProfile`, `useAuth`.

## Phase 3 — Components

The 11 `src/components/`, via Approach A. Meaningful coverage: renders the key
controls/labels; the primary interaction calls the mocked hook/mutation with the
right args; loading, empty, and error branches. Mock heavy children that pull
their own data. Pages (`src/pages/`) are deferred.

## Phase 4 — Coverage target (report-only, gate when reached)

- Coverage runs reporting-only so the trend is visible without blocking PRs.
- Documented target (v8 provider): **lines 60, statements 60, functions 60,
  branches 50**. Branches is deliberately lower — v8 instruments bytecode, so
  JSX, optional chaining, and template literals create phantom branches that are
  runtime artifacts, not application logic; statements/functions/lines are the
  primary signal.
- Add the target `thresholds` block to `vite.config.ts` **commented-out**, with a
  one-line note pointing at this design. Flipping the gate on later is a single
  uncomment.
- **Flip-on rule:** when the suite measures >= target on every metric, uncomment
  the `thresholds` block and ensure CI runs with coverage; from then on CI fails
  any PR that drops a metric below target.

## Phase 5 — Enforcement (husky + CI)

**Dependencies:** add `husky` and `lint-staged`.

**`package.json`:** add `"prepare": "husky"`, `"typecheck": "tsc --noEmit"`, and a
`lint-staged` config:

```json
"lint-staged": {
  "*.{ts,tsx}": "eslint --fix"
}
```

**`.husky/pre-commit`:**

```sh
npx lint-staged
npx tsc --noEmit
```

**`.husky/pre-push`:**

```sh
npm run test.unit
```

(Single app — no per-area split, unlike the backend monorepo. `pre-push` runs the
unit suite; coverage stays a CI concern to keep local pushes fast.)

**`.github/workflows/ci.yml`:** on push and pull_request — `npm ci`,
`npm run lint`, `npm run build` (typecheck via `tsc`), `npm run test.unit.coverage`;
write the coverage table to the job summary. Coverage is report-only here until
the Phase 4 flip-on.

**`.claude/settings.json`** (from Cycle 1) — add `Bash(npm run typecheck:*)` to the
allowlist. The existing `Bash(npm run test.unit:*)` entry already covers
`test.unit.coverage`.

## Test-generation Workflows (committed)

Adapt the reference repo's scripts into this repo under `.claude/workflows/`:

- **`hook-tests.js`** — per-hook: one agent mocks the service and writes the
  `renderHookWithClient` test; a `code-reviewer` agent verifies test-only,
  non-vacuous (asserts data mapping / mutation args / invalidation), green.
- **`component-tests.js`** — per-component: Approach A implementer + adversarial
  reviewer (test-only diff, meaningful assertions, green), mirroring
  `client-component-tests.js`.

Each takes `args.modules: [{ name, source, testPath, mode, notes }]` and runs an
implement -> verify pipeline. They reference `src/__tests__/test-utils.tsx` and
the hand-written exemplars.

## Verification

1. `npm run test.unit` green (existing + new suites).
2. `npm run test.unit.coverage` produces a report against the full `src` tree;
   numbers recorded against this design.
3. Each new test fails if the behavior it covers regresses (spot-check by
   reverting a line).
4. `git commit` triggers `pre-commit` (lint-staged + typecheck); a failing lint
   or type error blocks the commit. `git push` triggers `pre-push` (test.unit).
5. CI runs lint + build + coverage on a PR and reports green.

## Follow-ups (later cycles)

1. Page-level tests (`src/pages/`, 31 files).
2. Flip the coverage gate on once the target is reached.
3. Cypress/E2E expansion for critical user journeys.

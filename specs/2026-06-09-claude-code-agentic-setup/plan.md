# Claude Code Agentic Setup — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Windsurf-only `.windsurf/rules/` setup with a tool-agnostic, progressive-disclosure AI workflow: a lean `AGENTS.md` source of truth, a thin `CLAUDE.md` redirect, six on-demand `docs/` references, four `.claude/skills/`, one `.claude/agents/` subagent, a `settings.json` allowlist, and a `specs/` convention.

**Architecture:** Documentation + configuration only — no app runtime code changes. The 13 `.windsurf/rules/` files collapse into the `AGENTS.md` always-loaded core (app context, tech stack, four cross-cutting principles) plus six topical `docs/` files loaded on demand via an index table. Recurring tasks become skills; the highest-regression-risk domain (receipt parsing) gets a focused review subagent. `.windsurf/` is deleted last, after coverage is verified.

**Tech Stack:** Markdown docs, JSON config. Repo: React 19 + TypeScript + Ionic 8 + Capacitor 7 + TanStack Query 5 + Vite. Tests: Vitest (`npm run test.unit`). Package manager: npm.

**Reference:** The sibling backend repo `../paperwork` implemented the same pattern at `specs/2026-06-07-claude-code-agentic-setup/`. Mirror its file shapes (`AGENTS.md`, `CLAUDE.md`, `.claude/skills/*/SKILL.md`, `.claude/agents/*.md`).

**Commit policy:** Commits happen at five milestones (after docs, after AGENTS/CLAUDE, after skills+subagent, after settings, after cleanup). Never commit to `main`. Conventional Commits, imperative subject, why-not-what body. Do not push.

---

## Task 1: Create the working branch

**Files:** none (git only)

- [ ] **Step 1: Confirm clean tree on main**

Run: `git status`
Expected: `On branch main`, working tree clean.

- [ ] **Step 2: Create and switch to the feature branch**

Run: `git checkout -b chore/claude-code-agentic-setup`
Expected: `Switched to a new branch 'chore/claude-code-agentic-setup'`

- [ ] **Step 3: Create the directories**

Run: `mkdir -p docs .claude/skills .claude/agents specs`
Expected: no output. (`.claude/skills` parent creates `.claude`.)

---

## Task 2: docs/ARCHITECTURE.md

Folds `.windsurf/rules/01-architecture.md` + `03-code-organization.md`.

**Files:**
- Create: `docs/ARCHITECTURE.md`

- [ ] **Step 1: Write the file**

```markdown
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
  file per domain entity (`<entity>Service.ts`). Shared axios client in
  `src/api/axiosInstance.ts`. Query keys in `src/api/queryKeys.ts`.
- **API types** (`src/api/types/`) — TypeScript interfaces for data models, one
  file per domain entity.
- **Utils** (`src/utils/`) — pure helpers.

## Routing

- React Router 5.x. Public routes in `src/routes/publicRoutes.tsx`, private
  routes in `src/routes/privateRoutes.tsx`, wired in `src/App.tsx`.
- Navigate with React Router's `useHistory` hook — **not** `useIonRouter` — for
  consistency across the app.

## Conventions

- Define data models as TypeScript interfaces in `src/api/types/`.
- Naming: `camelCase` for functions/variables, `PascalCase` for components/types,
  `kebab-case` for file and directory names (note: existing hook/service files
  use `camelCase.ts` — follow the local pattern of the directory you are in).
- Keep API communication isolated in services with clear separation of concerns.
- Tests live in `src/__tests__/`, mirroring the source structure.

The current full file tree is in `repomix-output.xml` at the repo root.
```

(No commit yet — commit after Task 7.)

---

## Task 3: docs/STATE_MANAGEMENT.md

Folds `.windsurf/rules/06-state-management.md` + the `src/api/` axios layer and query-key conventions.

**Files:**
- Create: `docs/STATE_MANAGEMENT.md`

- [ ] **Step 1: Write the file**

```markdown
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

1. **Service** — `src/api/services/<entity>Service.ts`. Async methods using the
   shared `axiosInstance` (`src/api/axiosInstance.ts`). One file per domain
   entity. Example methods: `getExpenses()`, `getExpense(id)`,
   `createExpense(body)`, `updateExpense(id, body)`, `deleteExpense(id)`.
2. **Types** — `src/api/types/<entity>.ts`. Interfaces for request/response.
3. **Query keys** — add to `src/api/queryKeys.ts`. Use the hierarchical factory
   pattern so lists/details/filters can be invalidated precisely:
   `all() -> lists() -> list(filter)` and `detail(id)`.
4. **Hook** — `src/hooks/use<Entity>.ts`. `useQuery` for reads, `useMutation`
   for writes. On mutation success, invalidate the relevant query keys.

## Caching & invalidation

- Use deliberate cache-invalidation strategies; invalidate the narrowest key
  that covers the changed data.
- Reuse existing query-key factories before inventing new ones — read
  `src/api/queryKeys.ts` first.

Read an existing implementation end to end before adding a new one, e.g.
`src/api/services/expensesService.ts` + `src/hooks/useExpenses.ts`.
```

(No commit yet.)

---

## Task 4: docs/FRONTEND.md

Folds `.windsurf/rules/05-component-design.md` + `11-styling.md` + `10-performance.md`.

**Files:**
- Create: `docs/FRONTEND.md`

- [ ] **Step 1: Write the file**

```markdown
# Frontend: Components, Styling & Performance

> Read this when building or changing UI components, styling, or optimizing
> render/list performance.

## Component design

- Functional components with hooks only (no class components).
- Small, focused components with a single responsibility.
- Strongly type props and state — no `any`.
- Keep business logic out of components; move it to custom hooks (see
  STATE_MANAGEMENT.md).
- Use Ionic components for UI where appropriate; plain HTML where it is
  sufficient (don't over-reach for Ionic when a `<div>` does the job).
- Wrap components in error boundaries; implement explicit loading and error
  states for every async operation.
- Ensure responsive design across device sizes and orientations.

## Styling

- Combination of traditional `.css` files and Emotion styled components.
- Mobile-first.
- Theme values via CSS variables in `variables.css`. Maintain consistent
  spacing, colors, and typography.
- Keep component-specific styles next to their component.
- Class names describe **purpose**, not appearance.

## Performance

- `React.memo` for genuinely expensive renders (measure first).
- `useCallback` / `useMemo` where they remove real work — not by reflex.
- Paginate large lists; virtualize long lists.
- Lean on React Query caching rather than refetching.
- Optimize images/assets for mobile; keep bundle size down by avoiding
  unnecessary dependencies.
```

(No commit yet.)

---

## Task 5: docs/RECEIPT_PARSING.md

Folds `.windsurf/rules/07-receipt-parsing.md`.

**Files:**
- Create: `docs/RECEIPT_PARSING.md`

- [ ] **Step 1: Write the file**

```markdown
# Receipt Parsing

> Read this when changing OCR/receipt parsing: the rule engine, detectors, or
> merchant-specific handling.

## Approach

- OCR output is processed with a **rule-based** approach. Parsing logic lives in
  the dedicated receipt-parsing area under `src/hooks/` (tests mirror it in
  `src/__tests__/hooks/receipt-parsing/`).
- Use **spatial analysis** to understand receipt structure (line positions,
  columns) rather than naive string scanning.
- Handle different receipt formats with dedicated **detection rules**.
- Parse dates, totals, and tax amounts with **specialized detectors**
  (date / total / tax line matchers).

## Testing (non-negotiable for this domain)

- Every parsing change ships with a fixture-based regression test using a
  **real-world** receipt example, placed in
  `src/__tests__/hooks/receipt-parsing/`.
- Existing tests follow a `*Receipt.test.ts` naming pattern (e.g.
  `mcdonaldsReceipt.test.ts`) plus detector-level tests
  (`dateDetection.test.ts`, `totalDetection.test.ts`, `taxDetection.test.ts`,
  `ruleEngine.test.ts`). Read one before adding a new one.
- Use constants for domain values; no magic strings in detection logic.

The `add-receipt-rule` skill scaffolds a rule + its regression test.
```

(No commit yet.)

---

## Task 6: docs/NATIVE.md

Folds `.windsurf/rules/08-native-functionality.md`.

**Files:**
- Create: `docs/NATIVE.md`

- [ ] **Step 1: Write the file**

```markdown
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
  Example: `src/services/badge.service.ts`.
- Handle platform-specific code and styling appropriately; test on real devices
  regularly (`npm run run:ios` / `npm run run:android`).
- Use the camera / document-scanner / OCR plugins for receipt capture.

## Localization

The app is for a **Dutch** audience primarily — user-facing text is in Dutch,
including error messages.

The `add-native-feature` skill scaffolds a new plugin wrapper.
```

(No commit yet.)

---

## Task 7: docs/TESTING.md + commit the docs

Folds `.windsurf/rules/12-testing.md`.

**Files:**
- Create: `docs/TESTING.md`

- [ ] **Step 1: Write the file**

```markdown
# Testing

> Read this when writing or changing tests.

## Tools

- **Vitest** (`npm run test.unit`, watch via `npm run test.unit.watch`) — unit
  tests for hooks and utility functions. jsdom environment; setup in
  `src/setupTests.ts`. Config in `vite.config.ts`.
- **Testing Library** (`@testing-library/react`) — component tests.
- **Cypress** (`npm run test.e2e`) — end-to-end tests for critical user flows.

## Practices

- Follow the **AAA** pattern (Arrange, Act, Assert).
- Test **behavior**, not implementation details.
- Mock API calls and other external dependencies.
- Cover edge cases and error scenarios.
- Tests live in `src/__tests__/`, mirroring the source structure.

## Receipt parsing

The receipt parser has the deepest coverage — fixture-based regression tests in
`src/__tests__/hooks/receipt-parsing/`. See RECEIPT_PARSING.md.
```

- [ ] **Step 2: Verify all six docs exist**

Run: `ls docs`
Expected: `ARCHITECTURE.md  FRONTEND.md  NATIVE.md  RECEIPT_PARSING.md  STATE_MANAGEMENT.md  TESTING.md`

- [ ] **Step 3: Commit the docs**

```bash
git add docs/
git commit -m "docs: add on-demand reference docs from windsurf rules

Fold the 13 always-on .windsurf rules into six topical docs loaded on
demand, so situational knowledge no longer bloats every conversation."
```

---

## Task 8: AGENTS.md

The always-loaded core. Folds `00-app-context`, `02-tech-stack`, `04-typescript`,
`09-error-handling`, and the cross-cutting conventions; indexes the six docs.

**Files:**
- Create: `AGENTS.md`

- [ ] **Step 1: Write the file**

```markdown
# AI Agent Rules

> Read by AI coding assistants (Claude Code, Cursor, Copilot, Windsurf). This is
> the single source of truth for how to work in this project. Tool-specific files
> (`CLAUDE.md`, etc.) redirect here rather than duplicate rules.

## App context

Paperwork-app is an Ionic React mobile app for expense and document management
and bookkeeping, aimed at owners of small businesses and independent contractors
in the **Netherlands**. User-facing language is **Dutch**.

Features: manage expenses; scan receipts and turn the result into an expense;
manage and generate invoices (PDF); manage contacts (people and businesses);
email invoices to clients; manage notes; a dashboard visualising profit/loss,
expenses and income; export of profit/loss, expenses and income for tax returns.

## Documentation Index

Load the right doc for the task instead of reading everything:

| Topic | File | When to read |
|-------|------|-------------|
| Architecture & structure | [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | App structure, routing, folder layout, where a file belongs |
| State & data layer | [docs/STATE_MANAGEMENT.md](docs/STATE_MANAGEMENT.md) | Fetching/mutating data, adding an API service or hook, query keys |
| Frontend | [docs/FRONTEND.md](docs/FRONTEND.md) | Building components, styling, render/list performance |
| Receipt parsing | [docs/RECEIPT_PARSING.md](docs/RECEIPT_PARSING.md) | OCR/receipt parsing: rule engine, detectors, merchant rules |
| Native functionality | [docs/NATIVE.md](docs/NATIVE.md) | Camera, scanner, OCR, secure storage, biometric, push, badge |
| Testing | [docs/TESTING.md](docs/TESTING.md) | Writing or changing tests |

## Tech Stack

- UI: Ionic React 8 (`@ionic/react`, `@ionic/react-router`), React 19, TypeScript
- Native: Capacitor 7 (iOS + Android)
- Routing: React Router 5 (navigate with `useHistory`, not `useIonRouter`)
- Data: TanStack Query 5 (React Query) + axios
- Styling: Emotion (CSS-in-JS) + traditional CSS; chart.js / react-chartjs-2
- Other: date-fns, dompurify, TinyMCE
- Build: Vite (+ legacy plugin)
- Tests: Vitest (unit), Testing Library (components), Cypress (E2E)
- Package manager: **npm**

## Principles (always apply)

- **TypeScript strictness.** Declare types for variables, parameters, and return
  values. Never use `any`; create the necessary types. Prefer composite types
  over loose primitives; `readonly` / `as const` for immutable data. One export
  per file. JSDoc on public functions. Keep functions short and single-purpose
  (<20 lines); prefer early returns over deep nesting.
- **Error handling.** Use React Error Boundaries for component-level failures and
  proper error states in React Query. Never throw from page components — capture
  in try/catch and surface user-facing, **Dutch**, actionable messages via
  `IonToast` or similar (follow the Login page pattern). Validate user input
  client-side; handle network errors with retry/fallback where appropriate.
- **Conventions.** Show money in **Dutch format** everywhere (two decimals, comma
  decimal separator, period thousands separator). Use constants, never magic
  numbers/strings, for domain values; keep shared constants in dedicated files.
  Reuse existing patterns before introducing new ones.
- **Security.** No secrets in client code. Store sensitive data with
  `capacitor-secure-storage-plugin`. Sanitize all HTML with dompurify before
  render. Request the minimum native permissions and degrade gracefully.

## Workflow (spec-driven)

1. Brainstorm -> 2. Spec -> 3. Implementation plan -> 4. Implement.

Each feature gets its own folder under [specs/](specs) holding its `design.md`
(the spec) and `plan.md` (the implementation plan), e.g.
`specs/2026-06-09-claude-code-agentic-setup/`.

For agentic execution use the Superpowers skills
(`superpowers:executing-plans`, `superpowers:subagent-driven-development`) to
implement plans task-by-task.

## Commit & PR rules

- Never commit to `main`. Branch first; use Conventional Commits with an
  imperative subject and a why-not-what body.
- Run `npm run test.unit` (and `npm run lint`) before staging.
- Before a PR, run the Superpowers `pre-pr-gate` skill (lint + typecheck +
  tests: `npm run lint`, `npm run build`, `npm run test.unit`) and `pr-prep` for
  the full checklist. Use `commit-with-message` for Conventional Commit messages.
- Never commit automatically — only on explicit user authorization.
```

(No commit yet — commit after Task 9.)

---

## Task 9: CLAUDE.md + commit

**Files:**
- Create: `CLAUDE.md`

- [ ] **Step 1: Write the file**

```markdown
# CLAUDE.md — Project Context for Claude Code

## Source of truth

All AI agent rules, conventions, and standards live in [AGENTS.md](AGENTS.md).
**Read it first** — it covers the app context, tech stack, the always-apply
principles (TypeScript strictness, error handling, conventions, security), the
documentation index, the spec-driven workflow, and commit/PR rules. This file
stays thin to avoid duplicating that source of truth.

## Skills & subagents

- **Skills** ([.claude/skills/](.claude/skills)): `add-api-hook`,
  `add-receipt-rule`, `add-page`, `add-native-feature` — recurring scaffolding
  tasks with the project's conventions baked in.
- **Subagents** ([.claude/agents/](.claude/agents)): `receipt-parsing-reviewer`
  — dispatch with the `Agent` tool to review a parser/rule-engine diff for
  regression risk.

## Workflow

Brainstorm -> spec -> implementation plan -> implement, on the
[Superpowers](https://github.com/obra/superpowers) workflow. Specs and plans
live in [specs/](specs).
```

- [ ] **Step 2: Commit AGENTS.md + CLAUDE.md**

```bash
git add AGENTS.md CLAUDE.md
git commit -m "docs: add AGENTS.md source of truth and CLAUDE.md redirect

Establish a tool-agnostic always-loaded core (app context, tech stack,
four cross-cutting principles) that indexes the on-demand docs."
```

---

## Task 10: Skill — add-api-hook

**Files:**
- Create: `.claude/skills/add-api-hook/SKILL.md`

- [ ] **Step 1: Write the file**

````markdown
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
   (no `any`).
2. **Service** — add async methods to `src/api/services/<entity>Service.ts` using
   the shared `axiosInstance` (`src/api/axiosInstance.ts`).
3. **Query keys** — add a hierarchical factory to `src/api/queryKeys.ts`
   (`all -> lists -> list(filter)`, `detail(id)`). Reuse existing keys; do not
   invent a parallel scheme.
4. **Hook** — add `src/hooks/use<Entity>.ts`: `useQuery` for reads, `useMutation`
   for writes. Handle loading and error states. On mutation success, invalidate
   the narrowest relevant query key.
5. **Test** — add a unit test under `src/__tests__/` mirroring the source path;
   mock the service. Run `npm run test.unit`.
````

(No commit yet — commit after Task 14.)

---

## Task 11: Skill — add-receipt-rule

**Files:**
- Create: `.claude/skills/add-receipt-rule/SKILL.md`

- [ ] **Step 1: Write the file**

````markdown
---
name: add-receipt-rule
description: Use when changing receipt/OCR parsing in this project — "add a receipt rule", "parse this receipt", "merchant X isn't detected", "fix date/total/tax detection". Enforces the rule-based + spatial-analysis approach and a fixture-based regression test, since this is the app's highest-regression-risk domain.
---

# Add a receipt-parsing rule

Add or change a rule in the rule-based parser and ship a fixture-based regression
test in the same change. See
[docs/RECEIPT_PARSING.md](../../../docs/RECEIPT_PARSING.md). Read an existing test
first — e.g. `src/__tests__/hooks/receipt-parsing/mcdonaldsReceipt.test.ts` and a
detector test like `totalDetection.test.ts` — and copy the pattern.

## Checklist

1. **Write the failing test first.** Add a `*Receipt.test.ts` (or extend a
   detector test) under `src/__tests__/hooks/receipt-parsing/` using a
   **real-world** receipt fixture. Assert the dates/totals/tax the parser should
   produce. Run `npm run test.unit` and watch it fail for the right reason.
2. **Implement the rule** in the receipt-parsing logic under `src/hooks/`. Use
   spatial analysis (line/column structure), not naive string scanning. Use
   constants for domain values — no magic strings.
3. **Run `npm run test.unit`** — the new test passes and no existing
   receipt-parsing test regresses.
4. Keep parsing logic in the dedicated receipt-parsing area; do not leak it into
   UI components.
````

(No commit yet.)

---

## Task 12: Skill — add-page

**Files:**
- Create: `.claude/skills/add-page/SKILL.md`

- [ ] **Step 1: Write the file**

````markdown
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
   `src/routes/publicRoutes.tsx` if it is unauthenticated). Lazy-load the page
   component.
4. Navigate with React Router's `useHistory` — not `useIonRouter`.
5. Co-locate styles (`.css` or Emotion) with the component; class names describe
   purpose, not appearance.
6. Add a component test under `src/__tests__/` and run `npm run test.unit`.
````

(No commit yet.)

---

## Task 13: Skill — add-native-feature

**Files:**
- Create: `.claude/skills/add-native-feature/SKILL.md`

- [ ] **Step 1: Write the file**

````markdown
---
name: add-native-feature
description: Use when integrating a device capability in this project — "add native X", "use the camera", "secure storage", "biometric auth", "push notification", "badge", "document scanner". Enforces a typed plugin wrapper with platform guards, a web fallback, and explicit permission handling.
---

# Add a native feature

Wrap a Capacitor plugin behind a typed service or hook so platform branching and
permissions live in one place. See [docs/NATIVE.md](../../../docs/NATIVE.md). Read
an existing wrapper first — `src/services/badge.service.ts` — and copy the
pattern.

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
````

(No commit yet.)

---

## Task 14: Subagent — receipt-parsing-reviewer + commit

**Files:**
- Create: `.claude/agents/receipt-parsing-reviewer.md`

- [ ] **Step 1: Write the file**

```markdown
---
name: receipt-parsing-reviewer
description: Reviews a diff that touches the receipt parser or rule engine for regression risk. Dispatch with the Agent tool after changing anything under the receipt-parsing logic or its tests.
---

You are a focused reviewer for the receipt-parsing domain of paperwork-app — the
app's most complex, highest-regression-risk area. Review ONLY the provided diff,
and ONLY for receipt-parsing concerns. Do not duplicate a general code review.

Read [docs/RECEIPT_PARSING.md](../../docs/RECEIPT_PARSING.md) first.

Flag, in priority order:

1. **Detection changes without a test.** Any change to date/total/tax detectors
   or the rule engine that is not accompanied by a new or updated fixture-based
   regression test in `src/__tests__/hooks/receipt-parsing/`.
2. **Weakened or broken matching.** Heuristics made more permissive/brittle,
   spatial-analysis logic replaced by naive string scanning, or an existing
   merchant fixture that would now parse differently.
3. **Magic strings/numbers** where a constant exists or should exist.
4. **Logic leaking out** of the dedicated receipt-parsing area into UI or
   unrelated hooks.

Output: a prioritized list of must-fix issues and a separate list of suggestions.
If the diff is clean, say so plainly. Do not invent issues.
```

- [ ] **Step 2: Commit skills + subagent**

```bash
git add .claude/skills .claude/agents
git commit -m "chore: add scaffolding skills and receipt-parsing review subagent

Encode the four recurring tasks (api-hook, receipt-rule, page,
native-feature) and a focused reviewer for the highest-risk domain so
conventions apply at the moment code is written."
```

---

## Task 15: .claude/settings.json + commit

**Files:**
- Create: `.claude/settings.json`

- [ ] **Step 1: Write the file**

```json
{
  "permissions": {
    "allow": [
      "Bash(npm run test.unit:*)",
      "Bash(npm run lint:*)",
      "Bash(npm run build:*)",
      "Bash(git status)",
      "Bash(git diff:*)",
      "Bash(git log:*)",
      "Bash(git branch:*)",
      "Bash(node scripts/*)"
    ]
  }
}
```

Rationale: auto-approve safe, repeated commands. `npm run test.unit.watch` and the
`run:ios` / `run:android` / `run:web` device commands are intentionally omitted —
they are long-running/interactive.

- [ ] **Step 2: Validate JSON**

Run: `node -e "JSON.parse(require('fs').readFileSync('.claude/settings.json','utf8')); console.log('valid')"`
Expected: `valid`

- [ ] **Step 3: Commit**

```bash
git add .claude/settings.json
git commit -m "chore: add Claude Code permission allowlist

Auto-approve safe repeated commands (unit tests, lint, build, read-only
git, scripts); omit long-running/interactive device and watch commands."
```

---

## Task 16: Preserve notification-center requirements

The existing `.windsurf/requirements/notification-center.md` is a feature
implementation plan and must not be lost.

**Files:**
- Move: `.windsurf/requirements/notification-center.md` -> `specs/notification-center/plan.md`

- [ ] **Step 1: Move the file with git**

Run: `mkdir -p specs/notification-center && git mv .windsurf/requirements/notification-center.md specs/notification-center/plan.md`
Expected: no output; `git status` shows a rename.

(No commit yet — commit after Task 17.)

---

## Task 17: Delete .windsurf/ + commit cleanup

Only after Tasks 2-16 are complete and the content has landed.

**Files:**
- Delete: `.windsurf/` (entire directory)

- [ ] **Step 1: Verify rule coverage before deleting**

Confirm every source rule is represented. Run:
`ls .windsurf/rules`
Expected: 13 files (00..12). Cross-check against the mapping in the design
(`specs/2026-06-09-claude-code-agentic-setup/design.md`): 00->AGENTS app context,
02->AGENTS tech stack, 04->AGENTS principles, 09->AGENTS principles; 01+03->
ARCHITECTURE, 06->STATE_MANAGEMENT, 05+11+10->FRONTEND, 07->RECEIPT_PARSING,
08->NATIVE, 12->TESTING.

- [ ] **Step 2: Delete the directory**

Run: `git rm -r .windsurf`
Expected: lists removed files including `.windsurf/rules/*.md`.

- [ ] **Step 3: Commit the migration cleanup**

```bash
git add specs/notification-center/plan.md
git commit -m "chore: remove .windsurf in favor of AGENTS.md + docs

Windsurf and Cursor both read AGENTS.md, so keeping .windsurf would
create a second source of truth that drifts. Notification-center plan
preserved under specs/."
```

Note: `git rm -r .windsurf` in Step 2 already stages all `.windsurf/` deletions
(including the `git mv` from Task 16). Step 3 adds only the moved file so no
stray untracked files are swept in.

---

## Task 18: Final verification

**Files:** none

- [ ] **Step 1: Link check — every path referenced in AGENTS.md and CLAUDE.md resolves**

Run:
```bash
grep -oE '\]\(([^)]+)\)' AGENTS.md CLAUDE.md | sed -E 's/.*\(([^)]+)\)/\1/' | grep -vE '^https?:' | while read -r p; do [ -e "$p" ] && echo "OK  $p" || echo "MISSING  $p"; done
```
Expected: every line `OK`; no `MISSING`. (Note: `CLAUDE.md` links resolve from
the repo root.)

- [ ] **Step 2: Skill frontmatter check**

Run: `grep -L "^name:" .claude/skills/*/SKILL.md`
Expected: no output (every SKILL.md has a `name:` line).

- [ ] **Step 3: Unit tests still green**

Run: `npm run test.unit`
Expected: all suites pass (no app code changed).

- [ ] **Step 4: Confirm tree state**

Run: `git status`
Expected: clean working tree on `chore/claude-code-agentic-setup`; `.windsurf`
gone; `AGENTS.md`, `CLAUDE.md`, `docs/`, `.claude/`, `specs/` present.

- [ ] **Step 5: Report**

Summarize what landed and hand back for review / PR. Do not push or open the PR
without explicit authorization.
```
```

---

## Self-review notes

- **Spec coverage:** every design section maps to a task — six docs (Tasks 2-7),
  AGENTS.md (8), CLAUDE.md (9), four skills (10-13), subagent (14),
  settings.json (15), notification-center preservation (16), `.windsurf`
  deletion (17), verification (18). All 13 rules are accounted for in the Task 17
  coverage cross-check.
- **No placeholders:** every file's full content is inline.
- **Naming consistency:** skill names (`add-api-hook`, `add-receipt-rule`,
  `add-page`, `add-native-feature`), subagent (`receipt-parsing-reviewer`), and
  doc filenames match the design and the AGENTS.md index throughout.
- **Deviation from design:** `notification-center.md` is saved as `plan.md`
  (it is an implementation plan, not bare requirements) — noted in Task 16.

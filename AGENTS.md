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
- Routing: React Router 5 (navigate with `useHistory` as the default; `useIonRouter` appears in a few places)
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

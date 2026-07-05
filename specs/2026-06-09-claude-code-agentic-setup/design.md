# Design: Claude Code agentic documentation for paperwork-app

Date: 2026-06-09
Status: Approved (design), pending implementation plan
Branch: `chore/claude-code-agentic-setup`

## Problem

AI agent rules currently live in `.windsurf/rules/` as 13 markdown files, almost
all `trigger: always_on`, with no cross-references. This is a Windsurf-only setup
with two structural problems:

1. **Everything is always-on.** Narrow, situational knowledge (receipt-parsing
   rule engine, Capacitor native plugins, styling specifics) is loaded into every
   conversation alongside truly cross-cutting policy (TypeScript strictness,
   error handling, security). This bloats context and dilutes attention.
2. **Windsurf-only.** The project is now worked primarily through Claude Code.
   There is no `AGENTS.md` or `CLAUDE.md`, so Claude Code, Cursor, and Copilot
   have no source of truth.

We want a single, tool-agnostic source of truth (`AGENTS.md`) with progressive
disclosure: a lean always-loaded core, situational knowledge in on-demand
reference docs, and recurring tasks as skills. This mirrors the structure already
adopted in the sibling backend repo `paperwork`
(`specs/2026-06-07-claude-code-agentic-setup/`) and the Superpowers way of
working.

## Goals

- Single source of truth: `AGENTS.md`. `CLAUDE.md` is a thin redirect.
- Progressive disclosure: always-loaded core is small; detail loads on demand.
- No knowledge lost: every one of the 13 Windsurf rules lands somewhere, and the
  existing `requirements/notification-center.md` is preserved.
- Encode the highest-value recurring tasks as skills so conventions apply at the
  moment of writing code, not just as passive prose.
- A focused subagent for the project's #1 complexity/regression risk: receipt
  parsing.

## Non-goals (explicitly deferred)

- **Expanding unit-test coverage.** Cycle 2 — its own spec/plan
  (`specs/2026-06-09-unit-test-expansion/`, to follow). See Follow-ups.
- **CI (GitHub Actions).** Recommended; see Follow-ups.
- **Changing app runtime code.** This is a documentation + config change only.

Note: unlike the backend repo, `lint` (eslint) and typecheck (via
`build = tsc && vite build`) scripts already exist here, so there is **no**
separate "add lint/typecheck" phase — the Superpowers `pre-pr-gate`/`pr-prep`
skills wire to the existing scripts immediately.

## Target structure

```
paperwork-app/
├── AGENTS.md                 # single source of truth (always-loaded core + index)
├── CLAUDE.md                 # thin redirect -> AGENTS.md
├── docs/
│   ├── ARCHITECTURE.md       # app structure, routing, layering   (01-architecture, 03-code-organization)
│   ├── STATE_MANAGEMENT.md   # React Query + axios api layer, caching, query keys (06 + api/)
│   ├── FRONTEND.md           # component design, styling, performance (05, 11, 10)
│   ├── RECEIPT_PARSING.md    # rule engine, tax/date/total detection (07)
│   ├── NATIVE.md             # Capacitor plugins, permissions, web fallback (08)
│   └── TESTING.md            # vitest + testing-library + cypress conventions (12)
├── specs/                    # one folder per feature: <date>-<slug>/{design.md,plan.md}
│   └── notification-center/  # preserved from .windsurf/requirements (plan.md)
├── .claude/
│   ├── settings.json         # permission allowlist
│   ├── skills/
│   │   ├── add-api-hook/SKILL.md
│   │   ├── add-receipt-rule/SKILL.md
│   │   ├── add-page/SKILL.md
│   │   └── add-native-feature/SKILL.md
│   └── agents/
│       └── receipt-parsing-reviewer.md
└── .windsurf/                # DELETED after migration verified
```

## AGENTS.md — always-loaded core

Mirrors the reference repo's shape, adapted for a frontend-only app.

### Sections

1. **Header note** — "single source of truth; tool-specific files redirect here."
2. **App context** — Ionic React app for expense/document management and
   bookkeeping, aimed at owners of small businesses and independent contractors
   in the Netherlands. Feature list: manage expenses; scan receipts -> expense;
   manage/generate invoices (PDF); manage contacts; email invoices to clients;
   notes; dashboard (profit/loss, expenses, income visualisation); export for tax
   returns. (folds `00-app-context`)
3. **Documentation Index** — `Topic | File | When to read` table pointing at every
   `docs/` file. The agent loads the right doc instead of reading all.
4. **Tech Stack** — React 19, TypeScript (strict), Ionic 8 (`@ionic/react`,
   `@ionic/react-router`), Capacitor 7, TanStack Query 5, axios, Emotion
   (styling), chart.js / react-chartjs-2, date-fns, dompurify, TinyMCE, Vite
   (+ legacy plugin). Tests: Vitest + Testing Library + Cypress (E2E). Package
   manager: **npm**. (folds `02-tech-stack`)
5. **Principles (always apply)** — the genuinely cross-cutting invariants only:
   - **TypeScript strictness.** No `any`; prefer precise types and discriminated
     unions; parse/validate external data (API responses, native results) at the
     boundary. (`04-typescript`)
   - **Error handling.** try/catch in async paths; surface user-safe messages via
     the app's error UI; never swallow errors silently. (`09-error-handling`)
   - **Conventions.** Dutch currency formatting everywhere money is shown
     (2 decimals, comma decimal separator, period thousands separator). Constants
     over magic strings for domain values; keep shared constants in dedicated
     files. Reuse existing patterns before inventing new ones.
   - **Security.** No secrets in client code; use secure storage
     (`capacitor-secure-storage-plugin`) for sensitive data; sanitize all HTML
     with dompurify before render; request the minimum native permissions.
6. **Workflow (spec-driven)** — Brainstorm -> Spec -> Implementation plan ->
   Implement. Each feature gets a folder under `specs/` holding its `design.md`
   (spec) and `plan.md`. For agentic execution use the Superpowers skills
   (`superpowers:executing-plans`, `superpowers:subagent-driven-development`).
7. **Commit & PR rules** — never commit to `main` (branch first); Conventional
   Commits with imperative subject and why-not-what body; run `npm run test.unit`
   before staging; never auto-commit without explicit user authorization. Points
   at the global Superpowers PR skills (`pre-pr-gate`, `pr-prep`,
   `commit-with-message`) wired to the existing `lint` / `build` / `test.unit`
   scripts — no repo-specific PR skill is added (none exists in the reference
   repo either; those workflows are global plugin skills).

The four always-apply blocks are deliberately short. Detail lives in `docs/`.

## CLAUDE.md — thin redirect

Three short sections (mirrors reference repo):

- **Source of truth** — read `AGENTS.md` first; this file stays thin to avoid
  duplication.
- **Skills & subagents** — pointers to `.claude/skills/` and `.claude/agents/`.
- **Workflow** — Brainstorm -> spec -> plan -> implement on Superpowers; specs
  live in `specs/`.

No SessionStart hook: CLAUDE.md is auto-loaded, the environment already injects
branch + recent commits, and a global `gk` hook fires on session events.

## docs/ — rule-to-file mapping

Every Windsurf rule lands somewhere; nothing is lost. The 13 always-on rules
collapse into 6 topical reference docs plus the AGENTS.md core. Each doc opens
with a one-line "read this when..." so the AGENTS.md index stays honest.

| docs/ file          | Folds in these `.windsurf/rules/` files |
|---------------------|------------------------------------------|
| ARCHITECTURE.md     | 01-architecture, 03-code-organization |
| STATE_MANAGEMENT.md | 06-state-management (+ the `src/api/` axios layer and query-key conventions) |
| FRONTEND.md         | 05-component-design, 11-styling, 10-performance |
| RECEIPT_PARSING.md  | 07-receipt-parsing |
| NATIVE.md           | 08-native-functionality |
| TESTING.md          | 12-testing |

Rules that become **always-apply core in AGENTS.md** (not docs): `00-app-context`
(app context section), `02-tech-stack` (tech stack section), `04-typescript`
(strictness principle), `09-error-handling` (error-handling principle).

The `requirements/notification-center.md` implementation plan moves to
`specs/notification-center/plan.md` (a pre-existing feature implementation plan,
not part of the always-loaded core).

## .claude/skills/ — recurring-task skills

Each is a `SKILL.md` with `name` + `description` frontmatter and a short
procedure, following the reference repo's skill style. Each tells the agent to
read an existing example and the relevant `docs/` file first, then copy the
pattern.

- **add-api-hook** — scaffold a TanStack Query hook backed by an axios function
  in `src/api/`. Enforces the query-key convention, error handling, and cache
  invalidation on mutations. Read an existing hook in `src/hooks/` and
  [docs/STATE_MANAGEMENT.md](../../docs/STATE_MANAGEMENT.md) first. Triggers on
  "add a hook", "fetch X", "new query/mutation".
- **add-receipt-rule** — add a receipt-parsing rule to the rule engine plus a
  fixture-based regression test under
  `src/__tests__/hooks/receipt-parsing/`. Read
  [docs/RECEIPT_PARSING.md](../../docs/RECEIPT_PARSING.md) and an existing
  `*Receipt.test.ts` first. Triggers on "add a receipt rule", "parse this
  receipt", "merchant X isn't detected".
- **add-page** — scaffold a new Ionic page component and register its route
  (lazy-loaded), following the page/route + styling conventions. Read
  [docs/ARCHITECTURE.md](../../docs/ARCHITECTURE.md) and
  [docs/FRONTEND.md](../../docs/FRONTEND.md) first. Triggers on "add a page",
  "new screen", "new route".
- **add-native-feature** — wrap a Capacitor plugin behind a typed service/hook
  with a web fallback and permission handling. Read
  [docs/NATIVE.md](../../docs/NATIVE.md) and an existing native wrapper first.
  Triggers on "add native X", "use the camera/secure storage/biometric/push".

## .claude/agents/ — subagent

- **receipt-parsing-reviewer** — reviews a diff that touches the receipt parser
  or rule engine specifically for regression risk: changed detection heuristics
  (tax/date/total) without a corresponding fixture test, broken or weakened
  matching logic, magic strings where constants exist. Single, focused; does not
  duplicate the global `code-reviewer`/`test-writer` agents.

## .claude/settings.json — permission allowlist

Scoped allowlist to cut permission prompts for safe, repeated commands:

- `Bash(npm run test.unit)`, `Bash(npm run test.unit -- :*)`
- `Bash(npm run lint)`, `Bash(npm run build)`
- `Bash(git status)`, `Bash(git diff:*)`, `Bash(git log:*)`, `Bash(git branch:*)`
- `Bash(node scripts/*)`

(`npm run test.unit.watch` and the `run:ios` / `run:android` / `run:web` device
commands are intentionally omitted — they are long-running/interactive and not
suited to an auto-approved allowlist.)

## .windsurf/ — deletion

Delete `.windsurf/` entirely after the content lands in AGENTS.md + docs/ and the
`requirements/notification-center.md` is moved to `specs/`. Windsurf and Cursor
both read `AGENTS.md`, so the directory would only create a second source of
truth that drifts. This is the final migration step, after verifying coverage of
all 13 rules and the requirements file.

## Testing / verification

This is a documentation + config change with no runtime code. Verification:

1. **Coverage check** — confirm all 13 original rules map to AGENTS.md or a
   docs/ file (the mapping table is the checklist), and that
   `notification-center.md` is preserved under `specs/`.
2. **Link check** — every path referenced in AGENTS.md and CLAUDE.md resolves to
   a real file.
3. **Skill load check** — each `SKILL.md` has valid frontmatter (`name`,
   `description`) and is discoverable.
4. **settings.json validity** — valid JSON; permission entries parse.
5. **No regressions** — `npm run test.unit` still passes (nothing changed in app
   code).

## Follow-ups (separate spec/plan cycles)

1. **Cycle 2 — unit-test expansion.** Pure logic/utils/services first, then API
   hooks (mocked axios + React Query), then components (testing-library); defer
   full-page and E2E. Its own spec at
   `specs/2026-06-09-unit-test-expansion/`. May adapt the reference repo's
   `.claude/workflows/*.js` test-generation scripts.
2. **CI (recommended).** A GitHub Actions workflow running `npm run lint`,
   `npm run build` (typecheck), and `npm run test.unit` on push, per the "tests
   on every push" standard.

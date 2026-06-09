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

#!/bin/sh
# Stop hook: typecheck + lint this repo if any TS/JS source changed this turn.
# Exit 2 with stderr feeds failures back to Claude so it fixes them before
# the turn ends.
#
# The global ~/.claude/hooks/quality-gate.sh only checks pnpm-monorepo
# apps/*|packages/* workspaces and silently no-ops here, since paperwork-app
# is a single npm package rooted at src/. This is the project-scoped
# replacement for that case.

INPUT=$(cat)

# Prevent infinite loops: if Claude is already continuing from a prior block,
# bail out. The user can still re-trigger by sending a new message.
case "$INPUT" in
  *'"stop_hook_active":'*'true'*) exit 0 ;;
esac

REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null) || exit 0
cd "$REPO_ROOT" || exit 0

CHANGED=$(
  {
    git diff --name-only HEAD 2>/dev/null
    git ls-files --others --exclude-standard 2>/dev/null
  } | grep -E '\.(tsx?|jsx?|mjs|cjs)$'
)
[ -z "$CHANGED" ] && exit 0

FAILURES=""

TYPECHECK_OUT=$(npm run typecheck 2>&1)
if [ $? -ne 0 ]; then
  FAILURES="${FAILURES}
==== typecheck failed ====
${TYPECHECK_OUT}
"
fi

LINT_OUT=$(npm run lint 2>&1)
if [ $? -ne 0 ]; then
  FAILURES="${FAILURES}
==== lint failed ====
${LINT_OUT}
"
fi

if [ -n "$FAILURES" ]; then
  printf 'Quality gate failed. Fix these before ending the turn:\n%s\n' "$FAILURES" >&2
  exit 2
fi

exit 0

# Design: paperwork-app-native migration

Date: 2026-06-24
Status: Approved (design), pending Phase 0 implementation plan
Predecessor: [../2026-06-23-react-native-feasibility/assessment.md](../2026-06-23-react-native-feasibility/assessment.md)

## Problem

The feasibility assessment and its throwaway Expo spike (`/Users/henry/Projects/devartist/paperwork-rn-spike/`) de-risked the three subsystems with no obvious RN equivalent. All three are now resolved enough to commit to a real migration:

- **Receipt scan pipeline** (camera + document-scanner + OCR) — the spike's committed code shows a workaround (plain capture, no crop) because of a document-scanner-plugin crash, but a real-device test (iPhone, today) confirmed `react-native-document-scanner-plugin` + `@react-native-ml-kit/text-recognition` works as expected, crop/deskew included. The crash was simulator-specific; the spike repo's commit history is stale on this point.
- **Rich text editor** — `@10play/tentap-editor`'s default bridge set has no alignment or table support (confirmed by reading the library's source, not a UI gap). Decision: accept the gap. Alignment and table editing are formally descoped from the Emails screen; everything else (bold/italic, lists, link insert, image insert) carries over.
- **Charts** — the spike tested `react-native-chart-kit` (line/bar/pie, legend, dark-mode theming all work in RN), not the library going to production. `react-native-gifted-charts` is the production choice — richer built-in feature set (legend, tooltip-with-formatter, dual-dataset bars) that matches the actual dashboard requirement more directly than chart-kit's thinner API. The specific dual-dataset-bar-with-formatted-tooltip combination remains untested with either library, but low risk: the underlying SVG+RN rendering path already proved out.

This design covers the real migration: a new standalone repo, `paperwork-app-native`, built to full feature parity with the current Ionic app, plus an execution strategy that keeps Claude token usage economical across what is a large, multi-phase rewrite.

## Goals

- Ship `paperwork-app-native`, a standalone Expo/React Native app at 1:1 feature parity with the current Ionic app (all 12 feature areas), except the two explicitly descoped rich-text features.
- Match current dark/light visual design — same color intent, same layout shape — not just functional parity.
- Structure the rewrite (phasing, tooling, docs) so that executing it via Claude Code is fast and token-economical without sacrificing correctness.

## Non-goals

- **No shared monorepo/package between `paperwork-app` and `paperwork-app-native`.** Portable logic (TanStack Query hooks, the axios client, TypeScript types) is manually ported and adapted into the new repo, not symlinked or workspace-shared.
- **No backend changes.** Same API, consumed the same way.
- **No dual-running/strangler-fig rollout.** The old Ionic app keeps running unchanged until cutover; no cross-app deep-linking or shared auth state.
- **No alignment/table support in the new rich-text editor.** Explicitly descoped (see Problem).
- **No per-phase implementation detail in this doc.** Each phase below gets its own brainstorm/spec/plan cycle when it's started — this doc fixes the roadmap and the shared architecture decisions every phase depends on, not the screen-by-screen detail.

## Decisions

### Migration strategy

Full rewrite with internal checkpoint builds, single external cutover. The old app stays live and untouched throughout. After Phase 2 (receipt pipeline) and Phase 3 (dashboard) there's an internal TestFlight/EAS build to dogfood on a real device before continuing — catches integration issues early without taking on the complexity of running two apps in parallel, which this migration's risk profile (no urgent pain point driving it) doesn't justify.

### Platform: Expo, managed workflow + `prebuild`/dev client

Validated by the spike, including native module linking for the document scanner. Not reopening Expo-vs-bare-RN-CLI. New Architecture is not an opt-in choice here — RN 0.85.x (the version the spike runs) only supports the New Architecture; there's no Old Architecture path left to choose.

### Navigation: `expo-router`, file-based, drawer + nested persistent tabs

The spike used `expo-router` (confirmed in `package.json` and `src/app/_layout.tsx`) — file-based routing built on React Navigation, refining the original assessment's guess of bare React Navigation with manually-configured navigators. Carrying that forward: adding a screen means adding a file at the right path, not also editing a separate navigator-config file — fewer things to keep in sync, which matters for the token-economy goal.

The current app's real nav shape (`src/App.tsx`, `src/components/SideMenu/index.tsx`, `src/routes/privateRoutes.tsx`) is a hybrid, not a plain tab bar:

- An `IonSplitPane` + `IonMenu` side menu is the authoritative nav surface (drawer on phone; can render as a permanent rail on wider viewports). It links to Dashboard, Kosten (Expenses), Facturen (Invoices), Emails, Contacten (Contacts), Belasting (Taxes), Notificaties (Notifications), Profile, and Logout. Settings has a route but is currently commented out of the menu.
- A 5-item bottom tab bar (Dashboard, Kosten, Facturen, Emails, Contacten) renders on every one of those authenticated pages — including Taxes/Notifications/Profile, which have no tab button of their own. It's a persistent quick-access strip layered alongside the drawer's full list, not an either/or with it.

`expo-router` supports this directly: a `(drawer)` group (its Drawer layout, built on `@react-navigation/drawer`) containing a nested `(tabs)` group for the 5 primary sections, with Settings/Taxes/Notifications/Profile as drawer-reachable screens. Whether those last four also render the persistent tab strip (exact behavior parity) or simplify to drawer-only screens is a Phase 0 implementation decision, not fixed here. Likewise, `IonSplitPane`'s permanent-rail-on-wide-viewport behavior is treated as a nice-to-have, not a parity requirement, unless the app needs real tablet support — confirm when Phase 0 starts.

The spike's tab bar uses `expo-router/unstable-native-tabs` (note: **unstable** API, platform-native chrome). For production, use the stable `Tabs` component nested inside the drawer group instead — fully JS-styleable, which matters more here than native chrome given the goal is pixel-level dark/light parity with the current custom-styled Ionic tab bar and side menu, not adopting each platform's native look.

### Styling: RN `StyleSheet` + a typed theme/tokens module, no third-party UI kit

The spike's screens already use `StyleSheet.create()` plus a `src/constants/theme.ts` module (`Colors`, `Spacing`) with `useColorScheme()` branching — a real, consistently-used pattern, even though its actual color values are unmodified `create-expo-app` template boilerplate. Keep the structural pattern; replace the placeholder values with tokens derived from the current app's Ionic CSS variables/Emotion theme during Phase 0, so dark/light parity is real, not coincidental.

No NativeWind, Tamagui, or React Native Paper — `StyleSheet` solves this without a new dependency, and an object-style API is the closer continuation of Emotion's authoring model than adopting Tailwind-style utility classes would be. Fewer concepts in play also serves the token-economy goal: every later screen-conversion task works from one styling vocabulary.

### Subsystem choices (carried from the feasibility assessment + spike)

| Subsystem | Library | Status |
|---|---|---|
| Receipt scan | `react-native-document-scanner-plugin` + `@react-native-ml-kit/text-recognition` | Validated on real device |
| Charts | `react-native-gifted-charts` | Chosen on requirements fit; underlying rendering path validated, exact feature combo not yet built |
| Rich text | `@10play/tentap-editor` | Alignment + tables descoped |
| Auth/storage/push/etc. | `expo-local-authentication`, `expo-secure-store`, `expo-notifications`/`@react-native-firebase/messaging`, `expo-file-system`, `expo-haptics` | Low risk, not yet built |

## Phase roadmap

Each phase gets its own `specs/<date>-<topic>/` brainstorm → spec → plan cycle when it starts. This roadmap fixes scope and order, not implementation detail.

| Phase | Scope | Depends on | Risk |
|---|---|---|---|
| 0 — Bootstrap | Expo TS scaffold + `prebuild`/dev client, `expo-router` nav skeleton (drawer + nested tabs per the structure above), dark/light theme tokens derived from the current app, ported Claude tooling (AGENTS.md, skills, subagents, permission allowlist) | — | Low |
| 1 — Auth & core native plugins | Login, biometric auth, secure storage, push/badge/filesystem/haptics | 0 | Low — mature 1:1 Expo equivalents |
| 2 — Receipt pipeline | Camera + document-scanner + ML Kit OCR, promoted from spike to production code | 0, 1 | Low — validated on-device |
| 3 — Dashboard & charts | `react-native-gifted-charts` bar+pie matching the dual-dataset/tooltip/legend/currency-format requirement | 0, 1 | Medium — exact feature combo untested |
| 4 — Remaining CRUD screens | Contacts, Expenses, Invoices, Notifications, Profile, Settings, Taxes (~30 files) | 0, 1 | Low risk, high volume |
| 5 — Emails (rich text) | `@10play/tentap-editor`, alignment+tables descoped | 0, 1 | Low — decided |
| 6 — Testing/CI/release cutover | Jest+RNTL, Detox/Maestro, EAS build pipeline, TestFlight checkpoints, store cutover | all | Medium |

## Token-economy execution strategy

1. **Skills carry conventions, not re-derivation.** Port this repo's skill pattern (`add-page`, `add-api-hook`, `add-native-feature`, `add-receipt-rule`) into `paperwork-app-native` during Phase 0 — an `add-rn-screen` skill encodes the Ionic→RN mapping, nav-file placement, and theme-token usage once, loaded on demand instead of re-derived from examples every time.
2. **One real exemplar before any batch.** Phase 4 hand-builds one list screen and one form/edit screen fully reviewed; every later conversion task points at the working exemplar instead of re-explaining the mapping in prose.
3. **Subagent dispatch for the high-volume, low-judgment phase.** Phase 4's ~30 screens split cleanly by feature area with no shared state — a fit for parallel subagent dispatch. Trade-off: parallel dispatch costs a bit more in aggregate tokens (each subagent pays its own context-loading overhead) for a wall-clock win. Worth it for Phase 4 specifically; Phases 0-3 and 5-6 are sequential-dependency-heavy and lower-volume, so they stay in-line.
4. **Model tiering.** Architecture work, exemplar screens, and native-module integration (Phases 0-3) stay on Sonnet. Phase 4's mechanical screen clones are a fit for Haiku-backed subagents (well-specified, pattern-following work), with a Sonnet `code-reviewer` pass per batch as the quality gate. Optional — revisit if quality suffers.
5. **Phase-scoped plans.** Each phase's plan file is self-contained; implementing Phase 3 only loads Phase 3's plan, not the whole roadmap.
6. **Cheap deterministic checks before agent review.** `tsc --noEmit` + ESLint + Jest catch most regressions before any self-review turn; `code-reviewer` runs once per phase batch, not per file.
7. **Permission allowlist from day one.** Apply `fewer-permission-prompts` once the repo has a few sessions of history.

## Validation criteria

- `paperwork-app-native` reaches functional parity with all 12 feature areas of the current app, with alignment/table editing on the Emails screen as the one documented exception.
- Dark and light mode visually match the current app's color intent on every migrated screen.
- Each phase ships an internal build (EAS/TestFlight) that the user can verify on a real device before the next phase starts, per the migration-strategy decision above.
- Tests (Jest + RNTL, Detox/Maestro for critical flows) pass before any phase is marked done.

## Follow-ups

- Phase 0 implementation plan — next step after this design is approved.
- Phases 1-6 each get their own brainstorm/spec/plan cycle, informed by whatever Phase 0 and its predecessors actually produce (file structure, theme token names, skill names) rather than guessed now.

# Design: React Native migration feasibility assessment

Date: 2026-06-23
Status: Approved (design), pending implementation plan
Branch: `docs/react-native-feasibility-spec`

## Problem

Paperwork-app is an Ionic React app using Capacitor 7 for native functionality
(camera, document scanner, OCR, biometric auth, secure storage, push, badge,
filesystem). There's no concrete pain point driving a move to React Native
today — this is exploratory: before deciding whether a migration is worth
pursuing, we need to know what it would actually cost and where the real risks
are, not guess.

A full migration plan would be premature: we don't yet know if the highest-risk
subsystems (receipt scanning, rich text editing, charting) have viable React
Native equivalents at all. Committing to a phased migration plan before
answering that is planning on top of an unvalidated assumption.

## Goals

- Produce a written feasibility assessment covering every Ionic/Capacitor/
  web-only dependency, its candidate React Native replacement, and an effort/
  risk rating.
- De-risk the three subsystems with no obvious RN equivalent — receipt scan
  pipeline (camera + document scanner + OCR), rich text editing (TinyMCE),
  and charting (chart.js) — with a small throwaway spike, before writing the
  recommendation.
- End with a clear go/no-go recommendation and, if "go," the broad shape of an
  approach (e.g. full rewrite vs. other) — not a detailed phased plan.

## Non-goals (explicitly deferred)

- **No code changes to paperwork-app itself.** This is a research and
  documentation cycle only.
- **No detailed migration plan.** If the recommendation is "go," that's its
  own follow-up brainstorm/spec cycle, informed by this assessment's findings.
- **No production architecture decision (Expo vs. bare RN CLI).** The spike
  uses Expo for spike-development speed; that doesn't bind a future real
  migration to the same choice.
- **No backend changes.** The backend is a separate API service consumed via
  axios/TanStack Query; nothing here depends on or affects it.

## Current stack (frontend-relevant inventory)

For reference — full detail goes in the assessment doc itself:

- UI: `@ionic/react` 8, `@ionic/react-router` 8, React 19. 43 files use Ionic
  components directly across 12 feature areas (Contacts, Dashboard, Emails,
  Expenses, Invoices, Login, Notifications, PasswordReset, Profile, Reset,
  Settings, Taxes).
- Routing: React Router 5 (`useHistory` primary, `useIonRouter` in a few
  places).
- Native (Capacitor 7): camera, document scanner
  (`capacitor-document-scanner`), OCR (`@jcesarmobile/capacitor-ocr`,
  `@capacitor-community/image-to-text`), biometric auth
  (`@aparajita/capacitor-biometric-auth`), secure storage
  (`capacitor-secure-storage-plugin`), push (`@capacitor/push-notifications`,
  `@capacitor-firebase/messaging`), badge (`@capawesome/capacitor-badge`),
  filesystem, haptics, status bar, keyboard, app.
- Styling: Emotion (CSS-in-JS) + traditional CSS.
- Rich text: TinyMCE (`@tinymce/tinymce-react`) — web-only, iframe-based.
- Charts: chart.js / react-chartjs-2 — canvas-based, web-only.
- Sanitization: dompurify — DOM-dependent, web-only.
- Data: TanStack Query 5 + axios — framework-agnostic, fully portable.
- Build: Vite (+ legacy plugin).
- Tests: Vitest, Testing Library, Cypress (E2E).

## Deliverable 1: Feasibility assessment document

Written to this same spec folder (`specs/2026-06-23-react-native-feasibility/`)
once research and the spike are complete. Sections:

1. **Stack inventory** — the table above, expanded with file/usage counts per
   dependency.
2. **RN-equivalent mapping** — for each dependency, the candidate RN/Expo
   library, its maturity, and Expo-compatibility (most Capacitor plugins have
   solid equivalents — camera, biometrics, secure storage, push, badge,
   filesystem, haptics are expected low-risk swaps via Expo SDK or
   `@react-native-firebase/*`).
3. **Gap analysis** — the three subsystems with no clean off-the-shelf
   equivalent (TinyMCE, chart.js, dompurify) and the realistic fallback
   options for each (e.g. WebView-wrapped editor vs. a native RN rich-text
   library with a reduced feature set; a server-side or no-op replacement for
   dompurify since RN doesn't render raw HTML the same way).
4. **Effort estimate by layer** — UI rewrite (Ionic component -> RN
   equivalent, page by page), navigation (React Router 5 -> React
   Navigation), styling (Emotion -> `@emotion/native` or `StyleSheet`), native
   plugin swaps, build tooling (Vite -> Metro/Expo), testing (Vitest/RTL/
   Cypress -> Jest/React Native Testing Library/Detox or Maestro).
5. **Spike findings** — pass/fail/partial verdict and notes for each of the
   three risk areas below.
6. **Recommendation** — go/no-go, and if "go," the broad shape only (e.g.
   full rewrite released as a v2 vs. an alternative) — not a phased plan.

## Deliverable 2: Throwaway spike (separate repo)

Lives outside paperwork-app — a disposable Expo app, not committed to this
repository. Bootstrapped with `npx create-expo-app`, then `expo prebuild` to
generate native projects so libraries that aren't Expo-Go-compatible (the
document scanner) can still be linked and tested.

Three short, independent checks inside the one app:

1. **Receipt scan pipeline** — camera capture -> document edge-detection/crop
   -> OCR text extraction, using realistic RN candidates (e.g.
   `react-native-vision-camera` + a document-scanner library + an ML Kit text
   recognition wrapper). Success criteria: capture a photo of a real test
   receipt, get it cropped/deskewed, and extract text of roughly comparable
   quality to today's Capacitor pipeline.
2. **Rich text editing** — try 1-2 candidate RN rich text editors against the
   actual toolbar/feature set the Notes and invoice-email composer use today
   (confirmed by reading the current TinyMCE config during desk research, not
   guessed). Verdict: a native RN library covers the needed features, or a
   WebView-wrapped fallback is required.
3. **Charts** — recreate one dashboard chart (the profit/loss line or bar
   chart) using a candidate RN charting library (e.g. Victory Native or a
   Skia-based chart lib). Verdict on visual/functional parity, including any
   interactivity (tooltips) currently in use.

Each check produces a pass/fail/partial verdict and short notes — not
production-quality code. No automated tests, no CI, no polish.

## Sequencing

1. Desk research (no code) — stack inventory, RN-equivalent mapping, gap
   analysis. Drafted into the assessment doc.
2. Spike (separate repo) — set up the Expo app, run the three checks, capture
   findings.
3. Fold spike findings into the assessment doc; write the final
   recommendation.
4. User reviews the finished assessment. If "go," a separate brainstorm/spec
   cycle covers the actual migration plan.

## Validation criteria

This is a research deliverable, not running code in this repo, so
"verification" means:

1. Every dependency in the current stack inventory has a corresponding
   RN-equivalent entry (or an explicit "no equivalent" gap entry) — no silent
   omissions.
2. Each of the three spike checks has an explicit pass/fail/partial verdict
   backed by something observed (a captured/OCR'd test receipt, a rendered
   chart screenshot, an editor feature checklist) — not a guess.
3. The recommendation section directly answers go/no-go; it doesn't hedge
   indefinitely.

## Follow-ups (separate spec/plan cycle, only if "go")

1. **Detailed migration plan.** Phasing, cutover strategy, and whether any
   business logic (hooks/services/types) can be shared or must be
   reimplemented — its own brainstorm/spec cycle informed by this
   assessment's findings.

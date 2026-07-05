# React Native Migration Feasibility — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce a feasibility assessment (`specs/2026-06-23-react-native-feasibility/assessment.md`) that catalogs every Ionic/Capacitor/web-only dependency against a candidate React Native replacement, de-risks the three subsystems with no obvious RN equivalent via a throwaway Expo spike, and ends with an explicit go/no-go recommendation.

**Architecture:** Two tracks. (1) Desk research — read the actual usage of each dependency in this repo (not guessed) and write findings into `assessment.md`. (2) A throwaway Expo app, outside this repo, that exercises the three highest-risk subsystems: the receipt scan pipeline (camera + document scanner + OCR), rich text editing (TinyMCE replacement), and charting (chart.js replacement). Findings from both tracks fold into one final recommendation.

**Tech Stack (current app, for reference):** Ionic React 8, Capacitor 7, React 19, TypeScript, TanStack Query 5 + axios, Emotion, React Router 5, TinyMCE, chart.js/react-chartjs-2, dompurify, Vite. Spike app: Expo (latest SDK) + `expo prebuild` for native module linking.

## Current state

Branch `docs/react-native-feasibility-spec` already exists off `main` with `specs/2026-06-23-react-native-feasibility/design.md` committed. This plan continues from there — do not recreate the branch or the design doc.

## Global Constraints

- **No app code changes in paperwork-app.** This cycle is research and documentation only.
- **The spike is a separate, throwaway repo**, not committed to paperwork-app. Default location: `/Users/henry/Projects/devartist/paperwork-rn-spike/` (sibling to this repo). If that path is unavailable, ask before picking another.
- **Never commit to `main`** in paperwork-app. Stay on `docs/react-native-feasibility-spec`. Conventional Commits, imperative subject, why-not-what body. Never push without explicit authorization.
- **Library APIs may have drifted** since this plan was written — verify package names/APIs against their current README/npm page before installing if a command errors unexpectedly.

---

## Task 1: Desk research — write Sections 1-4 of the assessment doc

**Files:**
- Create: `specs/2026-06-23-react-native-feasibility/assessment.md`

**Interfaces:**
- Produces: `assessment.md` with Sections 1-4 populated. Task 6 appends Sections 5-6 to this same file — do not change section numbering or headers.

- [ ] **Step 1: Re-confirm dependency usage counts haven't drifted**

Run from the repo root:

```bash
for p in "@capacitor/camera" "capacitor-document-scanner" "@capacitor-community/image-to-text" "@jcesarmobile/capacitor-ocr" "capacitor-biometric-auth" "capacitor-secure-storage-plugin" "@capacitor/push-notifications\|capacitor-firebase/messaging" "capawesome/capacitor-badge" "@capacitor/filesystem" "@capacitor/haptics" "@capacitor/status-bar" "@capacitor/keyboard" "tinymce" "chart.js\|react-chartjs-2" "dompurify" "react-router" "@emotion"; do
  echo "$p: $(grep -rl "$p" src --include='*.ts*' -i | wc -l)"
done
```

Expected output (one line per dependency, count may legitimately differ if the app has changed since this plan was written — if a count is wildly different, e.g. 0 where this plan says 5, stop and re-read the relevant files before continuing):

```
@capacitor/camera: 1
capacitor-document-scanner: 1
@capacitor-community/image-to-text: 2
@jcesarmobile/capacitor-ocr: 0
capacitor-biometric-auth: 1
capacitor-secure-storage-plugin: 5
@capacitor/push-notifications\|capacitor-firebase/messaging: 2
capawesome/capacitor-badge: 2
@capacitor/filesystem: 3
@capacitor/haptics: 0
@capacitor/status-bar: 0
@capacitor/keyboard: 0
tinymce: 1
chart.js\|react-chartjs-2: 2
dompurify: 1
react-router: 27
@emotion: 5
```

- [ ] **Step 2: Write Section 1 — Stack inventory**

Create `specs/2026-06-23-react-native-feasibility/assessment.md` with:

```markdown
# React Native Migration Feasibility Assessment

Spec: [design.md](design.md)
Status: In progress

## 1. Stack inventory

| Dependency | Purpose | Files using it | Notes |
|---|---|---|---|
| `@ionic/react`, `@ionic/react-router` | UI component library + router glue | 43 files use Ionic components directly, across 12 feature areas (Contacts, Dashboard, Emails, Expenses, Invoices, Login, Notifications, PasswordReset, Profile, Reset, Settings, Taxes) | Full UI rewrite surface |
| `react-router` / `react-router-dom` v5 | Navigation | 27 files | `useHistory` is the dominant pattern; `useIonRouter` in a few places |
| `@capacitor/camera` | Profile photo capture (`Settings/Edit`) | 1 | Simple `Camera.getPhoto()` call, not the receipt pipeline |
| `capacitor-document-scanner` | Document edge-detect/crop for receipt capture | 1 (`src/hooks/useScan.ts`) | Core receipt pipeline — see Section 3 |
| `@capacitor-community/image-to-text` | OCR text extraction | 2 (`src/hooks/useScan.ts`, `src/hooks/useScanDocument.ts`) | The **live** OCR path is `useScan.ts`; see note below |
| `@jcesarmobile/capacitor-ocr` | OCR (alternate) | 0 in `src/` | Installed and natively linked (visible in `ios/`/`android/` plugin manifests) but **never imported in TypeScript**. Dead dependency at the JS layer — no migration action needed. |
| `@aparajita/capacitor-biometric-auth` | Biometric login | 1 | |
| `capacitor-secure-storage-plugin` | Secure credential/token storage | 5 | |
| `@capacitor/push-notifications`, `@capacitor-firebase/messaging` | Push notifications | 2 | |
| `@capawesome/capacitor-badge` | App icon badge count | 2 | |
| `@capacitor/filesystem` | Save scanned receipts to a `Bonnen` folder | 3 | |
| `@capacitor/haptics`, `@capacitor/status-bar`, `@capacitor/keyboard` | Haptics / status bar / keyboard | 0 direct usages found | Installed as standard Capacitor plugins; no direct app-code calls found via static search — likely default/declarative config only |
| `@tinymce/tinymce-react` (TinyMCE) | Rich text editor for email body (`Emails/Edit`) | 1 | No native RN equivalent with matching feature set — see Section 3 |
| `chart.js` / `react-chartjs-2` | Dashboard charts (bar + pie) | 2 (`Dashboard/components/FinancialChart.tsx`, `Dashboard/components/PieChart.tsx`) | Canvas-based, web-only — see Section 3 |
| `dompurify` | Sanitizes an image `src` string before render (`Expenses/Edit`) | 1 | Narrow usage — see Section 3 |
| `@emotion/react`, `@emotion/styled` | CSS-in-JS styling | 5 direct imports | Real styling surface is larger — every Ionic CSS file and co-located `.css` file also needs rethinking, not just these 5 files (see Section 4) |
| `@tanstack/react-query`, `axios` | Server state + HTTP | App-wide | Framework-agnostic — fully portable, no migration risk |
| Vite (+ legacy plugin) | Build tool | N/A | Replaced by Metro (Expo/RN CLI's bundler) |
| Vitest, Testing Library, Cypress | Testing | App-wide | See Section 4 |
```

- [ ] **Step 3: Write Section 2 — RN-equivalent mapping**

Append to the same file:

```markdown
## 2. RN-equivalent mapping

| Dependency | Candidate RN/Expo replacement | Risk | Notes |
|---|---|---|---|
| Ionic components | No 1:1 library — rebuild each screen with RN core components + a UI kit (e.g. React Native Paper, Tamagui, or unstyled + custom design system) | Low risk, high effort | Mechanical but touches all 43 files |
| React Router 5 | React Navigation (stack + tab navigators) | Low | Public/private route split maps cleanly onto navigator groups |
| `@capacitor/camera` | `expo-camera` | Low | Mature, first-party Expo module |
| `capacitor-document-scanner` | No mature 1:1 equivalent. Candidates: `react-native-document-scanner-plugin` (native module, needs `expo prebuild`, not Expo-Go-compatible), or a custom `react-native-vision-camera` frame processor. **Verify the package's current README before use — check it still wraps the edge-detection behavior this plan assumes.** | **High — spike target** | Core business feature; no clean drop-in found |
| `@capacitor-community/image-to-text` (OCR) | `@react-native-ml-kit/text-recognition` (Google ML Kit on Android, Vision framework on iOS), or a vision-camera frame processor with an ML Kit/Vision text recognizer. **Verify current package name/API before use.** | **High — spike target** | Core business feature |
| `@jcesarmobile/capacitor-ocr` | None needed | N/A | Dead dependency, drops out for free |
| `@aparajita/capacitor-biometric-auth` | `expo-local-authentication` | Low | |
| `capacitor-secure-storage-plugin` | `expo-secure-store` | Low | Keychain/Keystore-backed, same security model |
| `@capacitor/push-notifications` + `@capacitor-firebase/messaging` | `expo-notifications` + Firebase, or `@react-native-firebase/messaging` for closer parity with the current Firebase-direct setup | Low | Mature, well-trodden |
| `@capawesome/capacitor-badge` | `expo-notifications` (`setBadgeCountAsync`) | Low | |
| `@capacitor/filesystem` | `expo-file-system` | Low | |
| `@capacitor/haptics` / `status-bar` / `keyboard` | `expo-haptics`, RN's `StatusBar` API, RN's `Keyboard` API | Low | |
| TinyMCE | No native RN rich-text editor matches the plugin/toolbar set used today (see Section 3). Candidates: `10tap-editor`, `react-native-pell-rich-editor`, or a WebView-wrapped editor as a targeted exception. **Verify current package status before use.** | **High — spike target** | Only 1 screen affected — a WebView fallback here is a cheap, targeted exception, not a project-wide compromise |
| chart.js / react-chartjs-2 | Victory Native XL (Skia-based) or `react-native-gifted-charts`. **Verify current package name/API before use.** | **High — spike target** | Need to match: dual-dataset bar chart with currency-formatted tooltips/axis ticks + legend + horizontal scroll, and a 2-slice pie chart with legend |
| dompurify | None needed | N/A | See Section 3 — the current usage pattern has no RN equivalent vulnerability |
| Emotion | RN `StyleSheet`, or a utility-first lib (e.g. NativeWind) if the team wants Tailwind-style authoring | Medium | Bigger than the dependency swap suggests — see Section 4 |
| Vite | Metro (built into Expo/RN CLI) | Low | One-time tooling setup |
| Vitest / Testing Library | Jest + React Native Testing Library | Low | |
| Cypress (E2E) | Detox or Maestro | Medium | Different tooling paradigm (no browser) |
```

- [ ] **Step 4: Write Section 3 — Gap analysis**

Append to the same file. This content reflects the actual code read during this plan's preparation (`src/pages/Emails/Edit/index.tsx`, `src/pages/Dashboard/components/FinancialChart.tsx`, `src/pages/Dashboard/components/PieChart.tsx`, `src/pages/Expenses/Edit/index.tsx`, `src/hooks/useScan.ts`):

```markdown
## 3. Gap analysis

### Rich text editing (TinyMCE)

Used in exactly one screen: `src/pages/Emails/Edit/index.tsx`, for composing an
email body. Configured plugins: `link`, `image`, `table` (a `paste` plugin
import is present but commented out — not active). Toolbar: `undo redo |
formatselect | bold italic | alignleft aligncenter alignright alignjustify |
bullist numlist | link image table | removeformat`. No menubar. Custom
dark/light `content_style` injection.

Of these, **table support** is the hardest to replicate — most lightweight RN
rich-text libraries (anything Pell-based) don't support tables at all. The
spike must explicitly check for table support, not just basic formatting.

Because only one screen is affected, a WebView-wrapped editor (TinyMCE itself,
or any web editor) is a perfectly reasonable targeted exception even in an
otherwise-native RN app — it does not need to block or shape the rest of the
migration.

### Charts (chart.js)

Two components, both in `src/pages/Dashboard/components/`:

- `FinancialChart.tsx` — a grouped bar chart (turnover vs. expenses), with:
  a legend (top), tooltips with a custom callback formatting values as Dutch
  currency, Y-axis ticks also formatted as currency, dark-mode-aware colors,
  and a horizontal scroll container when the label count exceeds
  `DASHBOARD_CHART_MAX_LABELS`.
- `PieChart.tsx` — a 2-slice pie chart (revenue vs. expenses) with a
  bottom legend and a tooltip callback.

Any replacement candidate must support: custom tooltip formatting (a
callback, not just a static label), custom axis tick formatting, and a
legend — not just "renders a chart." This is the bar the spike's chart check
must clear.

### HTML sanitization (dompurify)

Used in exactly one file, `src/pages/Expenses/Edit/index.tsx`, in exactly two
places — both sanitizing a URL string immediately before passing it to an
`<img src>`:

```ts
src={DOMPurify.sanitize(previewUrl)}
src={DOMPurify.sanitize(scanResult.imageUrl)}
```

This is not sanitizing rich HTML content — it's defending against a string
being interpreted as markup when assigned to a DOM attribute. React Native's
`Image` component takes a `{ uri: string }` source object; there is no DOM,
no HTML parsing, and no equivalent injection vector for a URI string. **This
dependency has no RN replacement need — it simply drops out.**

### OCR/scanner dead code note

`src/hooks/useScanDocument.ts` exists alongside the real pipeline
(`src/hooks/useScan.ts`) but calls a hardcoded mock OCR result rather than any
real native plugin — it appears to be unused legacy/test scaffolding, not a
second live code path. Confirm this with a grep for its importers before
treating it as in-scope for migration:

Run: `grep -rl "useScanDocument" src --include="*.ts*"`
```

- [ ] **Step 5: Write Section 4 — Effort estimate by layer**

Append to the same file:

```markdown
## 4. Effort estimate by layer

| Layer | Effort | Risk | Why |
|---|---|---|---|
| UI rewrite (Ionic -> RN) | High | Low | Mechanical, but touches all 43 Ionic-using files across 12 feature areas |
| Navigation (React Router 5 -> React Navigation) | Medium | Low | 27 files reference react-router; concepts map cleanly |
| Styling (Emotion/CSS -> RN StyleSheet or NativeWind) | High | Medium | Bigger than the 5 Emotion files suggest — every co-located `.css` file and Ionic CSS-variable theme also needs rethinking under RN's flexbox-only, no-cascade model |
| Native plugins — camera, biometrics, secure storage, push, badge, filesystem | Low-Medium | Low | ~14 files total; mature 1:1 Expo equivalents for each |
| Native plugins — document scanner + OCR (receipt pipeline) | High | **High** | No mature drop-in; core business feature; spike required |
| Rich text (TinyMCE) | Low (1 file) | Medium | No native equivalent matches the feature set, but a WebView fallback is cheap given the narrow surface |
| Charts (chart.js) | Low (2 files) | Medium | No canvas support in RN; needs a Skia/SVG-based library with matching tooltip/legend/formatting support |
| Sanitization (dompurify) | None | None | Drops out — no RN equivalent vulnerability for this usage pattern |
| Build tooling (Vite -> Metro/Expo) | Medium | Low | One-time setup, well documented |
| Testing (Vitest/RTL/Cypress -> Jest/RNTL/Detox or Maestro) | Medium | Low | Separate setup work, mature tooling on the RN side |
| Native projects (`ios/`, `android/`) | N/A | N/A | Regenerated fresh by Expo/RN CLI, not ported |
```

- [ ] **Step 6: Commit**

```bash
git add specs/2026-06-23-react-native-feasibility/assessment.md
git commit -m "$(cat <<'EOF'
docs: add RN feasibility desk research (stack inventory + gap analysis)

Catalog every Ionic/Capacitor/web-only dependency against a candidate
RN replacement, with real usage counts and feature requirements pulled
from the actual code (not guessed), so the spike targets the genuine
risk surface: the receipt scan pipeline, TinyMCE's table support, and
chart.js's tooltip/legend formatting.
EOF
)"
```

---

## Task 2: Bootstrap the throwaway Expo spike app

**Files (in the separate spike repo, not paperwork-app):**
- Create: `/Users/henry/Projects/devartist/paperwork-rn-spike/` (new Expo project)

- [ ] **Step 1: Scaffold the Expo app**

```bash
cd /Users/henry/Projects/devartist
npx create-expo-app@latest paperwork-rn-spike
cd paperwork-rn-spike
```

Expected: a new Expo TypeScript project at `paperwork-rn-spike/`, with `app/` (or `App.tsx`, depending on the current template), `package.json`, `app.json`.

- [ ] **Step 2: Run prebuild to generate native projects**

```bash
npx expo prebuild
```

Expected: `ios/` and `android/` directories are generated. This is required because the document scanner library (Task 3) is not Expo-Go-compatible and needs native linking.

- [ ] **Step 3: Verify the app runs**

```bash
npx expo run:ios
```

Expected: the default Expo template screen launches in the iOS Simulator. (Use `npx expo run:android` instead/also if iOS tooling isn't set up locally.)

- [ ] **Step 4: Initialize git in the spike repo**

```bash
git init
git add -A
git commit -m "chore: scaffold throwaway Expo spike for RN feasibility check"
```

This repo is throwaway and never merged anywhere — a local git init is only so changes are reviewable/revertable during the spike itself.

---

## Task 3: Spike check — receipt scan pipeline

The highest-risk check: camera capture -> document edge-detect/crop -> OCR text extraction, mirroring what `src/hooks/useScan.ts` does today in paperwork-app.

**Files (spike repo):**
- Create: `app/scan-check.tsx` (or equivalent screen per the template's routing)

**Success criteria (write the verdict against these, don't guess):**
1. Can capture a photo of a real paper receipt via the device camera.
2. The captured image is cropped/deskewed to the document bounds (not just a raw rectangular photo).
3. OCR produces text output that, read by eye, roughly matches the receipt's actual text (vendor name, total, date legible).

- [ ] **Step 1: Install candidate libraries**

```bash
npx expo install expo-camera
npm install react-native-document-scanner-plugin
npm install @react-native-ml-kit/text-recognition
npx expo prebuild
```

If either package name has changed or no longer exists, search npm for its current name/successor before substituting — note the substitution in the verdict write-up (Task 6).

- [ ] **Step 2: Build the capture + scan + OCR screen**

```tsx
import { useState } from "react";
import { View, Text, Button, Image, ScrollView } from "react-native";
import DocumentScanner from "react-native-document-scanner-plugin";
import TextRecognition from "@react-native-ml-kit/text-recognition";

export default function ScanCheck() {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [rawText, setRawText] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const runScan = async () => {
    setError(null);
    try {
      const { scannedImages } = await DocumentScanner.scanDocument({
        maxNumDocuments: 1,
      });
      if (!scannedImages?.length) {
        setError("No document captured");
        return;
      }
      const uri = scannedImages[0];
      setImageUri(uri);

      const result = await TextRecognition.recognize(uri);
      setRawText(result.text);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
      <Button title="Scan receipt" onPress={runScan} />
      {error && <Text style={{ color: "red" }}>{error}</Text>}
      {imageUri && (
        <Image source={{ uri: imageUri }} style={{ width: "100%", height: 300 }} resizeMode="contain" />
      )}
      {rawText && <Text>{rawText}</Text>}
    </ScrollView>
  );
}
```

Note: exact import paths/APIs for `react-native-document-scanner-plugin` and `@react-native-ml-kit/text-recognition` may differ from this snippet by the time this runs — check each library's current README and adjust before treating a failure as a feasibility finding rather than an API-mismatch bug.

- [ ] **Step 3: Run on a real device with a real receipt**

```bash
npx expo run:ios --device
```

Physically photograph a real paper receipt (simulators don't have a usable camera for this). Record, against the three success criteria above: pass / partial / fail, with what specifically worked or didn't (e.g. "cropped correctly but OCR missed the total line").

---

## Task 4: Spike check — rich text editor

**Files (spike repo):**
- Create: `app/editor-check.tsx`

**Success criteria:**
1. Bold, italic, and alignment (left/center/right/justify) all work.
2. Bullet and numbered lists work.
3. Inserting a link works.
4. Inserting an image works.
5. **Inserting/editing a table works** — this is the feature most likely to fail; the actual TinyMCE config in paperwork-app includes a `table` plugin and toolbar button.

- [ ] **Step 1: Install the primary candidate**

```bash
npm install 10tap-editor
```

If unavailable or abandoned, fall back to:

```bash
npm install react-native-pell-rich-editor
```

Note in the verdict (Task 6) which one was actually tested.

- [ ] **Step 2: Build the editor screen**

```tsx
import { useState } from "react";
import { View, Text } from "react-native";
import { RichText, Toolbar, useEditorBridge } from "10tap-editor";

export default function EditorCheck() {
  const editor = useEditorBridge({
    autofocus: true,
    avoidIosKeyboard: true,
    initialContent: "<p>Test the editor here</p>",
  });

  return (
    <View style={{ flex: 1 }}>
      <Text style={{ padding: 8 }}>
        Manually test: bold/italic, alignment, bullet/numbered lists, link
        insert, image insert, table insert/edit.
      </Text>
      <RichText editor={editor} />
      <Toolbar editor={editor} />
    </View>
  );
}
```

Verify the current `10tap-editor` API against its README before relying on this snippet verbatim — rich-text editor APIs change more than most libraries.

- [ ] **Step 3: Manually test each of the 5 success criteria**

Run the app, open the editor screen, and go through bold/italic, alignment, lists, link insert, image insert, and table insert/edit one at a time. Record a pass/partial/fail per item — table support is the one most likely to be a hard "fail," and that's a legitimate, useful finding, not a setup mistake.

---

## Task 5: Spike check — charts

**Files (spike repo):**
- Create: `app/chart-check.tsx`

**Success criteria (matching the real usage found in Task 1, Section 3):**
1. A grouped bar chart renders with two datasets (e.g. turnover vs. expenses).
2. Tapping/hovering a bar shows a tooltip with a custom-formatted value (not just the raw number).
3. A legend is visible and labeled per dataset.
4. A pie chart renders with two slices and a legend.

- [ ] **Step 1: Install the primary candidate**

```bash
npm install victory-native @shopify/react-native-skia
npx expo prebuild
```

If `victory-native`'s Skia-based ("XL") API differs from what's below, or installation fails, fall back to:

```bash
npm install react-native-gifted-charts react-native-svg
```

Note in the verdict (Task 6) which one was actually tested.

- [ ] **Step 2: Build the chart screen**

```tsx
import { View, Text } from "react-native";
import { CartesianChart, Bar, Pie, PolarChart } from "victory-native";

const barData = [
  { month: "Jan", turnover: 1200, expenses: 800 },
  { month: "Feb", turnover: 1500, expenses: 900 },
  { month: "Mar", turnover: 1100, expenses: 950 },
];

const pieData = [
  { value: 4200, color: "rgba(54, 162, 235, 1)", label: "Omzet" },
  { value: 2600, color: "rgba(255, 99, 132, 1)", label: "Uitgaven" },
];

export default function ChartCheck() {
  return (
    <View style={{ flex: 1, padding: 16, gap: 24 }}>
      <Text>Bar chart — check tooltip formatting and legend manually</Text>
      <View style={{ height: 250 }}>
        <CartesianChart data={barData} xKey="month" yKeys={["turnover", "expenses"]}>
          {({ points }) => (
            <>
              <Bar points={points.turnover} chartBounds={{ left: 0, right: 0, top: 0, bottom: 0 }} color="rgba(54, 162, 235, 1)" />
              <Bar points={points.expenses} chartBounds={{ left: 0, right: 0, top: 0, bottom: 0 }} color="rgba(255, 99, 132, 1)" />
            </>
          )}
        </CartesianChart>
      </View>
      <Text>Pie chart — check legend manually</Text>
      <View style={{ height: 250 }}>
        <PolarChart data={pieData} labelKey="label" valueKey="value" colorKey="color">
          <Pie.Chart />
        </PolarChart>
      </View>
    </View>
  );
}
```

Verify the current `victory-native` (XL/Skia) API against its README — this library's API has changed significantly across versions and the snippet above may need adjustment (e.g. `chartBounds` is frequently auto-computed in current versions).

- [ ] **Step 3: Manually test each of the 4 success criteria**

Record a pass/partial/fail per criterion, with specifics (e.g. "bars render but tooltip shows raw number, not currency-formatted — would need a custom tooltip component").

---

## Task 6: Fold spike findings into the assessment doc + final recommendation

**Files:**
- Modify: `specs/2026-06-23-react-native-feasibility/assessment.md` (append Sections 5-6)

**Interfaces:**
- Consumes: the pass/partial/fail verdicts and notes recorded in Tasks 3, 4, and 5.

- [ ] **Step 1: Write Section 5 — Spike findings**

Append to `assessment.md`, filling in the actual verdicts and notes recorded during Tasks 3-5 (do not write this section until those tasks have real results — there is nothing to fold in before then):

```markdown
## 5. Spike findings

### Receipt scan pipeline

Library tested: <react-native-document-scanner-plugin / actual substitute used> +
<@react-native-ml-kit/text-recognition / actual substitute used>

| Criterion | Verdict | Notes |
|---|---|---|
| Camera capture | pass/partial/fail | |
| Crop/deskew to document bounds | pass/partial/fail | |
| OCR text quality (by eye, vs. real receipt) | pass/partial/fail | |

### Rich text editor

Library tested: <10tap-editor / actual substitute used>

| Criterion | Verdict | Notes |
|---|---|---|
| Bold/italic | pass/partial/fail | |
| Alignment | pass/partial/fail | |
| Lists | pass/partial/fail | |
| Link insert | pass/partial/fail | |
| Image insert | pass/partial/fail | |
| Table insert/edit | pass/partial/fail | |

### Charts

Library tested: <victory-native / actual substitute used>

| Criterion | Verdict | Notes |
|---|---|---|
| Grouped bar chart, two datasets | pass/partial/fail | |
| Custom-formatted tooltip | pass/partial/fail | |
| Legend | pass/partial/fail | |
| Pie chart with legend | pass/partial/fail | |
```

- [ ] **Step 2: Write Section 6 — Recommendation**

Append to `assessment.md`. Base the go/no-go directly on the Section 5 verdicts — if any of the three risk areas came back "fail" with no viable fallback identified during the spike, that should weigh heavily against "go," per the design doc's framing that this is the app's core feature (receipt scanning) or a cheap targeted exception (rich text, charts):

```markdown
## 6. Recommendation

<State go / no-go plainly in the first sentence.>

<If go: state the broad shape only — e.g. "full rewrite released as a v2,
single cutover" vs. an alternative — not a phased plan. The phased plan is
its own follow-up spec/plan cycle.>

<If no-go: state which spike finding(s) drove that conclusion, and what
would need to change (a library maturing, a different approach to the
receipt pipeline, etc.) to revisit this later.>
```

- [ ] **Step 3: Commit**

```bash
git add specs/2026-06-23-react-native-feasibility/assessment.md
git commit -m "$(cat <<'EOF'
docs: add RN spike findings and final feasibility recommendation

Fold the throwaway Expo spike's pass/fail verdicts for the receipt scan
pipeline, rich text editor, and chart rendering into the assessment, and
state a go/no-go recommendation based on what was actually observed.
EOF
)"
```

---

## Task 7: Final verification

**Files:** none

- [ ] **Step 1: Confirm the assessment doc has all 6 sections**

Run: `grep -E "^## [0-9]" specs/2026-06-23-react-native-feasibility/assessment.md`
Expected: six lines, `## 1.` through `## 6.`, in order.

- [ ] **Step 2: Confirm no unresolved placeholders remain**

Run: `grep -n "pass/partial/fail\|<.*>" specs/2026-06-23-react-native-feasibility/assessment.md`
Expected: no output. (If this matches anything, Section 5 or 6 still has template text that was never filled in with real findings — go back and fill it in before treating this plan as complete.)

- [ ] **Step 3: Confirm paperwork-app's working tree is clean**

Run: `git status`
Expected: clean working tree on `docs/react-native-feasibility-spec`.

- [ ] **Step 4: Report**

Summarize the recommendation (Section 6) back to the user. Do not push or open a PR without explicit authorization. Note the spike repo's path so the user can inspect or delete it.

---

## Self-review notes

- **Spec coverage:** design.md's two deliverables (assessment doc, spike) map to Tasks 1-2 (setup) through 6 (fold-in); all three named risk areas (receipt pipeline, rich text, charts) get their own task (3, 4, 5); the design's non-goals (no app code changes, no phased migration plan, no Expo-vs-bare-RN production decision) are respected — Section 6 explicitly defers the phased plan.
- **No placeholders except where empirically unknowable:** Sections 1-4 are fully written with real content verified against the actual codebase. Sections 5-6 contain template structure, not invented findings — those depend on running the spike, which is the point of Tasks 3-5.
- **Naming consistency:** `assessment.md`, its 6 section headers, and the file's location (`specs/2026-06-23-react-native-feasibility/`) are used consistently across all tasks.

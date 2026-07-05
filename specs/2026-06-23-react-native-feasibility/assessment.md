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

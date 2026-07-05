# Paperwork — Mobile App

[![CI](https://github.com/HenryCordes/paperwork-app-public/actions/workflows/ci.yml/badge.svg)](https://github.com/HenryCordes/paperwork-app-public/actions/workflows/ci.yml)
[![License: view-only](https://img.shields.io/badge/license-view--only-red)](LICENSE)
&nbsp;






![React](https://img.shields.io/badge/React%2019-20232A?logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![Ionic](https://img.shields.io/badge/Ionic%20React-3880FF?logo=ionic&logoColor=white)
![Capacitor](https://img.shields.io/badge/Capacitor-119EFF?logo=capacitor&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=white)

**The native mobile companion to [Paperwork](https://paper-work.nl) — Dutch bookkeeping for small businesses and the self-employed.** Snap a receipt and on-device OCR pulls out the date, total and BTW (VAT); review your quarterly VAT filing risks on the go.

**Website:** [paper-work.nl](https://paper-work.nl) · **Live app:** [app.paper-work.nl](https://app.paper-work.nl) (login required)
**Get the app:** [App Store](https://apps.apple.com/us/app/paperwork/id6746358088) · [Google Play](https://play.google.com/store/apps/details?id=nl.paperwork.app)

I designed and built Paperwork end to end — product, architecture, backend, web frontend and this native app — as part of my independent practice, **Dev Artist**. The companion web/API codebase is at **[paperwork-public](https://github.com/HenryCordes/paperwork-public)**.

> **Portfolio note.** This is a public, read-only snapshot of a private production codebase, published as a work sample. It is **source-available for viewing only** — see [LICENSE](LICENSE). Firebase config, signing material and customer data are not included.

## What it does

- **Receipt scanning** — capture a receipt with the camera; on-device OCR extracts date, total and BTW (both 9% and 21% rates), tuned for real Dutch receipt layouts
- **BTW (VAT) pre-check on mobile** — view the latest quarterly filing-risk report, run a check on demand, and toggle which checks run and how you're notified
- **Biometric authentication** — Face ID / fingerprint login with a secure, opt-in flow
- **Sync** — captured receipts and their data flow to the Paperwork API

## Feature highlights

### 📸 On-device receipt OCR

Receipts are scanned with the device camera and parsed **on-device** (`@capacitor-community/image-to-text`) — no image leaves the phone for the extraction step. The parser is tuned for real Dutch receipt formats, prioritising date detection (ISO and `DD-MM-YYYY`), total detection (`totaal`/`total` keywords), and 9% / 21% BTW amounts. The extracted fields are reviewed by the user before syncing to the Paperwork API.

### 🔍 BTW pre-check, on the phone

The mobile half of Paperwork's [agentic BTW pre-check](https://github.com/HenryCordes/paperwork-public#-agentic-btw-pre-check): the app surfaces each quarter's findings (missing documents, VAT arithmetic issues, likely duplicates, and LLM-detected history anomalies) as a report card on the Taxes page, lets the user trigger a run on demand, and edits per-check and per-notification-channel preferences — wired against the live `/api/btw-precheck` contract. Findings carry a severity and Dutch copy, mapping cleanly onto Ionic's card/toggle patterns.

*Design: [`specs/2026-07-04-btw-precheck/design.md`](specs/2026-07-04-btw-precheck/design.md)*

### 🔐 Biometric authentication

Opt-in Face ID / fingerprint login built as a **loosely-coupled service + hook** so the underlying plugin can be swapped without touching callers. Credentials are stored encrypted in Capacitor Preferences and cleared when biometrics are disabled; auth re-triggers on cold start, session timeout and app-resume, with password fallback always available.

## Built with

- **React 19 · TypeScript · Ionic React** — cross-platform UI
- **Capacitor** — native iOS & Android, camera, biometrics, push
- **Vite** — build tooling
- **Testing:** Vitest · React Testing Library (unit/component) · Cypress (e2e)
- **CI:** GitHub Actions on every push and PR

## Architecture & engineering

Design specs live in [`specs/`](specs/) and supporting notes in [`docs/`](docs/). The app is fully typed, component- and unit-tested with Vitest + React Testing Library, end-to-end tested with Cypress, and gated by GitHub Actions CI. Native iOS and Android projects are included to show the full Capacitor integration.

<details>
<summary><strong>Running & building locally</strong> (for reference — this is a view-only snapshot)</summary>

**Prerequisites:** Node 16+, npm 8+. iOS builds need Xcode 14+; Android needs Android Studio + SDK 33+.

```bash
npm install
npm run run:web        # web dev
npm run run:ios        # iOS (device/simulator)
npm run run:android    # Android
```

**Tests:** `npm run test.unit` (Vitest) · `npm run test.unit.coverage` · `npm run test.e2e` (Cypress) · `npm run typecheck` · `npm run lint`

**Android OCR / Firebase:** the Android OCR path needs a Firebase `google-services.json` in `android/app/` — create a Firebase project, add an Android app with package `nl.paperwork.app`, and drop in your own file (not committed).

</details>

## Status

Live on the **[App Store](https://apps.apple.com/us/app/paperwork/id6746358088)** and **[Google Play](https://play.google.com/store/apps/details?id=nl.paperwork.app)**, companion to **[paper-work.nl](https://paper-work.nl)**.

---

Built by **Henry Cordes** — [devartist.nl](https://devartist.nl) · [LinkedIn](https://www.linkedin.com/in/henrycordes)

_Source-available for viewing and evaluation only. Not open source — see [LICENSE](LICENSE)._

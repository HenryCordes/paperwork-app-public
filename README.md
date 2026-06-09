# Paperwork — Mobile App

[![License: view-only](https://img.shields.io/badge/license-view--only-red)](LICENSE)

**Receipt-scanning companion for Paperwork — Dutch bookkeeping for small businesses and the self-employed.** Snap a receipt, and OCR extracts the date, total and BTW (VAT) automatically.

[paper-work.nl](https://paper-work.nl)

**Built with:** React 19 · TypeScript · Ionic React · Capacitor (native iOS & Android) · Vite

<!-- Add 1–2 screenshots or a short screen recording here — for a mobile app, visuals matter even more than for web. Don't show real customer data. -->

## Overview

This mobile application is part of the [Paper-work](https://paper-work.nl/) ecosystem, a complete bookkeeping solution for small businesses and self-employed professionals in the Netherlands. The app specializes in scanning receipts and automatically extracting critical information such as dates, total amounts, and tax values.

### Key Features

- **Receipt Scanning**: Quickly capture receipts using your device's camera
- **Automatic Information Extraction**: Advanced OCR technology identifies and extracts:
  - Date of transaction
  - Total amount
  - BTW (VAT) amounts (both 9% and 21% rates)
- **Data Synchronization**: All captured receipts and their information are stored in the Paper-work database via the API
- **Support for Dutch Receipts**: Optimized for various Dutch receipt formats from different establishments
- **Biometric Authentication**: Secure login using facial recognition or fingerprint scanning (based on device capabilities)

## How it Fits in the Paper-work Ecosystem

Paper-work helps small businesses with:

- Creating professional invoices
- Managing tax obligations and preparing tax returns
- Tracking business expenses with this receipt scanning app
- Saving valuable time on administrative tasks

As Paper-work states: "Steek de kostbare tijd die je hebt in datgene waar je goed in bent" (Invest your valuable time in what you're good at).

## Installation

```bash
npm install
```

## Running the Application

```bash
# iOS
npm run run:ios

# Android
npm run run:android

# Web (for development)
npm run run:web
```

## Biometric Authentication Flow

The app features a comprehensive biometric authentication system:

- **Opt-in Process**: After first login with username/password, users are prompted to enable biometric authentication
- **Available Biometrics**: Automatically detects and offers the appropriate biometric method (Face ID or fingerprint) based on device capabilities
- **Secure Credential Storage**: Credentials are securely stored and only accessible through biometric verification
- **Login Scenarios**:
  - **App Startup**: Biometric authentication triggers automatically when app starts if enabled
  - **After Logout**: Biometric login is available via a manual button but never triggers automatically after logout
  - **After Session Timeout**: Authentication is required after app has been inactive for a set period
  - **App Resume**: Authentication is required when returning to the app after it's been in the background
- **Security Measures**:
  - Biometric credentials are cleared when biometrics are disabled
  - Session timeout ensures security during periods of inactivity
  - Manual login is always available as a fallback

## Technology Stack

- Ionic React for cross-platform mobile development
- Capacitor for native device features
- @capacitor-community/image-to-text for OCR capabilities

## Future Developments

In upcoming versions, the app will provide users with more insights into their finances, mirroring the comprehensive analytics available in the web application. This includes expense categorization, trend analysis, and business performance metrics.

## About Paper-work

Paper-work is a Dutch bookkeeping solution designed specifically for small businesses and self-employed professionals. It provides user-friendly interfaces for managing finances, creating professional invoices with proper branding, and simplifying tax reporting requirements.

For more information, visit [paper-work.nl](https://paper-work.nl/).

## Development Guidelines

### Setup Requirements

- Node.js (v16+)
- npm (v8+)
- iOS development requires a Mac with Xcode 14+
- Android development requires Android Studio with SDK 33+

### Firebase Configuration for Android

The OCR functionality on Android requires a valid Firebase configuration:

1. Create a Firebase project at [firebase.google.com](https://firebase.google.com/)
2. Add an Android app with package name `nl.paperwork.app`
3. Download `google-services.json` and place it in the `android/app/` directory

### Development Best Practices

#### Biometric Authentication

- The app uses `@aparajita/capacitor-biometric-auth` plugin for biometric authentication
- Biometric authentication is opt-in and presented to users after their first successful login
- A loosely coupled architecture (service + hook) allows for easy replacement of the biometric plugin if needed
- Credentials are securely stored in Capacitor's Preferences API (encrypted on device)
- Biometric types are mapped internally to ensure type safety between the plugin and application
- Support for both facial recognition and fingerprint scanning based on device capabilities
- Users can fallback to password authentication if biometrics fail or are unavailable

#### Receipt Processing

- When modifying the receipt extraction logic in `hooks.ts`, ensure you test with various receipt formats
- Support for multiple Dutch receipt layouts is essential (currently supported: McDonald's, Kwalitaria, Het Brummens Friethuis, Expert)
- The extraction algorithm should prioritize:
  - Date detection (both ISO and European DD-MM-YYYY formats)
  - Total amount detection (keywords: "totaal", "total", etc.)
  - Tax amount detection (9% and 21% BTW values)

#### OCR Handling

- On iOS, avoid using live reload (`-l` flag) as it interrupts OCR processing
- Log OCR results for debugging but remove extensive logging in production builds
- Handle OCR failures gracefully with user-friendly error messages

#### UI Development

- Follow Ionic component patterns for consistency
- Design for both iOS and Android with platform-specific adjustments
- Keep the interface simple and task-focused
- Maintain a responsive layout that works across different device sizes

### Testing

- Test OCR functionality with real receipt images
- Verify extraction accuracy across different receipt formats
- Test on both iOS and Android devices (not just simulators/emulators)
- Test biometric authentication on physical devices with biometric capabilities (Face ID, Touch ID, fingerprint scanners)

### Deployment

- Update version numbers in `scripts/update-version.js` before building production versions
  - Run `npm run update-version <version> <iOSbuildNumber> <AndroidbuildNumber:optional>`
    - version is required
    - iOSbuildNumber is required
    - AndroidbuildNumber is optional, if not provided, the build number will be incremented by 1
- iOS builds can be distributed via TestFlight or App Store using Xcode
  - Execute: `npm run run:ios`
  - Product > Archive
  - Open Organizer
  - Select the build
  - Distribute App
- Android builds can be distributed via Google Play or internal testing channels using Android Studio
  - Execute: `npm run build:android:prod`
  - Open android Studio and the android folder
  - Build > Generate Signed Bundle / APK (after creating keystore and certificate)
  - Copy generated aab file to Google Play internal testing track

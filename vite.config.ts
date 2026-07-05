/// <reference types="vitest" />

import legacy from "@vitejs/plugin-legacy";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), legacy()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./src/setupTests.ts",
    env: { TZ: "UTC" },
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      all: true,
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/**/*.d.ts",
        "src/main.tsx",
        "src/setupTests.ts",
        "src/vite-env.d.ts",
        "src/theme/**",
        "src/**/*.test.{ts,tsx}",
        "src/__tests__/**",
      ],
      // Report-only target. Uncomment to ENFORCE only once the suite measures
      // >= every number below (see specs/2026-06-09-unit-test-expansion/design.md).
      // branches is lower because v8 counts phantom JSX/optional-chaining branches.
      // thresholds: {
      //   lines: 60,
      //   statements: 60,
      //   functions: 60,
      //   branches: 50,
      // },
    },
  },
  server: {
    hmr: {
      timeout: 60000, // Increase timeout to 60 seconds
    },
  },
});

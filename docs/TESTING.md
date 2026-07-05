# Testing

> Read this when writing or changing tests.

## Tools

- **Vitest** (`npm run test.unit`, watch via `npm run test.unit.watch`) — unit
  tests for hooks and utility functions. jsdom environment; setup in
  `src/setupTests.ts`. Config in `vite.config.ts`.
- **Testing Library** (`@testing-library/react`) — component tests.
- **Cypress** (`npm run test.e2e`) — end-to-end tests for critical user flows.

## Practices

- Follow the **AAA** pattern (Arrange, Act, Assert).
- Test **behavior**, not implementation details.
- Mock API calls and other external dependencies.
- Cover edge cases and error scenarios.
- Tests live in `src/__tests__/`, mirroring the source structure.

## Receipt parsing

The receipt parser has the deepest coverage — fixture-based regression tests in
`src/__tests__/hooks/receipt-parsing/`. See RECEIPT_PARSING.md.

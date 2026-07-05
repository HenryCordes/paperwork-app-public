# Frontend: Components, Styling & Performance

> Read this when building or changing UI components, styling, or optimizing
> render/list performance.

## Component design

- Functional components with hooks only (no class components).
- Small, focused components with a single responsibility.
- Strongly type props and state — no `any`.
- Keep business logic out of components; move it to custom hooks (see
  STATE_MANAGEMENT.md).
- Use Ionic components for UI where appropriate; plain HTML where it is
  sufficient (don't over-reach for Ionic when a `<div>` does the job).
- Wrap components in error boundaries; implement explicit loading and error
  states for every async operation.
- Ensure responsive design across device sizes and orientations.

## Styling

- Combination of traditional `.css` files and Emotion styled components.
- Mobile-first.
- Theme values via CSS variables in `src/theme/variables.css`. Maintain consistent
  spacing, colors, and typography.
- Keep component-specific styles next to their component.
- Class names describe **purpose**, not appearance.

## Performance

- `React.memo` for genuinely expensive renders (measure first).
- `useCallback` / `useMemo` where they remove real work — not by reflex.
- Paginate large lists; virtualize long lists.
- Lean on React Query caching rather than refetching.
- Optimize images/assets for mobile; keep bundle size down by avoiding
  unnecessary dependencies.

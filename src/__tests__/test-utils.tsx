import { ReactElement, ReactNode } from "react";
import { render, RenderOptions } from "@testing-library/react";
import { renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";

/**
 * Build a QueryClient with retries off so error/empty branches resolve fast.
 */
export const makeTestQueryClient = (): QueryClient =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });

interface ProvidersOptions {
  client?: QueryClient;
  initialEntries?: string[];
}

const buildWrapper = ({ client, initialEntries }: ProvidersOptions) => {
  const queryClient = client ?? makeTestQueryClient();
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={initialEntries ?? ["/"]}>
        {children}
      </MemoryRouter>
    </QueryClientProvider>
  );
};

/**
 * Render a component inside the app's providers (React Query + Router).
 * Wrap with feature contexts (ToastProvider/AuthProvider) inside `ui` when a
 * component needs them.
 */
export const renderWithProviders = (
  ui: ReactElement,
  options: ProvidersOptions & Omit<RenderOptions, "wrapper"> = {}
) => {
  const { client, initialEntries, ...rtl } = options;
  return render(ui, { wrapper: buildWrapper({ client, initialEntries }), ...rtl });
};

/**
 * Render a hook inside React Query (+ Router) for hook tests.
 */
export const renderHookWithClient = <TProps, TResult>(
  hook: (props: TProps) => TResult,
  options: ProvidersOptions = {}
) => {
  const { client, initialEntries } = options;
  return renderHook(hook, { wrapper: buildWrapper({ client, initialEntries }) });
};

// eslint-disable-next-line react-refresh/only-export-components -- test-utils barrel file, not app code; Fast Refresh doesn't apply to the test runtime
export * from "@testing-library/react";
export { default as userEvent } from "@testing-library/user-event";

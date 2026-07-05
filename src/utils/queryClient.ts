import { QueryClient } from '@tanstack/react-query';

// Create a custom QueryClient with configuration
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1, // Only retry failed queries once by default
      staleTime: 5 * 60 * 1000, // Data considered fresh for 5 minutes
      gcTime: 10 * 60 * 1000, // Cache data for 10 minutes (formerly cacheTime in v4)
    },
    mutations: {
      retry: 0, // Don't retry mutations by default
    },
  },
});

export default queryClient;

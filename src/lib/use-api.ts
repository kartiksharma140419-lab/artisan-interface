import { useQuery, type UseQueryOptions } from "@tanstack/react-query";

/**
 * Client-only read of a backend endpoint. The Python backend is not reachable
 * during SSR/prerender, so every read is gated on the browser and failures are
 * surfaced honestly rather than retried into a spinner.
 */
export function useApi<T>(
  key: readonly unknown[],
  fn: () => Promise<T>,
  options?: Partial<UseQueryOptions<T, Error>>,
) {
  return useQuery<T, Error>({
    queryKey: key,
    queryFn: fn,
    retry: false,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    ...options,
  });
}

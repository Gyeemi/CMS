/**
 * Supabase auth-js logs `console.error` when `fetch` throws (e.g. "Failed to fetch").
 * Return a synthetic 503 response instead so callers handle it without console noise.
 */
export function createResilientFetch(
  baseFetch: typeof fetch = globalThis.fetch.bind(globalThis),
): typeof fetch {
  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    try {
      return await baseFetch(input, init);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Network request failed';
      return new Response(
        JSON.stringify({
          error: 'network_error',
          error_description: message,
        }),
        {
          status: 503,
          statusText: 'Service Unavailable',
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }
  };
}

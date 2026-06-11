import { createResilientFetch } from '@/lib/supabase/resilient-fetch';

declare global {
  // eslint-disable-next-line no-var
  var __groovxResilientFetchInstalled: boolean | undefined;
  // eslint-disable-next-line no-var
  var __groovxNativeConsoleError: typeof console.error | undefined;
}

/**
 * Patch global fetch before Supabase initializes so auth-js never hits
 * `console.error` on network failures ("Failed to fetch").
 */
if (typeof globalThis !== 'undefined' && !globalThis.__groovxResilientFetchInstalled) {
  const nativeFetch =
    typeof globalThis.fetch === 'function' ? globalThis.fetch.bind(globalThis) : null;

  if (nativeFetch) {
    globalThis.fetch = createResilientFetch(nativeFetch);
    globalThis.__groovxResilientFetchInstalled = true;
  }

  // Supabase auth-js logs raw fetch TypeErrors before our handlers can catch them.
  if (__DEV__ && !globalThis.__groovxNativeConsoleError) {
    const nativeConsoleError = console.error.bind(console);
    globalThis.__groovxNativeConsoleError = nativeConsoleError;

    console.error = (...args: unknown[]) => {
      const first = args[0];
      const message =
        first instanceof Error
          ? first.message
          : typeof first === 'string'
            ? first
            : '';

      if (message === 'Failed to fetch' || message.includes('AuthRetryableFetchError')) {
        return;
      }

      nativeConsoleError(...args);
    };
  }
}

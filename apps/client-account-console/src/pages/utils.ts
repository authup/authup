/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { extractErrorContext, injectStore, useErrorTranslator } from '@authup/client-web-kit';
import { useToast } from '@vuecs/overlays';
import { ref } from 'vue';

/**
 * Toast surface for the account pages: `success(text)` and `error(e)`,
 * the latter localized via the kit's error translator. Must be called
 * synchronously during `setup()` — both wrapped composables inject().
 */
export function useAccountToasts() {
    const toast = useToast();
    const translateError = useErrorTranslator();

    return {
        success: (description: string) => {
            toast.add({ description, color: 'success' });
        },
        error: async (error: unknown) => {
            toast.add({
                description: await translateError(error),
                color: 'error',
            });
        },
    };
}

/**
 * Error state for a page's own data load: the page replaces its content
 * with a message plus a retry control instead of leaving a blank surface
 * behind a toast that fades. Action failures (a revoke, a disconnect)
 * keep using the toasts above; they leave the page intact.
 *
 * A 401 is deliberately not retryable: the session is gone, so it goes
 * through the logout flow the router guard would run on the next
 * navigation anyway, which drops the shell for the sign-in state. The
 * kit's auth hook already covers the common case (a failed background
 * refresh unsets the header, which the kit answers with a logout); this
 * catches the request that still 401s after it, and the case where the
 * store holds no refresh token to retry with at all. Without it a retry
 * against a dead session just 401s again, forever.
 *
 * `capture` takes an optional sink for a failure that must not take the
 * whole page with it (a nested collection inside one row). The 401 rule
 * has to reach those too, so it lives here rather than at the call site.
 *
 * Must be called synchronously during `setup()`: `injectStore()` injects.
 */
export function usePageError() {
    const store = injectStore();
    const error = ref<Error | null>(null);

    const reset = () => {
        error.value = null;
    };

    const capture = async (e: unknown, sink?: (value: Error) => void) => {
        if (extractErrorContext(e).status === 401) {
            await store.logout();
            return;
        }

        // Coercing keeps the ref's type honest: nothing renders the value,
        // so a thrown non-Error would otherwise sit behind an `Error` type
        // it does not satisfy.
        const value = e instanceof Error ? e : new Error(String(e));

        if (sink) {
            sink(value);
            return;
        }

        error.value = value;
    };

    return {
        error, 
        capture, 
        reset, 
    };
}

/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { useErrorTranslator } from '@authup/client-web-kit';
import { useToast } from './toast';

/**
 * Sibling of `useToast()` for errors: returns `{ show }`, where
 * `show(error)` surfaces a caught error as a localized warning toast.
 * Centralizes the `toast.show({ variant: 'warning', body: e.message })`
 * block every entity page repeated, now routed through
 * `useErrorTranslator()` so the message follows the active locale.
 *
 * MUST be called synchronously during `setup()` (before any `await` in an
 * `async setup`): `useErrorTranslator()` resolves the ilingo instance via
 * `inject()`, which throws once the setup context is lost after an await.
 * `useToast()` is captured here too so the returned `show` injects nothing.
 */
export function useErrorToast() {
    const translateError = useErrorTranslator();
    const toast = useToast();

    return {
        show: async (error: unknown) => {
            toast.show({
                variant: 'warning',
                body: await translateError(error),
            });
        },
    };
}

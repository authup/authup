/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { useErrorTranslator } from '@authup/client-web-kit';
import { useToast } from '@vuecs/overlays';

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

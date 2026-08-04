/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ColorMode } from '@vuecs/design';
import { bindColorMode, isColorMode } from '@vuecs/design';
import { computed } from 'vue';
import { createCookieRef } from './cookie';

const COOKIE_NAME = 'vc-color-mode';

/**
 * Non-Nuxt counterpart of `@vuecs/nuxt`'s `useColorMode()`: the same
 * `vc-color-mode` cookie (shared with client-admin-console on a common origin)
 * feeding `bindColorMode` from `@vuecs/design`. Server-side the cookie
 * is read by `renderUIPage`, which injects the `.dark`/`.light` class
 * into the HTML shell and seeds `payload.config.colorMode` so this ref
 * hydrates consistently.
 */
export function createColorMode(initial?: string) {
    const source = createCookieRef(COOKIE_NAME, initial, 'system');
    const mode = computed<ColorMode>({
        get: () => (isColorMode(source.value) ? source.value : 'system'),
        set(value) {
            source.value = value;
        },
    });

    return bindColorMode(mode);
}

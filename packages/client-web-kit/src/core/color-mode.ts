/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ColorMode } from '@vuecs/design';
import { bindColorMode, isColorMode } from '@vuecs/design';
import { computed } from 'vue';
import { COLOR_MODE_COOKIE, COLOR_MODE_UNSET, createCookieRef } from './cookie';

/**
 * Non-Nuxt counterpart of `@vuecs/nuxt`'s `useColorMode()`: the shared
 * `vc-color-mode` cookie feeding `bindColorMode` from `@vuecs/design`.
 * One cookie name across every authup console, so the mode carries over
 * between surfaces served from a common origin.
 *
 * Where a server stamps the `.dark`/`.light` class onto the HTML shell
 * from the same cookie, pass its value as `initial` so this ref agrees
 * with the markup and nothing flashes before it takes over.
 */
export function createColorMode(initial?: string) {
    const source = createCookieRef(COLOR_MODE_COOKIE, initial, COLOR_MODE_UNSET);
    const mode = computed<ColorMode>({
        get: () => (isColorMode(source.value) ? source.value : 'system'),
        set(value) {
            source.value = value;
        },
    });

    return bindColorMode(mode);
}

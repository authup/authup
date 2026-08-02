/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { bindColorMode } from '@vuecs/design';
import { createCookieRef } from './cookie';

const COOKIE_NAME = 'vc-color-mode';

/**
 * Non-Nuxt counterpart of `@vuecs/nuxt`'s `useColorMode()`: the same
 * `vc-color-mode` cookie (shared with the auth pages on the IdP origin)
 * feeding `bindColorMode` from `@vuecs/design`. When server-core serves
 * the bundle it stamps the `.dark`/`.light` class onto the HTML shell
 * from the cookie, so there is no flash before this ref takes over.
 */
export function createColorMode(initial?: string) {
    return bindColorMode(createCookieRef(COOKIE_NAME, initial, 'system'));
}

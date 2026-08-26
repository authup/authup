/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

/**
 * The locale and color-mode cookies every authup console on an origin
 * shares (`@vuecs/locale` and `@vuecs/design` own them client-side).
 * They are spelled here so the SSR shell and the SPA shells cannot stamp
 * a different pair.
 */
export const LOCALE_COOKIE = 'vc-locale';

export const COLOR_MODE_COOKIE = 'vc-color-mode';

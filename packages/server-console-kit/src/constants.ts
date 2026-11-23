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

export const HEALTH_LIVENESS_PATH = '/livez';
export const HEALTH_READINESS_PATH = '/readyz';

/**
 * The window global a static console's runtime config is injected as,
 * unless its definition names another.
 */
export const STATIC_CONSOLE_GLOBAL_NAME_DEFAULT = '__AUTHUP__';

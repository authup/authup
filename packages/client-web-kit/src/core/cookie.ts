/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Ref } from 'vue';
import { ref, watch } from 'vue';

/**
 * The two cookies the UI preferences live in, owned by `@vuecs/locale` and
 * `@vuecs/design`. Spelled once here because three things read them: the refs
 * below, and `buildAuthorizeURL`, which defaults the `ui_locales` /
 * `ui_color_mode` hints from them.
 */
export const LOCALE_COOKIE = 'vc-locale';

export const COLOR_MODE_COOKIE = 'vc-color-mode';

/**
 * What each cookie holds while the visitor has chosen nothing: neither
 * switcher writes these, so a stored one means an explicit choice.
 */
export const LOCALE_UNSET = 'auto';

export const COLOR_MODE_UNSET = 'system';

function escapeRegExp(input: string): string {
    return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function readCookie(name: string) : string | undefined {
    if (typeof document === 'undefined') {
        return undefined;
    }

    const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${escapeRegExp(name)}=([^;]+)`));
    const value = match?.[1];
    if (!value) {
        return undefined;
    }

    // A malformed percent escape must degrade to the fallback value, not
    // throw a URIError out of the app bootstrap.
    try {
        return decodeURIComponent(value);
    } catch {
        return undefined;
    }
}

/**
 * Cookie-backed ref for non-Nuxt consumers, the counterpart of
 * `useCookie()` in client-admin-console. Client-side writes persist back
 * to the cookie; server-side there is no `document`, so the caller seeds
 * the value through `initial` (the auth console reads the cookie in
 * `renderAuthConsolePage` and hands it over via the hydration payload).
 */
/**
 * The visitor's stored choice, or nothing when they have made none. The
 * no-choice sentinel is not a value worth carrying anywhere: the authup pages
 * resolve it from the same browser this one is running in, so it would say
 * nothing they do not already know.
 */
export function readPreferenceCookie(name: string, unset: string) : string | undefined {
    const value = readCookie(name);

    return value && value !== unset ? value : undefined;
}

export function createCookieRef(name: string, initial?: string, fallback = '') : Ref<string> {
    const source = ref(initial || readCookie(name) || fallback);

    if (typeof document !== 'undefined') {
        watch(source, (value) => {
            document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=31536000; SameSite=Lax`;
        });
    }

    return source;
}

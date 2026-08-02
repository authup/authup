/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Ref } from 'vue';
import { ref, watch } from 'vue';

function escapeRegExp(input: string): string {
    return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function readCookie(name: string) : string | undefined {
    if (typeof document === 'undefined') {
        return undefined;
    }

    const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${escapeRegExp(name)}=([^;]+)`));
    if (!match) {
        return undefined;
    }

    // A malformed percent escape must degrade to the fallback value, not
    // throw a URIError out of the app bootstrap.
    try {
        return decodeURIComponent(match[1]);
    } catch {
        return undefined;
    }
}

/**
 * Cookie-backed ref — the counterpart of `useCookie()` in
 * client-admin-console. The app is client-only, so the cookie is read
 * directly on boot; writes persist back to the cookie.
 */
export function createCookieRef(name: string, initial?: string, fallback = '') : Ref<string> {
    const source = ref(initial || readCookie(name) || fallback);

    if (typeof document !== 'undefined') {
        watch(source, (value) => {
            document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=31536000; SameSite=Lax`;
        });
    }

    return source;
}

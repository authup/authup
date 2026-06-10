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
    return match ? decodeURIComponent(match[1]) : undefined;
}

/**
 * Cookie-backed ref for the non-Nuxt SSR app — the counterpart of
 * `useCookie()` in client-web. Server-side the cookie is read by
 * `renderUIPage` and seeded through the hydration payload (`initial`);
 * client-side writes persist back to the cookie.
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

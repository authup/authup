/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

/* global sessionStorage */

export const LOGIN_REDIRECT_STORAGE_KEY = 'authup:admin:redirect';

/**
 * Base for resolving a post-login destination. Any origin works; it exists
 * only so a relative path resolves and an absolute one is visibly not this.
 */
const DESTINATION_BASE = 'http://localhost';

/**
 * A post-login destination is a site-relative path and nothing else.
 *
 * The test is the resolved origin, never the leading characters: `//host`,
 * `https://host`, the `\`-for-`/` variants a prefix check misses and
 * non-special schemes all resolve somewhere else and are refused. An
 * attacker-chosen path is no improvement over an attacker-chosen host, so
 * the value is dropped outright rather than coerced.
 */
export function resolveLoginRedirect(value: unknown) : string | undefined {
    if (typeof value !== 'string' || !value) {
        return undefined;
    }

    let url : URL;
    try {
        url = new URL(value, DESTINATION_BASE);
    } catch {
        return undefined;
    }

    if (url.origin !== DESTINATION_BASE) {
        return undefined;
    }

    return `${url.pathname}${url.search}${url.hash}`;
}

/**
 * Carry the post-login destination across the cookie-mode round-trip.
 *
 * The server-side kick (`GET /admin/login`) lands the browser on the console
 * root once the credential is issued, so the page the visitor asked for
 * rides this stash: written immediately before the kick, consumed by the
 * router guard on the way back. Single use, same tab, and a storage failure
 * (blocked site data, a sandboxed frame) degrades to "land on the root"
 * rather than breaking the login.
 */
export function saveLoginRedirect(value: unknown) : void {
    if (typeof sessionStorage === 'undefined') {
        return;
    }

    const destination = resolveLoginRedirect(value);

    try {
        if (destination) {
            sessionStorage.setItem(LOGIN_REDIRECT_STORAGE_KEY, destination);
        } else {
            sessionStorage.removeItem(LOGIN_REDIRECT_STORAGE_KEY);
        }
    } catch {
        // ignore: a destination is not worth failing a login over.
    }
}

/**
 * Read and delete the stashed destination (single use). Runs at the top of
 * every navigation, so it must never throw.
 */
export function loadLoginRedirect() : string | undefined {
    if (typeof sessionStorage === 'undefined') {
        return undefined;
    }

    try {
        const value = sessionStorage.getItem(LOGIN_REDIRECT_STORAGE_KEY);
        if (!value) {
            return undefined;
        }

        sessionStorage.removeItem(LOGIN_REDIRECT_STORAGE_KEY);

        return resolveLoginRedirect(value);
    } catch {
        return undefined;
    }
}

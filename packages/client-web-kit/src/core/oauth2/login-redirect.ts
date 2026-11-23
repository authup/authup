/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

/* global sessionStorage */

import type { LoginRedirectOptions } from './types.ts';

export const LOGIN_REDIRECT_STORAGE_KEY = 'authup:login-redirect';

export const LOGIN_REDIRECT_LOGIN_PATH = '/login';

export const LOGIN_REDIRECT_LOGOUT_PATH = '/logout';

/**
 * Base for resolving a post-login destination. Any origin works; it exists
 * only so a relative path resolves and an absolute one is visibly not this.
 */
const DESTINATION_BASE = 'http://localhost';

function isOnPath(pathname: string, route: string) : boolean {
    const prefix = route.replace(/\/+$/, '').toLowerCase();
    const path = pathname.toLowerCase();

    return path === prefix || path.startsWith(`${prefix}/`);
}

/**
 * A post-login destination is a site-relative path and nothing else.
 *
 * The test is the resolved origin, never the leading characters: `//host`,
 * `https://host`, the `\`-for-`/` variants a prefix check misses and
 * non-special schemes all resolve somewhere else and are refused. An
 * attacker-chosen path is no improvement over an attacker-chosen host, so
 * the value is dropped outright rather than coerced. A destination on the
 * login or logout route (or below either) is refused too: landing there
 * after a login loops or signs the visitor straight out again.
 *
 * The value is compared as the app's router sees it, so `loginPath` and
 * `logoutPath` must carry any base path that router has in its paths.
 */
export function resolveLoginRedirect(
    value: unknown,
    options: LoginRedirectOptions = {},
) : string | undefined {
    if (typeof value !== 'string' || !value) {
        return undefined;
    }

    let url : URL;

    try {
        url = new URL(value, DESTINATION_BASE);
    } catch {
        return undefined;
    }

    // A normalized path starting with `//` (from `/.//host`, say) is a
    // network-path reference to whoever reads it next.
    if (url.origin !== DESTINATION_BASE || url.pathname.startsWith('//')) {
        return undefined;
    }

    if (
        isOnPath(url.pathname, options.loginPath ?? LOGIN_REDIRECT_LOGIN_PATH) ||
        isOnPath(url.pathname, options.logoutPath ?? LOGIN_REDIRECT_LOGOUT_PATH)
    ) {
        return undefined;
    }

    return `${url.pathname}${url.search}${url.hash}`;
}

/**
 * Carry the post-login destination across a login round-trip that lands on a
 * fixed page (a server-side callback landing on the app root).
 *
 * Written immediately before the login kick, consumed on the way back.
 * Single use, same tab, and a storage failure (blocked site data, a
 * sandboxed frame) degrades to "land on the root" rather than breaking the
 * login. A refused value clears any earlier stash.
 */
export function saveLoginRedirect(
    value: unknown,
    options: LoginRedirectOptions = {},
) : void {
    const key = options.storageKey ?? LOGIN_REDIRECT_STORAGE_KEY;
    const destination = resolveLoginRedirect(value, options);

    // The `sessionStorage` getter itself throws where site data is blocked,
    // so the availability check sits inside the `try` as well.
    try {
        if (typeof sessionStorage === 'undefined') {
            return;
        }

        if (destination) {
            sessionStorage.setItem(key, destination);
        } else {
            sessionStorage.removeItem(key);
        }
    } catch {
        // ignore: a destination is not worth failing a login over.
    }
}

/**
 * Read and delete the stashed destination (single use), re-validated on the
 * way out. Meant to run at the top of every navigation, so it never throws.
 */
export function loadLoginRedirect(options: LoginRedirectOptions = {}) : string | undefined {
    const key = options.storageKey ?? LOGIN_REDIRECT_STORAGE_KEY;

    try {
        if (typeof sessionStorage === 'undefined') {
            return undefined;
        }

        const value = sessionStorage.getItem(key);

        if (!value) {
            return undefined;
        }

        sessionStorage.removeItem(key);

        return resolveLoginRedirect(value, options);
    } catch {
        return undefined;
    }
}

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

/**
 * Base for resolving a post-login destination. Any origin works; it exists
 * only so a relative path resolves and an absolute one is visibly not this.
 */
const DESTINATION_BASE = 'http://localhost';

function isLoginPath(pathname: string, loginPath: string) : boolean {
    const prefix = loginPath.replace(/\/+$/, '').toLowerCase();
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
 * login route itself is refused too: landing there after a login loops.
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

    if (url.origin !== DESTINATION_BASE) {
        return undefined;
    }

    if (isLoginPath(url.pathname, options.loginPath ?? LOGIN_REDIRECT_LOGIN_PATH)) {
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
    if (typeof sessionStorage === 'undefined') {
        return;
    }

    const key = options.storageKey ?? LOGIN_REDIRECT_STORAGE_KEY;
    const destination = resolveLoginRedirect(value, options);

    try {
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
    if (typeof sessionStorage === 'undefined') {
        return undefined;
    }

    const key = options.storageKey ?? LOGIN_REDIRECT_STORAGE_KEY;

    try {
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

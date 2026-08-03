/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

/* global sessionStorage */

export const ACCOUNT_CONSOLE_REF_STORAGE_KEY = 'authup:account:ref';

/**
 * Carry the `ref` back-link target across the `/authorize` round-trip.
 *
 * The URL is the source of truth for `ref` everywhere else, but the login
 * kick builds its redirect_uri from origin + pathname only, so the query
 * string is gone when the visitor lands back signed in. This stash is
 * written immediately before the kick and consumed by the router guard on
 * the way back, so no entry survives to go stale: a visit that came from
 * nowhere finds nothing here.
 *
 * Only a server-validated value is ever written (it arrives through the
 * injected runtime config), and the value is put back into the URL on
 * return, where the next full page load revalidates it server-side.
 */
export function saveAccountConsoleRef(ref: string | undefined) : void {
    if (typeof sessionStorage === 'undefined') {
        return;
    }

    if (ref) {
        sessionStorage.setItem(ACCOUNT_CONSOLE_REF_STORAGE_KEY, ref);
    } else {
        sessionStorage.removeItem(ACCOUNT_CONSOLE_REF_STORAGE_KEY);
    }
}

/**
 * Read and delete the stashed value (single use).
 */
export function loadAccountConsoleRef() : string | undefined {
    if (typeof sessionStorage === 'undefined') {
        return undefined;
    }

    const value = sessionStorage.getItem(ACCOUNT_CONSOLE_REF_STORAGE_KEY);
    if (!value) {
        return undefined;
    }

    sessionStorage.removeItem(ACCOUNT_CONSOLE_REF_STORAGE_KEY);

    return value;
}

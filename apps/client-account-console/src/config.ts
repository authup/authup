/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { resolveConsoleRuntimeConfig } from '@authup/client-web-kit';

export type AccountConsoleConfigInput = {
    /**
     * Public URL of the authup server (server-core). Optional: when absent,
     * it is derived from the page's own location by stripping the base path
     * — correct whenever the app is served by server-core itself or proxied
     * under the same prefix.
     */
    apiUrl?: string,

    /**
     * Path the app is served under (the vue-router history base).
     * default: /console/account
     */
    basePath?: string,

    /**
     * Feature switches injected by the serving side. A standalone host
     * omits them (the surface is enabled by virtue of being deployed).
     */
    /**
     * The server asserting that it implements cookie mode — NOT an operator
     * choice, and not sufficient on its own.
     *
     * Two different facts gate cookie mode and only one of them is knowable
     * here. Whether the credential can be PRESENTED is a client-side question
     * (is the API this document's own origin?) and is derived by the kit's `resolveConsoleRuntimeConfig`. Whether
     * the server implements `/console/account/login|callback|session` at all is a
     * server-side question, and a console dist newer than the server it talks
     * to cannot answer it: it would navigate to `/console/account/login` and get a 404
     * on a top-level navigation, which is unrecoverable. `serveAccountConsolePage`
     * sets this, so a server that serves the bundle vouches for the routes.
     */
    cookieSession?: boolean,

    features?: {
        accountConsole?: boolean,
    },

    /**
     * Absolute URL of the application the visitor came from, rendered as a
     * back link. server-core validates it against the trusted app origins
     * before injecting it; a standalone host that wants a back link injects
     * its own already-validated value.
     */
    ref?: string,

};

export type AccountConsoleConfig = {
    apiUrl: string,
    basePath: string,
    /**
     * Path the kit store scopes its session cookies to. The authup surfaces
     * on an origin (the hosted auth pages and this console) share one
     * session, so the scope is the sub-path authup is served under — derived
     * from a same-origin `apiUrl` (`resolveCookiePath` in the kit).
     */
    cookiePath: string,
    enabled: boolean,
    ref?: string,
    cookieSession: boolean,
};

declare global {
    interface Window {
        __AUTHUP__?: AccountConsoleConfigInput;
    }
}

/**
 * The mount server-core serves the console under. The API-prefix derivation
 * strips this whole two-segment suffix: a base path ending in `/account`
 * alone is a foreign layout, and stripping one segment of it would derive
 * `<origin>/console` as the API and `/console` as the kit cookie path.
 */
const BASE_PATH_DEFAULT = '/console/account';

/**
 * Resolve the runtime configuration.
 *
 * The serving side injects `window.__AUTHUP__` by replacing the
 * `<!--account-config-->` marker in index.html (server-core does this per
 * request; a standalone host can inject its own script or rely on the
 * defaults). `VITE_API_URL` bakes an API URL in at build/dev time (the
 * dev-server affordance — see README.md). Everything degrades to
 * same-origin derivation: with a base path of `<prefix>/console/account`, the API
 * URL defaults to `<origin><prefix>`.
 */
export function resolveAccountConsoleConfig(
    input?: AccountConsoleConfigInput,
    location?: { origin: string },
) : AccountConsoleConfig {
    const injected = input ??
        (typeof window !== 'undefined' ? window.__AUTHUP__ : undefined) ??
        {};

    const origin = location?.origin ??
        (typeof window !== 'undefined' ? window.location.origin : '');

    const runtime = resolveConsoleRuntimeConfig({
        apiUrl: injected.apiUrl ||
            (typeof import.meta.env !== 'undefined' ? import.meta.env.VITE_API_URL : undefined),
        basePath: injected.basePath,
        basePathDefault: BASE_PATH_DEFAULT,
        cookieSession: injected.cookieSession,
        origin,
    });

    return {
        ...runtime,
        enabled: injected.features?.accountConsole !== false,
        ref: injected.ref,
    };
}

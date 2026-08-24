/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { getURLBasePath } from '@authup/kit';

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
     * default: /account
     */
    basePath?: string,

    /**
     * Feature switches injected by the serving side. A standalone host
     * omits them (the surface is enabled by virtue of being deployed).
     */
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
     * from a same-origin `apiUrl`. See {@link resolveCookiePath}.
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
 * Resolve the runtime configuration.
 *
 * The serving side injects `window.__AUTHUP__` by replacing the
 * `<!--account-config-->` marker in index.html (server-core does this per
 * request; a standalone host can inject its own script or rely on the
 * defaults). `VITE_API_URL` bakes an API URL in at build/dev time (the
 * dev-server affordance — see README.md). Everything degrades to
 * same-origin derivation: with a base path of `<prefix>/account`, the API
 * URL defaults to `<origin><prefix>`.
 */
export function resolveAccountConsoleConfig(
    input?: AccountConsoleConfigInput,
    location?: { origin: string },
) : AccountConsoleConfig {
    const injected = input ??
        (typeof window !== 'undefined' ? window.__AUTHUP__ : undefined) ??
        {};

    const basePath = normalizeBasePath(injected.basePath ?? '/account');
    const origin = location?.origin ??
        (typeof window !== 'undefined' ? window.location.origin : '');

    let { apiUrl } = injected;
    if (!apiUrl && typeof import.meta.env !== 'undefined') {
        apiUrl = import.meta.env.VITE_API_URL;
    }
    if (!apiUrl) {
        const prefix = basePath.endsWith('/account') ?
            basePath.slice(0, -'/account'.length) :
            '';

        apiUrl = `${origin}${prefix}`;
    }

    apiUrl = apiUrl.replace(/\/+$/, '');

    return {
        apiUrl,
        basePath,
        cookiePath: resolveCookiePath(apiUrl, origin),
        enabled: injected.features?.accountConsole !== false,
        ref: injected.ref,
        // DERIVED, never injected. Cookie mode is a fact about the
        // deployment, not a choice: the credential is `SameSite=Strict` and
        // the server additionally demands `Sec-Fetch-Site: same-origin`, so it
        // is usable exactly when the API is this console's own origin — and
        // when it is, `${apiUrl}/account/login` is a real route, which is what
        // makes the kick in `pages/index.vue` sound rather than conventional.
        //
        // It was an injected boolean first, which made the broken combination
        // (cookie mode + a foreign API) representable, and it failed silently:
        // the kick redirects, the callback sets the cookie on the API's
        // origin, every later request is cross-site and refused, and the
        // console loops back to sign-in with no diagnostic. Deriving it means
        // there is no such state to guard against.
        cookieSession: isSameOriginApiUrl(apiUrl, origin),
    };
}

/**
 * The path the kit store's session cookies are scoped to.
 *
 * The hosted auth pages and the account console share one session on the
 * IdP origin, so the scope is the sub-path authup is publicly served under
 * (the pathname of a same-origin `apiUrl`) — the same value the auth
 * console derives from its payload's baseURL. Root-scoped cookies would
 * share their records with a host application at `/` that embeds authup
 * under a sub-path and itself uses the kit's cookie names: each side then
 * hydrates, rotates and revokes the other's tokens, and the strict refresh
 * rotation escalates the shared refresh token into family revocation.
 *
 * A cross-origin `apiUrl` (standalone hosting) says nothing about this
 * origin's layout, so it keeps the root path — the pre-existing behavior.
 */
/**
 * Whether the API this console talks to is its OWN origin.
 *
 * Two things hang off it, and both break silently when it is false: the kit's
 * cookie scope (a foreign API means the console's own origin owns nothing
 * worth scoping) and cookie mode itself (see below).
 */
function isSameOriginApiUrl(apiUrl: string, origin: string) : boolean {
    if (!origin) {
        return false;
    }

    try {
        return new URL(apiUrl).origin === origin;
    } catch {
        return false;
    }
}

function resolveCookiePath(apiUrl: string, origin: string) : string {
    if (!isSameOriginApiUrl(apiUrl, origin)) {
        return '/';
    }

    return getURLBasePath(apiUrl) || '/';
}

function normalizeBasePath(input: string) : string {
    let output = input.trim();
    if (!output.startsWith('/')) {
        output = `/${output}`;
    }

    return output.length > 1 ? output.replace(/\/+$/, '') : output;
}

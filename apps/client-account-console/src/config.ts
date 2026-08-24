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

    /**
     * Authenticate on the server-issued session cookie instead of a token
     * pair held in JavaScript (plan 088). Injected as `true` by server-core,
     * which only ever serves this app from the API's own origin — the
     * credential is `SameSite=Strict`, so a standalone host on a foreign
     * origin could never present it and stays on the bearer path.
     *
     * There is deliberately no config key behind it: it is a property of how
     * the bundle is served, not an operator choice.
     */
    cookieSession?: boolean,
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
        // Opt-in, never a default: anything but an explicit injected `true`
        // (a standalone host, a dev server) keeps the client-side code flow.
        //
        // AND same-origin, which is not belt-and-braces. `cookieSession` is a
        // public field of the injected config, so a standalone host on a
        // foreign origin can set it, and the result would be a login that
        // cannot work and does not say so: the kick to `${apiUrl}/account/login`
        // redirects fine, the callback sets a `SameSite=Strict` cookie on the
        // API's origin, and every request this console then makes is
        // cross-site, so the server refuses the cookie and the console loops
        // back to sign-in forever. Cookie mode is only ever reachable from a
        // surface the API itself serves; refusing it here is what makes
        // `${config.apiUrl}/account/login` a safe assumption in `kick()`
        // rather than a convention.
        cookieSession: injected.cookieSession === true &&
            isSameOriginApiUrl(apiUrl, origin),
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

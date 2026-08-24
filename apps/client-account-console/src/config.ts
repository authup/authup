/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

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

    let { apiUrl } = injected;
    if (!apiUrl && typeof import.meta.env !== 'undefined') {
        apiUrl = import.meta.env.VITE_API_URL;
    }
    if (!apiUrl) {
        const origin = location?.origin ??
            (typeof window !== 'undefined' ? window.location.origin : '');
        const prefix = basePath.endsWith('/account') ?
            basePath.slice(0, -'/account'.length) :
            '';

        apiUrl = `${origin}${prefix}`;
    }

    return {
        apiUrl: apiUrl.replace(/\/+$/, ''),
        basePath,
        enabled: injected.features?.accountConsole !== false,
        ref: injected.ref,
        // Opt-in, never a default: anything but an explicit injected `true`
        // (a standalone host, a dev server) keeps the client-side code flow.
        cookieSession: injected.cookieSession === true,
    };
}

function normalizeBasePath(input: string) : string {
    let output = input.trim();
    if (!output.startsWith('/')) {
        output = `/${output}`;
    }

    return output.length > 1 ? output.replace(/\/+$/, '') : output;
}

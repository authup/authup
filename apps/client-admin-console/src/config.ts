/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { CLIENT_ADMIN_CONSOLE_NAME } from '@authup/core-kit';
import { resolveConsoleRuntimeConfig } from '@authup/client-web-kit';

export type AdminConsoleConfigInput = {
    /**
     * Public URL of the authup server (server-core). Optional: when absent,
     * it is derived from the page's own location by stripping the base path,
     * correct whenever the app is served by server-core itself or proxied
     * under the same prefix.
     */
    apiUrl?: string,

    /**
     * Where the account console is served, e.g.
     * `https://example.com/console/account`. Optional: absent (a standalone
     * host, or a dist served by an older server) it is derived from the API
     * URL under the default segment.
     */
    accountConsoleUrl?: string,

    /**
     * Path the app is served under (the vue-router history base).
     * default: /console/admin
     */
    basePath?: string,

    /**
     * The OAuth2 client the console authenticates against: the per-realm
     * built-in `admin-console` client (plan 079). A fork registering its own
     * client injects its name here. In cookie mode the server picks the
     * client itself (`GET /console/admin/login`), so this only drives the
     * standalone, JS-token path.
     */
    clientId?: string,

    /**
     * The server asserting that it implements cookie mode: NOT an operator
     * choice, and not sufficient on its own. Whether the credential can be
     * PRESENTED is a client-side question (is the API this document's own
     * origin?) and is derived by the kit's `resolveConsoleRuntimeConfig`; whether the server implements
     * `/console/admin/login|callback` and `/sessions/@me` at all is a server-side
     * question a console dist newer than its server cannot answer. The
     * serving side sets this, so a server that serves the bundle vouches for
     * the routes.
     */
    cookieSession?: boolean,

    /**
     * Feature switches injected by the serving side. A standalone host omits
     * them (the surface is enabled by virtue of being deployed).
     */
    features?: {
        adminConsole?: boolean,
    },
};

export type AdminConsoleConfig = {
    apiUrl: string,
    accountConsoleUrl: string,
    basePath: string,
    clientId: string,
    /**
     * Path the kit store scopes its cookies to. The authup surfaces on an
     * origin share one session, so the scope is the sub-path authup is served
     * under, derived from a same-origin `apiUrl` (`resolveCookiePath` in the kit).
     */
    cookiePath: string,
    cookieSession: boolean,
    enabled: boolean,
};

declare global {
    interface Window {
        __AUTHUP__?: AdminConsoleConfigInput;
    }
}

/**
 * The mount server-core serves the console under. The API-prefix derivation
 * strips this whole two-segment suffix: a base path ending in `/admin` alone
 * is a foreign layout, and stripping one segment of it would derive
 * `<origin>/console` as the API.
 */
const BASE_PATH_DEFAULT = '/console/admin';

/**
 * Resolve the runtime configuration.
 *
 * The serving side injects `window.__AUTHUP__` by replacing the
 * `<!--admin-config-->` marker in index.html (server-core does this per
 * request; a standalone host can inject its own script or rely on the
 * defaults). `VITE_API_URL` bakes an API URL in at build/dev time (the
 * dev-server affordance). Everything degrades to same-origin derivation:
 * with a base path of `<prefix>/console/admin`, the API URL defaults to
 * `<origin><prefix>`.
 */
export function resolveAdminConsoleConfig(
    input?: AdminConsoleConfigInput,
    location?: { origin: string },
) : AdminConsoleConfig {
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
        // The default segment is where server-core's own derivation puts it,
        // so a standalone host and an older server keep today's link.
        accountConsoleUrl: (injected.accountConsoleUrl || `${runtime.apiUrl}/console/account`)
            .replace(/\/+$/, ''),
        clientId: injected.clientId || CLIENT_ADMIN_CONSOLE_NAME,
        enabled: injected.features?.adminConsole !== false,
    };
}

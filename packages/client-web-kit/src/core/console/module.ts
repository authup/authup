/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { getURLBasePath } from '@authup/kit';
import type { ConsoleRuntimeConfig, ConsoleRuntimeConfigInput } from './types';

/**
 * Resolve the runtime configuration every served console shares.
 *
 * The base-path suffix is the WHOLE two-segment mount: a base path merely
 * ending in its last segment is a foreign layout, and stripping one segment
 * would derive `<origin>/console` as the API.
 */
export function resolveConsoleRuntimeConfig(input: ConsoleRuntimeConfigInput) : ConsoleRuntimeConfig {
    const basePath = normalizeBasePath(input.basePath ?? input.basePathDefault);

    let { apiUrl } = input;
    if (!apiUrl) {
        const prefix = basePath.endsWith(input.basePathDefault) ?
            basePath.slice(0, -input.basePathDefault.length) :
            '';

        apiUrl = `${input.origin}${prefix}`;
    }

    apiUrl = apiUrl.replace(/\/+$/, '');

    return {
        apiUrl,
        basePath,
        cookiePath: resolveCookiePath(apiUrl, input.origin),
        // Capability AND applicability, because they are different facts and
        // each alone is wrong. The injected half is the server vouching for
        // the routes: without it a console dist newer than its server would
        // navigate to a login route that does not exist. The derived half is
        // this document checking it could present the credential at all: it
        // is `SameSite=Strict` and the server also demands
        // `Sec-Fetch-Site: same-origin`, so against a foreign API every
        // request is cross-site and the console loops back to sign-in with
        // no diagnostic.
        cookieSession: input.cookieSession === true &&
            isSameOriginApiUrl(apiUrl, input.origin),
    };
}

/**
 * Whether the API a console talks to is its OWN origin. Both the cookie scope
 * and cookie mode hang off it, and both break silently when it is false.
 */
export function isSameOriginApiUrl(apiUrl: string, origin: string) : boolean {
    if (!origin) {
        return false;
    }

    try {
        return new URL(apiUrl).origin === origin;
    } catch {
        return false;
    }
}

/**
 * The path the kit store's cookies are scoped to: the sub-path authup is
 * publicly served under, so the surfaces on the IdP origin share one session
 * and a host application at `/` using the kit's cookie names is left alone
 * (root-scoped cookies there would have each side rotate and revoke the
 * other's tokens). A cross-origin `apiUrl` (standalone hosting) says nothing
 * about this origin's layout, so it keeps the root path.
 */
export function resolveCookiePath(apiUrl: string, origin: string) : string {
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

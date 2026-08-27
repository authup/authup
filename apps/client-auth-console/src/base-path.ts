/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { HydrationPayload } from './contract';
import { getURLBasePath } from '@authup/kit';
import { injectPayload } from './di';

/**
 * The sub-path this console is served under.
 *
 * `config.basePath` is what the serving side knows and the only value that
 * is right once the pages render somewhere other than the API's own origin
 * path (plan 101 D2). `config.baseURL` is the API, kept as the fallback so
 * a host that predates the split still behaves exactly as it did: the two
 * were the same value then.
 */
export function resolveBasePath(payload?: HydrationPayload) : string {
    const basePath = payload?.config?.basePath;
    if (typeof basePath === 'string') {
        return basePath;
    }

    return getURLBasePath(payload?.config?.baseURL);
}

/**
 * Prefix a server-local path (e.g. /register, or a sanitized redirect like
 * /authorize?...) with the sub-path this console is served under. Identity
 * when served at the root.
 */
export function useBasePath() : (path: string) => string {
    const payload = injectPayload();
    const basePath = resolveBasePath(payload);

    return (path: string) => (
        basePath && path.startsWith('/') ? `${basePath}${path}` : path
    );
}

/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { getURLBasePath } from '@authup/kit';
import { injectPayload } from './di';

/**
 * Prefix a server-local path (e.g. /register, or a sanitized redirect like
 * /authorize?...) with the sub-path authup is publicly served under, derived
 * from the hydration payload's baseURL. Identity when served at the root.
 */
export function useBasePath() : (path: string) => string {
    const payload = injectPayload();
    const basePath = getURLBasePath(payload?.config?.baseURL);

    return (path: string) => (
        basePath && path.startsWith('/') ? `${basePath}${path}` : path
    );
}

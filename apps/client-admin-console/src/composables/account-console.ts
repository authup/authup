/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

/* global window */

import { injectAdminConsoleConfig } from '../di';

/**
 * Build a link into the account console, the self-service surface served
 * by server-core on the IdP origin.
 *
 * This console's own location (origin + base path) rides along as `ref`,
 * which the account console renders as a back link after validating it
 * against the trusted app origins; served by server-core the two share
 * publicUrl's origin, which that allowlist always contains.
 *
 * `path` is a bare path: no query string, no fragment. The concatenation
 * below would otherwise emit a second `?`. It is deliberately NOT built
 * with `new URL(path, apiUrl)`, which would resolve against the origin and
 * so drop the sub-path when authup is deployed behind a prefix-stripping
 * proxy (`publicUrl` carrying a pathname).
 *
 * Resolves through inject(), so call it synchronously during setup().
 */
export function useAccountConsoleURL(path = '/') : string {
    const config = injectAdminConsoleConfig();

    const normalized = path.startsWith('/') ? path : `/${path}`;
    const ref = encodeURIComponent(`${window.location.origin}${config.basePath}`);

    return `${config.apiUrl}/account${normalized}?ref=${ref}`;
}

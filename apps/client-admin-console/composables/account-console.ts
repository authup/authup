/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { useRequestURL, useRuntimeConfig } from '#imports';

/**
 * Build a link into the account console, the self-service surface served
 * by server-core on the IdP origin.
 *
 * The admin console's own origin rides along as `ref`, which the account
 * console renders as a back link after validating it against the trusted
 * app origins. The origin is enough: the page the visitor came from is
 * /settings, which now only redirects, so there is no deep target worth
 * preserving.
 *
 * `useRequestURL()` resolves on the server pass too, so a redirect built
 * from this is a real 302 rather than a client-side bounce.
 *
 * `path` is a bare path: no query string, no fragment. The concatenation
 * below would otherwise emit a second `?`. It is deliberately NOT built
 * with `new URL(path, apiUrl)`, which would resolve against the origin and
 * so drop the sub-path when authup is deployed behind a prefix-stripping
 * proxy (`publicUrl` carrying a pathname).
 */
export function useAccountConsoleURL(path = '/') : string {
    const runtimeConfig = useRuntimeConfig();
    const apiUrl = ((runtimeConfig.public.apiUrl as string | undefined) ?? '')
        .replace(/\/+$/, '');

    const normalized = path.startsWith('/') ? path : `/${path}`;
    const ref = encodeURIComponent(useRequestURL().origin);

    return `${apiUrl}/account${normalized}?ref=${ref}`;
}

/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { expandToOrigins } from './origins.ts';

const PRODUCTION = 'production';

/**
 * The dev console's own listener. In non-production it runs on its own port
 * while the API answers on `core.port`, so it is seeded into the trusted
 * origins: without it the redirect allowlist (`<origin>/**`) and CORS
 * reject the realm-selection login and a first run is dead on arrival.
 */
export const DEVELOPMENT_ORIGIN = 'http://localhost:3010';

/**
 * The trusted origins as every consumer needs them: bare origins
 * (`scheme://host[:port]`), deduplicated, with the dev console seeded in
 * outside production.
 *
 * A configured entry may be scheme-less (`hub.local`), which expands to BOTH
 * its http and its https origin. Taken verbatim it becomes the pattern
 * `hub.local/**`, matched against an absolute URL, which matches nothing, so
 * the surfaces that read this list fail silently rather than loudly.
 *
 * A property of the DOCUMENT rather than of a service: server-core builds its
 * client redirect allowlist from it and the account console validates its
 * `ref` back link against it, and the two have to agree without one asking
 * the other. Building a fresh array per call also keeps a repeated
 * normalization on the same input from accumulating the dev origin into a
 * security-sensitive allowlist.
 */
export function resolveTrustedOrigins(
    value: string[] | undefined,
    env: string | undefined,
) : string[] {
    const origins : string[] = [];

    for (const entry of value ?? []) {
        for (const origin of expandToOrigins(entry)) {
            if (!origins.includes(origin)) {
                origins.push(origin);
            }
        }
    }

    if (env !== PRODUCTION && !origins.includes(DEVELOPMENT_ORIGIN)) {
        origins.push(DEVELOPMENT_ORIGIN);
    }

    return origins;
}

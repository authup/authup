/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { URL } from 'node:url';
import type { Config } from './types.ts';

const SCHEME_REGEX = /^[a-z][a-z0-9+.-]*:\/\//i;

/**
 * Expand a configured additional origin to its trusted origin(s).
 *
 * A value with an explicit scheme contributes exactly that origin —
 * the way to restrict a host to https only. A bare host[:port]
 * (e.g. `hub.local`) contributes both the http and https origin.
 *
 * Throws on values that don't parse as a URL/host.
 */
export function expandToOrigins(value: string): string[] {
    if (SCHEME_REGEX.test(value)) {
        return [new URL(value).origin];
    }

    return [
        new URL(`http://${value}`).origin,
        new URL(`https://${value}`).origin,
    ];
}

/**
 * Derive the set of trusted application origins (scheme://host[:port]).
 *
 * publicUrl may carry a path; both the OAuth2 redirect allowlist and the
 * CORS origin allowlist need bare origins, so extract the origin from each
 * configured URL and de-duplicate. additionalOrigins entries are already
 * canonicalized by normalizeConfig, but raw values (scheme-less hosts)
 * are tolerated and expanded the same way.
 */
export function getAppOrigins(config: Pick<Config, 'publicUrl' | 'additionalOrigins'>): string[] {
    const origins = new Set<string>();
    origins.add(new URL(config.publicUrl).origin);

    for (const value of config.additionalOrigins ?? []) {
        for (const origin of expandToOrigins(value)) {
            origins.add(origin);
        }
    }

    return Array.from(origins);
}

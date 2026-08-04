/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { URL } from 'node:url';
import { patternHasGlobstarInAuthority } from '@authup/kit';
import type { Config } from './types.ts';

const SCHEME_REGEX = /^[a-z][a-z0-9+.-]*:\/\//i;

const ALLOWED_PROTOCOLS = ['http:', 'https:'];

/**
 * Expand a configured trusted-origin value to its canonical origin(s).
 *
 * A value with an explicit scheme contributes exactly that origin —
 * the way to restrict a host to https only. A bare host[:port]
 * (e.g. `hub.local`) contributes both the http and https origin.
 *
 * Only http(s) is accepted: other schemes either have no usable web
 * origin (`new URL('myapp://x').origin` is the literal string "null")
 * or are meaningless as a redirect target for the web client — letting
 * them through would put garbage into a security-sensitive allowlist.
 *
 * Throws on values that don't parse as a URL/host or use another scheme.
 */
export function expandToOrigins(value: string): string[] {
    // `new URL()` accepts `*` and `**` as a hostname, and every trusted origin
    // becomes an `<origin>/**` redirect pattern for the system clients. A `**`
    // there matches the rest of the value outright, so a single typo would
    // turn the redirect allowlist of every realm's console clients into
    // allow-any-origin. A single `*` is a supported host wildcard.
    if (patternHasGlobstarInAuthority(value)) {
        throw new Error(`A trusted origin must not use ** in the host, it would match every origin. Use a single * for a host wildcard, got: ${value}`);
    }

    if (SCHEME_REGEX.test(value)) {
        const url = new URL(value);
        if (!ALLOWED_PROTOCOLS.includes(url.protocol)) {
            throw new Error(`A trusted origin must use the http or https protocol, got: ${url.protocol}`);
        }

        return [url.origin];
    }

    return [
        new URL(`http://${value}`).origin,
        new URL(`https://${value}`).origin,
    ];
}

/**
 * Derive the set of trusted application origins (scheme://host[:port]).
 *
 * publicUrl may carry a path, so its origin is extracted; trustedOrigins
 * entries are canonical origins — normalizeConfig owns that invariant
 * (expansion + dedupe via expandToOrigins) — and are merged verbatim.
 */
export function getAppOrigins(config: Pick<Config, 'publicUrl' | 'trustedOrigins'>): string[] {
    const origins = new Set<string>();
    origins.add(new URL(config.publicUrl).origin);

    for (const origin of config.trustedOrigins ?? []) {
        origins.add(origin);
    }

    return Array.from(origins);
}

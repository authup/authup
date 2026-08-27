/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

const BOOLEAN_TRUE_WORDS = new Set(['true', 't', 'yes', 'y', 'on']);
const BOOLEAN_FALSE_WORDS = new Set(['false', 'f', 'no', 'n', 'off']);

const INTEGER = /^\d+$/;

/**
 * An entry of the explicit array (allowlist) form must be an address, CIDR,
 * or preset - an integer-string or boolean word there is a mis-typed scalar
 * form and must fail loud instead of compiling to a bogus `0.0.0.1`-style
 * allowlist entry.
 *
 * It lives here, next to the `trustProxy` key, because it is part of that
 * key's DECLARATION: it is the refinement the key's zod type carries, so it
 * has to travel with the key. Turning an accepted value into what proxy-addr
 * wants is a separate, later step and stays with the service that normalizes
 * the configuration. The trim + lowercase below is the one thing the two
 * halves have to agree on: validation compares the canonicalized value, so a
 * normalizer that stopped canonicalizing the same way would accept an entry
 * proxy-addr then rejects.
 */
export function isValidTrustProxyListEntry(value: string): boolean {
    const normalized = value.trim().toLowerCase();

    return normalized.length > 0 &&
        !INTEGER.test(normalized) &&
        !BOOLEAN_TRUE_WORDS.has(normalized) &&
        !BOOLEAN_FALSE_WORDS.has(normalized);
}

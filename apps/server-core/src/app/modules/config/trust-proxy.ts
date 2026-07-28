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
 * Canonicalize a string-form trustProxy value into its semantic type. This
 * MUST run for every config surface (env, .conf, file, programmatic input) —
 * not just env: proxy-addr accepts single-integer "long value" IPv4 notation,
 * so an un-canonicalized `trustProxy: "1"` (e.g. a stringifying configmap)
 * would silently compile to an allowlist of `0.0.0.1` instead of one trusted
 * hop. The integer form wins over the boolean words (`'1'` means ONE hop,
 * never trust-all); anything else lowercases (IPs, CIDRs, and the proxy-addr
 * presets are all case-insensitive semantically, but proxy-addr matches the
 * presets case-sensitively) and passes through as the allowlist form.
 */
export function canonicalizeTrustProxy(raw: string): boolean | number | string {
    const normalized = raw.trim();
    if (INTEGER.test(normalized)) {
        return Number.parseInt(normalized, 10);
    }

    const lowered = normalized.toLowerCase();
    if (BOOLEAN_TRUE_WORDS.has(lowered)) {
        return true;
    }
    if (BOOLEAN_FALSE_WORDS.has(lowered)) {
        return false;
    }

    return lowered;
}

/**
 * An entry of the explicit array (allowlist) form must be an address, CIDR,
 * or preset — an integer-string or boolean word there is a mis-typed scalar
 * form and must fail loud instead of compiling to a bogus `0.0.0.1`-style
 * allowlist entry.
 */
export function isValidTrustProxyListEntry(value: string): boolean {
    const normalized = value.trim().toLowerCase();
    return normalized.length > 0 &&
        !INTEGER.test(normalized) &&
        !BOOLEAN_TRUE_WORDS.has(normalized) &&
        !BOOLEAN_FALSE_WORDS.has(normalized);
}

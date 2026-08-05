/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { isSimpleMatch } from './is-simple-match';

/**
 * Reduce a URL to the form a browser would navigate to.
 *
 * Only http(s) is canonicalized. A custom-scheme redirect (`myapp://cb`, the
 * native-app pattern of RFC 8252) has no origin, so reconstructing it would
 * corrupt it.
 *
 * Returns every form the value may legitimately be compared as, or undefined
 * when the value is not an http(s) URL.
 */
function canonicalizeHttpURL(url: URL) : string[] {
    // `origin` is assembled from parsed components, so it can never carry an
    // authority terminator, userinfo, a non-canonical host case or a default
    // port. Appending the remaining components to it guarantees a `/` directly
    // behind the authority, which is the one boundary the matcher understands.
    const canonical = `${url.origin}${url.pathname}${url.search}${url.hash}`;

    // A bare origin serializes with the root path (`https://x` -> `https://x/`),
    // so a pattern registered without the trailing slash would stop matching.
    // Offering the origin as a second form keeps that working, and is safe for
    // the same reason: an origin ends at the authority, so no wildcard in the
    // pattern can reach past it.
    if (url.pathname === '/' && !url.search && !url.hash) {
        return [canonical, url.origin];
    }

    return [canonical];
}

/**
 * Reduce a pattern to the same canonical form as the candidate.
 *
 * Both sides have to be normalized or the comparison is asymmetric: a stored
 * `https://app.example.com:443/**` or `https://APP.example.com/**` would stop
 * matching the moment the candidate is canonicalized, which would log users
 * out of a working deployment.
 *
 * Wildcards survive it. `*` is a legal host and path character, so `URL`
 * leaves `*` and `**` untouched wherever they appear and only normalizes what
 * should be normalized (host case, default port, userinfo, dot segments).
 *
 * A pattern that is not an http(s) URL is returned untouched, so custom
 * schemes and any non-URL pattern keep comparing verbatim.
 */
function canonicalizePattern(pattern: string) : string {
    let url : URL;
    try {
        url = new URL(pattern);
    } catch {
        return pattern;
    }

    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        return pattern;
    }

    return `${url.origin}${url.pathname}${url.search}${url.hash}`;
}

/**
 * Match a URL against a glob pattern, or against any pattern of a list.
 *
 * The wildcard vocabulary is `isSimpleMatch`'s (`*` stays inside a path
 * segment, `**` matches the rest), but the value is canonicalized first, so
 * the string that gets authorized is the string the browser navigates to.
 *
 * That is what makes a wildcard in the pattern's authority safe.
 * `isSimpleMatch` knows exactly one boundary, `/`, while a URL authority is
 * also terminated by `?`, `#` and `\`. Against the raw string a `*` in the
 * host absorbs one of those and the pattern's remaining host literal lands in
 * the query or fragment of a foreign origin, so
 * `https://evil.test?.example.com/cb` matches `https://*.example.com/**` and
 * an authorization code is delivered to the attacker. Canonicalizing first
 * puts a `/` behind the authority and the wildcard can no longer cross it.
 *
 * Case, default port, userinfo and `..` segments are resolved by the same
 * step, so a path-scoped pattern can no longer be walked out of either. The
 * pattern is normalized the same way, since normalizing only one side would
 * stop a stored `https://APP.example.com/**` from matching anything.
 *
 * Use this for every trust decision over a URL. `isSimpleMatch` on a raw URL
 * string is not safe when the pattern may carry a wildcard in its authority.
 */
export function isSimpleURLMatch(
    value: string,
    pattern: string | string[],
) : boolean {
    const patterns = Array.isArray(pattern) ? pattern : [pattern];

    let url : URL;
    try {
        url = new URL(value);
    } catch {
        // Nothing a browser could navigate to, so nothing to authorize.
        return false;
    }

    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        // Custom scheme: no origin to canonicalize against, matched verbatim
        // as before. A `**` in the authority of such a pattern is rejected at
        // write time by `patternHasGlobstarInAuthority`.
        return isSimpleMatch(value, patterns);
    }

    const candidates = canonicalizeHttpURL(url);
    for (const item of patterns) {
        const canonicalPattern = canonicalizePattern(item);

        for (const candidate of candidates) {
            if (isSimpleMatch(candidate, canonicalPattern)) {
                return true;
            }
        }
    }

    return false;
}

/**
 * Does the pattern place a `**` in its authority?
 *
 * A single `*` there is a supported host wildcard and is safe once the value
 * is canonicalized. `**` is not: it matches the rest of the value outright,
 * discarding everything the pattern says after it, so
 * `https://**.example.com/**` reads as "any subdomain of example.com" but
 * accepts every https origin. There is no safe reading of it, so it is
 * rejected where patterns are written rather than given a meaning at match
 * time.
 */
export function patternHasGlobstarInAuthority(pattern: string) : boolean {
    const separator = pattern.indexOf('://');

    const start = separator === -1 ? 0 : separator + '://'.length;

    // The authority ends at the FIRST of these, not at `/` alone. Scanning
    // only for `/` swallows the query and fragment, so an origin-scoped
    // `https://app.example.com?next=**` would be rejected for a `**` that is
    // nowhere near the host.
    const offset = pattern.slice(start).search(/[/?#\\]/);
    const end = offset === -1 ? pattern.length : start + offset;

    return pattern.slice(start, end).includes('**');
}

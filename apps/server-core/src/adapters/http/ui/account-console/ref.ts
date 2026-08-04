/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { isSimpleURLMatch } from '@authup/kit';

/**
 * Upper bound on an accepted `ref`, matching the cap
 * `OAuth2EndSessionRequestValidator` applies to `post_logout_redirect_uri`.
 */
export const ACCOUNT_CONSOLE_REF_MAX_LENGTH = 2000;

/**
 * Resolve the `ref` back-link parameter against the trusted app origins.
 *
 * `ref` names the application the visitor came from, so the account console
 * can render a link back to it. It is attacker-supplied, and it is rendered
 * on an authenticated first-party page, so an unvalidated value would be a
 * phishing surface. The check mirrors the client redirect allowlist: each
 * trusted origin becomes an `<origin>/**` pattern, which admits the bare
 * origin and any path below it while rejecting a foreign origin, a
 * suffix-extended host (`admin.example.com.evil.test`), a userinfo-prefixed
 * host (`admin.example.com@evil.test`) and a scheme downgrade.
 *
 * The value is canonicalized through `URL` before matching, so a host
 * differing only in case still matches (the matcher is case-sensitive, while
 * a host is not). The canonical form is what gets returned, and it is what
 * the page embeds. `isSimpleURLMatch` canonicalizes as well, which is what
 * keeps a wildcard in a trusted origin from escaping the authority; doing it
 * here too is what lets this function RETURN the canonical form.
 *
 * Returns undefined for anything that does not pass. The caller drops it
 * silently, the way `sanitizeRelativeRedirect` drops a bad workflow
 * redirect.
 */
export function resolveAccountConsoleRef(
    value: unknown,
    trustedOrigins: string[],
) : string | undefined {
    if (typeof value !== 'string') {
        return undefined;
    }

    const trimmed = value.trim();
    if (trimmed.length === 0 || trimmed.length > ACCOUNT_CONSOLE_REF_MAX_LENGTH) {
        return undefined;
    }

    let url : URL;
    try {
        url = new URL(trimmed);
    } catch {
        return undefined;
    }

    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        return undefined;
    }

    const candidate = `${url.origin}${url.pathname}${url.search}${url.hash}`;

    if (!isSimpleURLMatch(candidate, trustedOrigins.map((origin) => `${origin}/**`))) {
        return undefined;
    }

    return candidate;
}

/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

/**
 * The OAuth2 issuance surface a cookie credential must NEVER reach (plan 088).
 *
 * An ambient origin-wide cookie fills the identity slot every one of these
 * routes reads, so without this list one script execution anywhere on the IdP
 * origin could POST `/authorize` with its own PKCE challenge against the
 * `account-console` client (public, `builtIn` and therefore auto-consenting),
 * carry the code to `/token` and walk away with a full token pair. The cookie
 * would have converted itself back into a portable bearer, and `HttpOnly`
 * would have bought exactly one hop.
 *
 * Nothing legitimate is excluded: the hosted auth console posts its consent
 * with its own bearer, and the account-link routes are deliberately absent
 * (completing one requires an interactive login at an external provider inside
 * the victim's browser, which same-origin script cannot drive).
 *
 * `HTTPOAuth2IdentityGrantType` is unregistered today but mints a grant
 * straight from the request identity, so it would become live the day it is
 * wired. Do not narrow this list without re-reading plan 088, finding 2.
 */
export const OAUTH2_ISSUANCE_PATHS : string[] = [
    '/authorize',
    '/token',
    '/logout',
];

/**
 * Normalize a request path the way routup's matcher sees it.
 *
 * The check runs in the middleware, on `event.path`, BEFORE routing, so an
 * equality test against the raw pathname would miss a request that still
 * reaches the handler. Two properties of the matcher matter (path-to-regexp
 * v8, as routup configures it):
 *
 * - it is **case insensitive** (no `sensitive` option is passed), so `/TOKEN`
 *   routes to the token controller;
 * - it tolerates ONE trailing slash (`/token/`).
 *
 * Repeated slashes are collapsed as well. Those do not route (`//token`
 * matches nothing), so collapsing can only widen the refusal, which is the
 * safe direction: a denied path merely stays anonymous.
 */
export function normalizeRequestPath(input: string) : string {
    const value = input.toLowerCase().replace(/\/+/g, '/');
    if (value.length > 1 && value.endsWith('/')) {
        return value.replace(/\/+$/, '') || '/';
    }

    return value;
}

/**
 * Whether the path addresses the OAuth2 issuance surface (the route itself or
 * anything below it: `/token/introspect`, `/token/revoke`, and whatever a
 * later mount adds under these prefixes).
 */
export function isOAuth2IssuancePath(input: string) : boolean {
    const path = normalizeRequestPath(input);

    for (const entry of OAUTH2_ISSUANCE_PATHS) {
        if (path === entry || path.startsWith(`${entry}/`)) {
            return true;
        }
    }

    return false;
}

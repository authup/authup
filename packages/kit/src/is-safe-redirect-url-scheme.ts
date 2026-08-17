/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

/**
 * Schemes a redirect target must never carry. Every one of them is either
 * script-capable in a browser (`javascript:`, `data:`, `vbscript:`,
 * `blob:`, `filesystem:`) or addresses the local machine (`file:`,
 * `about:`), so
 * navigating a browser to one from the IdP origin is script execution or
 * worse, never a return to an application. A small, documented denylist:
 * http(s) and any plausible custom scheme of a native app (RFC 8252,
 * `myapp://cb`) pass.
 */
const UNSAFE_REDIRECT_URL_SCHEMES = new Set([
    // eslint-disable-next-line no-script-url -- the scheme being refused
    'javascript:',
    'data:',
    'vbscript:',
    'blob:',
    'filesystem:',
    'file:',
    'about:',
]);

/**
 * Is the value's scheme one a redirect target may carry?
 *
 * The scheme is read from the parsed URL, so case and leading whitespace are
 * normalized (`JavaScript:` and `javascript:` are the same scheme). A value
 * that does not parse as a URL cannot be navigated and is refused as well.
 *
 * Applied wherever a redirect target enters authup: the client redirect
 * pattern validator, the authorization code-request verifier and, fail
 * closed, the federated callback right before it renders a non-http(s)
 * target for a client-side navigation.
 */
export function isSafeRedirectURLScheme(value: string) : boolean {
    let url : URL;
    try {
        url = new URL(value);
    } catch {
        return false;
    }

    return !UNSAFE_REDIRECT_URL_SCHEMES.has(url.protocol);
}

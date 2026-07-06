/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Client } from '@authup/core-http-kit';
import type { IClient } from '@authup/core-http-kit';
import { FetchTransport, fetch } from 'hapic';
import type { InternalUIHttpClientContext } from './types.ts';

/**
 * Build a rewriter that maps URLs under the public base URL
 * (scheme://host[/prefix]) onto the server's own listen address. URLs
 * outside the public origin/prefix pass through untouched.
 */
export function createPublicToInternalURLRewriter(
    publicURL: string,
    internalURL: string,
) : (url: string) => string {
    const publicParsed = new URL(publicURL);
    const internalParsed = new URL(internalURL);
    // a wildcard listen address (0.0.0.0 / [::]) is not reliably dialable —
    // loop back explicitly
    if (internalParsed.hostname === '0.0.0.0' || internalParsed.hostname === '[::]') {
        internalParsed.hostname = '127.0.0.1';
    }
    const basePath = publicParsed.pathname.replace(/\/+$/, '');

    return (url: string) => {
        let parsed : URL;
        try {
            parsed = new URL(url);
        } catch {
            return url;
        }

        if (parsed.origin !== publicParsed.origin) {
            return url;
        }

        let { pathname } = parsed;
        if (basePath) {
            if (pathname === basePath) {
                pathname = '/';
            } else if (pathname.startsWith(`${basePath}/`)) {
                pathname = pathname.substring(basePath.length);
            } else {
                return url;
            }
        }

        return new URL(pathname + parsed.search, internalParsed.origin).href;
    };
}

/**
 * HTTP client for the SSR'd UI pages: the render's API calls target the
 * server itself, so they are dispatched against its own listen address —
 * no reverse-proxy round-trip, no TLS (a self-signed publicUrl certificate
 * would otherwise fail Node's fetch), no dependency on the public hostname
 * resolving from inside the deployment.
 *
 * The rewrite happens at the TRANSPORT layer only: `baseURL` must stay the
 * public URL because the rendered HTML derives user-facing URLs from it
 * (e.g. the identity-provider authorize hrefs via `getAuthorizeUri`), and
 * hydration does not patch attribute mismatches.
 */
export function createInternalUIHttpClient(ctx: InternalUIHttpClientContext) : IClient {
    const rewriteURL = createPublicToInternalURLRewriter(ctx.publicURL, ctx.internalURL);

    return new Client({
        baseURL: ctx.publicURL,
        transport: new FetchTransport({ fetch: (input, init) => fetch(rewriteURL(input), init) }),
    });
}

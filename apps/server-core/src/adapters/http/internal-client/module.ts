/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Client, createRebasedTransport } from '@authup/core-http-kit';
import type { IClient } from '@authup/core-http-kit';
import type { InternalHttpClientContext } from './types.ts';

/**
 * The origin a listen address is dialed at. A wildcard listen address
 * (0.0.0.0 / [::]) is not reliably dialable, so it loops back explicitly.
 */
export function toDialableOrigin(url: string) : string {
    const parsed = new URL(url);

    if (parsed.hostname === '0.0.0.0' || parsed.hostname === '[::]') {
        parsed.hostname = '127.0.0.1';
    }

    return parsed.origin;
}

/**
 * HTTP client for this server's calls to its own API: they are dispatched
 * against its own listen address, so there is no reverse-proxy round-trip,
 * no TLS (a self-signed publicUrl certificate would otherwise fail Node's
 * fetch) and no dependency on the public hostname resolving from inside the
 * deployment. Its one consumer is the console login's token exchange.
 *
 * The rewrite happens at the TRANSPORT layer only: `baseURL` must stay the
 * public URL because the values derived from it are user-facing, and a
 * `redirect_uri` in particular is compared byte for byte at redemption.
 */
export function createInternalHttpClient(ctx: InternalHttpClientContext) : IClient {
    return new Client({
        baseURL: ctx.publicURL,
        transport: createRebasedTransport(ctx.publicURL, toDialableOrigin(ctx.internalURL)),
    });
}

/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Options as CorsOptions } from '@routup/cors';
import { cors } from '@routup/cors';
import type { App } from 'routup';

export function registerCorsMiddleware(router: App, input?: CorsOptions) {
    router.use(cors({
        // Reflect any origin by default: OAuth2 clients (and their UIs) are
        // registered at runtime on arbitrary domains, so a startup-time
        // allowlist cannot know them. All authentication is header-based
        // (Bearer/Basic) — no cookie-authenticated endpoint exists — so an
        // origin allowlist would add no security, only break dynamically
        // registered browser clients. Operators can still pass an explicit
        // `origin` via the middlewareCors config options.
        origin: true,
        credentials: true,
        // `credentials: true` is incompatible with the `*` wildcard for
        // exposeHeaders, so enumerate the response headers JS clients need.
        exposeHeaders: [
            'ratelimit-limit',
            'ratelimit-remaining',
            'ratelimit-reset',
            'retry-after',
            'etag',
            'content-disposition',
            'content-range',
            'accept-ranges',
            'location',
            'www-authenticate',
        ],
        ...(input ?? {}),
    }));
}

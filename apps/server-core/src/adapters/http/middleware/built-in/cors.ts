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
        // allowlist cannot know them. Authentication is header-based
        // (Bearer/Basic), so an origin allowlist would add no security here,
        // only break dynamically registered browser clients. Operators can
        // still pass an explicit `origin` via the middlewareCors config
        // options.
        //
        // ONE endpoint authenticates on a cookie: the federated login's
        // `POST /identity-providers/:id/login-complete` (plan 094). Reflecting
        // an origin WITH credentials would let any same-site origin read the
        // token pair it answers with, since `SameSite` is scoped to the
        // registrable domain rather than the origin, so that route checks
        // `Origin` against publicUrl itself. A second cookie-authenticated
        // endpoint must do the same, or this default has to change.
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

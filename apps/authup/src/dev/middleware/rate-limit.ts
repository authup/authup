/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { isObject } from '@authup/kit';
import type { MiddlewareOptions } from '@authup/server-config';
import type { IAppEvent } from 'routup';

/**
 * Exempt every request under a console base path from the rate limiter.
 *
 * This file sits under `middleware/` but exports no handler: server-core owns
 * the rate-limit middleware, and what dev contributes is the `skip` half of
 * its options. The folder says which middleware the code is about, not what
 * shape it takes.
 *
 * The limiter is there to protect a public API, and it caps an
 * unauthenticated caller at 1200 requests per minute keyed by IP. In dev a
 * single page load IS the module graph: vite serves every source file as its
 * own request, so one cold load of the admin console spends ~970 of that
 * budget, where the built console fetches ~144 hashed assets the browser then
 * caches for a year. The second load inside the same window dies partway
 * through the graph with the limiter's plain-text refusal, which reads as a
 * broken console rather than a busy one.
 *
 * No threshold fixes that. The graph grows with the source tree, so a raised
 * cap only moves the day it breaks; turning the limiter off wholesale loses
 * it on the surface it actually exists for. Exempting the console mounts and
 * nothing else keeps it live on the protocol surface, so dev still behaves
 * like production everywhere the limiter matters.
 *
 * Matched exactly or as a prefix followed by `/`, which is the boundary
 * routup itself mounts on: `/console/admin` and `/console/admin/src/main.ts`
 * are the console's, `/console/adminfoo` is not.
 */
export function createConsoleRateLimitSkip(basePaths: string[]) {
    return (event: IAppEvent) : boolean => basePaths.some(
        (basePath) => event.path === basePath ||
            event.path.startsWith(`${basePath}/`),
    );
}

/**
 * The predicate above as a `middlewareRateLimit` value, without displacing
 * what the operator configured: `false` stays off, and an object keeps every
 * key it carries.
 *
 * Only `skip` is supplied. server-core merges this value OVER its own
 * defaults (smob's `merge` gives the first argument priority), so the limits
 * and the key derivation stay server-core's.
 */
export function withConsoleRateLimitSkip(
    input: MiddlewareOptions,
    basePaths: string[],
) : MiddlewareOptions {
    if (input === false) {
        return input;
    }

    return {
        ...(isObject(input) ? input : {}),
        skip: createConsoleRateLimitSkip(basePaths),
    };
}

/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { defineCoreHandler } from 'routup';
import type { Handler } from 'routup';
import { RealmResolverMiddleware } from './module.ts';
import type { RealmResolverMiddlewareContext } from './types.ts';

export function createRealmResolverMiddleware(ctx: RealmResolverMiddlewareContext): Handler {
    const middleware = new RealmResolverMiddleware(ctx);

    return defineCoreHandler(async (event) => {
        await middleware.run(event);
        return event.next();
    });
}

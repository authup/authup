/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { AsyncLocalStorage } from 'node:async_hooks';
import { defineCoreHandler, getRequestHeader, getRequestIP } from 'routup';
import type { Handler } from 'routup';
import type { EventRequestContext } from '../../../core/index.ts';
import { useRequestIdentity } from './helpers/index.ts';

/**
 * Actor + request attribution snapshot for entity-CRUD audit rows, carried
 * across the request's async continuation via AsyncLocalStorage so the
 * database subscribers (which have no request handle) can attribute their
 * writes. Writes outside HTTP (provisioning, CLI, cron) have no store —
 * the getter returns undefined, the correct "system" semantics.
 */
export type RequestEventContext = EventRequestContext;

const storage = new AsyncLocalStorage<RequestEventContext>();

export function runWithRequestEventContext<R>(
    ctx: RequestEventContext,
    fn: () => R,
): R {
    return storage.run(ctx, fn);
}

export function useRequestEventContext(): RequestEventContext | undefined {
    return storage.getStore();
}

/**
 * Builds the {@link RequestEventContext} from the routup event and wraps the
 * downstream pipeline in it. Must be mounted AFTER the authorization
 * middleware — the identity has to be resolved for actor attribution.
 */
export function createRequestEventContextMiddleware() : Handler {
    return defineCoreHandler(async (event) => {
        const identity = useRequestIdentity(event);

        const ctx : RequestEventContext = {
            actorType: identity ? identity.type : null,
            actorId: identity ? identity.id : null,
            actorName: identity ? identity.data.name ?? null : null,
            requestPath: event.path,
            requestMethod: event.method,
            requestIpAddress: getRequestIP(event) ?? null,
            requestUserAgent: getRequestHeader(event, 'user-agent') ?? null,
        };

        return runWithRequestEventContext(ctx, () => event.next());
    });
}

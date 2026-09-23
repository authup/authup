/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { EntityStatsResponse } from '@authup/core-http-kit';
import type { SchemaDescription } from '@rapiq/core';
import { useRequestQuery } from '@routup/basic/query';
import type { IAppEvent } from 'routup';
import type { IEntityStatsService } from '../../../../core/index.ts';
import { buildActorContext, getRequestRealmID } from '../../request/index.ts';

/**
 * The body of every `GET /<entity>/@stats`: the statistic under the route
 * realm, with the filter vocabulary it decodes under `meta.schema`. The
 * description is passed by the controller method, next to its
 * `@DQuerySchema` marker, so the OpenAPI coverage guard checks the two name
 * the same entity.
 */
export async function serveEntityStats<
    G extends Record<string, any>,
    M extends Record<string, any>,
>(
    event: IAppEvent,
    service: IEntityStatsService<G, M>,
    schema: SchemaDescription,
): Promise<EntityStatsResponse<G, M>> {
    const { data, meta } = await service.getMany(
        useRequestQuery(event),
        buildActorContext(event),
        { realmId: getRequestRealmID(event) },
    );

    return {
        data,
        meta: {
            ...meta,
            schema,
        },
    };
}

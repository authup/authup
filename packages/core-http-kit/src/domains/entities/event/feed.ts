/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Event } from '@authup/core-kit';
import { and, defineFilters, gt } from '@rapiq/core';
import type { ICondition } from '@rapiq/core';
import type { IClient } from '../../../client/index.ts';
import type { EventFeedDrainOptions } from './types.ts';

export const EVENT_FEED_PAGE_LIMIT = 50;

export async function drainEventFeed(client: IClient, options: EventFeedDrainOptions): Promise<string | null> {
    const limit = Math.max(1, Math.min(options.limit ?? EVENT_FEED_PAGE_LIMIT, EVENT_FEED_PAGE_LIMIT));
    let cursor = options.cursor ?? null;

    const base = options.filters ? defineFilters<Event>(options.filters) : undefined;

    while (true) {
        let filters: ICondition | undefined = base;

        if (cursor) {
            filters = base ?
                and(base, gt<Event>('id', cursor)) :
                gt<Event>('id', cursor);
        }

        const { data } = await client.event.getFeed({
            filters,
            pagination: { limit },
        }, { signal: options.signal });

        const count = data.length;

        if (count > 0) {
            const last = data[count - 1].id;

            await options.handle(data);
            cursor = last;

            if (options.persist) {
                await options.persist(cursor);
            }
        }

        if (count < limit) {
            return cursor;
        }
    }
}

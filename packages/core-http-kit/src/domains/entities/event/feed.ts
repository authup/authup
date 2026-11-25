/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IClient } from '../../../client/index.ts';
import type { EventFeedDrainOptions } from './types.ts';

export const EVENT_FEED_PAGE_LIMIT = 50;

export async function drainEventFeed(client: IClient, options: EventFeedDrainOptions): Promise<string | null> {
    const limit = Math.max(1, Math.min(options.limit ?? EVENT_FEED_PAGE_LIMIT, EVENT_FEED_PAGE_LIMIT));
    let cursor = options.cursor ?? null;

    while (true) {
        const filters = { ...options.filters };

        if (cursor) {
            Object.assign(filters, { id: `>${cursor}` });
        }

        const { data } = await client.event.getFeed({
            filters,
            pagination: { limit },
        }, { signal: options.signal });

        if (data.length > 0) {
            await options.handle(data);
            cursor = data[data.length - 1].id;

            if (options.persist) {
                await options.persist(cursor);
            }
        }

        if (data.length < limit) {
            return cursor;
        }
    }
}

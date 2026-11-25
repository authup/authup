/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Event } from '@authup/core-kit';
import { 
    describe, 
    expect, 
    it, 
    vi, 
} from 'vitest';
import { EVENT_FEED_PAGE_LIMIT, drainEventFeed } from '../../../src/index.ts';
import { createFakeClient } from '../../../src/testing/index.ts';

function page(from: number, count: number): Event[] {
    return Array.from({ length: count }, (_, i) => ({ id: `id-${String(from + i).padStart(4, '0')}` })) as Event[];
}

function build(pages: Event[][]) {
    let call = 0;

    return createFakeClient({ handlers: { 'GET /events/@feed': () => ({ data: pages[call++] ?? [], meta: { total: 0 } }) } });
}

describe('src/domains/entities/event/feed', () => {
    it('should request events/@feed with the encoded query', async () => {
        const client = build([[]]);

        await client.event.getFeed({ pagination: { limit: 5 } });

        const url = new URL(client.requests[0].url, 'http://localhost');

        expect(url.pathname).toEqual('/events/@feed');
        expect(url.search).toContain('limit');
    });

    it('should drain pages, advance the cursor and return the last id', async () => {
        const client = build([
            page(0, EVENT_FEED_PAGE_LIMIT),
            page(100, EVENT_FEED_PAGE_LIMIT),
            page(200, 2),
        ]);
        const handle = vi.fn(async () => {});

        const cursor = await drainEventFeed(client, { handle, filters: { scope: 'entity' } });

        expect(handle).toHaveBeenCalledTimes(3);
        expect(cursor).toEqual('id-0201');
        expect(client.requests).toHaveLength(3);

        const second = decodeURIComponent(client.requests[1].url);

        expect(second).toContain('id-0049');
        expect(second).toContain('>');
        expect(second).toContain('scope');
    });

    it('should clamp the limit to the server maximum', async () => {
        const client = build([page(0, EVENT_FEED_PAGE_LIMIT), []]);

        await drainEventFeed(client, { handle: async () => {}, limit: 500 });

        expect(client.requests).toHaveLength(2);
    });

    it('should reject without advancing when handle throws', async () => {
        const client = build([page(0, EVENT_FEED_PAGE_LIMIT), page(100, EVENT_FEED_PAGE_LIMIT)]);
        const handle = vi.fn()
            .mockResolvedValueOnce(undefined)
            .mockRejectedValueOnce(new Error('boom'));

        await expect(drainEventFeed(client, { handle })).rejects.toThrow('boom');
        expect(handle).toHaveBeenCalledTimes(2);
        expect(client.requests).toHaveLength(2);
    });

    it('should return the input cursor for an empty feed', async () => {
        const client = build([[]]);
        const handle = vi.fn();

        expect(await drainEventFeed(client, { handle, cursor: 'abc' })).toEqual('abc');
        expect(handle).not.toHaveBeenCalled();
    });
});

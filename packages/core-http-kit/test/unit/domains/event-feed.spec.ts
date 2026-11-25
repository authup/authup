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

    it('should stop requesting when handle rejects', async () => {
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

    it('should send the input cursor on the first request', async () => {
        const client = build([[]]);

        await drainEventFeed(client, { handle: async () => {}, cursor: 'id-0007' });

        const first = decodeURIComponent(client.requests[0].url);

        expect(first).toContain('>id-0007');
    });

    it('should let the cursor win over a caller id filter', async () => {
        const client = build([page(0, 2)]);

        await drainEventFeed(client, {
            handle: async () => {},
            cursor: 'id-0007',
            filters: { id: '>id-9999' },
        });

        const first = decodeURIComponent(client.requests[0].url);

        expect(first).toContain('>id-0007');
        expect(first).not.toContain('id-9999');
    });

    it('should pass the signal to every request', async () => {
        const client = build([page(0, EVENT_FEED_PAGE_LIMIT), []]);
        const controller = new AbortController();

        await drainEventFeed(client, { handle: async () => {}, signal: controller.signal });

        expect(client.requests).toHaveLength(2);

        for (const request of client.requests) {
            expect(request.options?.signal).toBe(controller.signal);
        }
    });

    it('should clamp a non-positive limit to one', async () => {
        const client = build([page(0, 1), []]);

        await drainEventFeed(client, { handle: async () => {}, limit: 0 });

        expect(client.requests).toHaveLength(2);

        const url = new URL(client.requests[0].url, 'http://localhost');

        expect(decodeURIComponent(url.search)).toMatch(/limit\]?=1(&|$)/);
    });

    it('should persist each page cursor after its handle resolved', async () => {
        const client = build([
            page(0, EVENT_FEED_PAGE_LIMIT),
            page(100, 2),
        ]);
        const order: string[] = [];
        const handle = vi.fn(async (events: Event[]) => {
            order.push(`handle:${events[events.length - 1].id}`);
        });
        const persist = vi.fn(async (cursor: string) => {
            order.push(`persist:${cursor}`);
        });

        await drainEventFeed(client, { handle, persist });

        expect(order).toEqual([
            'handle:id-0049',
            'persist:id-0049',
            'handle:id-0101',
            'persist:id-0101',
        ]);
    });

    it('should not persist a page whose handle rejected', async () => {
        const client = build([page(0, EVENT_FEED_PAGE_LIMIT), page(100, EVENT_FEED_PAGE_LIMIT)]);
        const handle = vi.fn()
            .mockResolvedValueOnce(undefined)
            .mockRejectedValueOnce(new Error('boom'));
        const persist = vi.fn(async () => {});

        await expect(drainEventFeed(client, { handle, persist })).rejects.toThrow('boom');
        expect(persist).toHaveBeenCalledTimes(1);
        expect(persist).toHaveBeenCalledWith('id-0049');
    });

    it('should not persist an empty page', async () => {
        const client = build([[]]);
        const persist = vi.fn(async () => {});

        await drainEventFeed(client, {
            handle: async () => {},
            persist,
            cursor: 'abc',
        });

        expect(persist).not.toHaveBeenCalled();
    });

    it('should reject when persist rejects', async () => {
        const client = build([page(0, EVENT_FEED_PAGE_LIMIT), page(100, 2)]);
        const persist = vi.fn(async () => {
            throw new Error('disk');
        });

        await expect(drainEventFeed(client, { handle: async () => {}, persist })).rejects.toThrow('disk');
        expect(client.requests).toHaveLength(1);
    });
});

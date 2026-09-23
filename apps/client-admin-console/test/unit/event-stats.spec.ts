/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { EventStatsResponse, IClient } from '@authup/core-http-kit';
import { createFakeClient } from '@authup/core-http-kit/testing';
import { flushPromises, mount } from '@vue/test-utils';
import { defineComponent, h, ref } from 'vue';
import { describe, expect, it } from 'vitest';
import type { EventStats } from '../../src/composables/event-stats';
import { useEventStats } from '../../src/composables/event-stats';

const REALM_ID = '4f0f6f2c-4a0b-4f4a-9a3f-4b7d4b4a1f11';
const OTHER_REALM_ID = '9a1b2c3d-4e5f-4a6b-8c7d-0e1f2a3b4c5d';

function answer(_days: number, bucket: 'hour' | 'day', count: number): EventStatsResponse {
    return {
        data: [
            {
                createdAt: '2026-09-22T00:00:00.000Z',
                scope: 'oauth2',
                name: 'login',
                count,
            },
        ],
        meta: {
            from: '2026-09-15T00:00:00.000Z',
            to: '2026-09-22T10:00:00.000Z',
            bucket,
            total: count,
            enabled: true,
            retentionDays: 90,
            entityRetentionDays: 7,
            schema: {} as EventStatsResponse['meta']['schema'],
        },
    };
}

type Handler = (url: string) => EventStatsResponse | Promise<EventStatsResponse>;

function mountStats(handler: Handler) {
    const requests : string[] = [];
    const errors : unknown[] = [];

    const client = createFakeClient({
        handlers: {
            'GET /events/@stats': (request: { url: string }) => {
                const url = decodeURIComponent(request.url);
                requests.push(url);

                return handler(url);
            },
        },
    }) as unknown as IClient;

    const realmId = ref<string | null>(REALM_ID);
    let stats : EventStats | undefined;

    const component = defineComponent({
        setup() {
            stats = useEventStats({
                client,
                realmId,
                onError: (e) => {
                    errors.push(e);
                },
            });

            return () => h('div');
        },
    });

    mount(component);

    return {
        stats: stats as EventStats,
        realmId,
        requests,
        errors,
    };
}

describe('src/composables/event-stats', () => {
    it('loads the default window scoped to the realm plus the global rows', async () => {
        const { stats, requests } = mountStats(() => answer(7, 'day', 3));
        await flushPromises();

        expect(requests).toHaveLength(1);
        expect(requests[0]).toContain(`in(realmId,'${REALM_ID}',null)`);
        expect(requests[0]).toContain('group=bucket(createdAt,day),scope,name');
        expect(requests[0]).toContain('aggregate=count');
        expect(requests[0]).toContain('gte(createdAt,');
        expect(requests[0]).not.toContain('days=');
        expect(stats.response.value?.data[0].count).toEqual(3);
        expect(stats.busy.value).toBe(false);
    });

    it('asks for hour buckets on the 24 hour window', async () => {
        const { stats, requests } = mountStats((url) => (url.includes('bucket(createdAt,hour)') ?
            answer(1, 'hour', 9) :
            answer(7, 'day', 3)));
        await flushPromises();

        stats.window.value = '24h';
        await flushPromises();

        expect(requests).toHaveLength(2);
        expect(requests[1]).toContain('group=bucket(createdAt,hour),scope,name');
        expect(stats.response.value?.meta.bucket).toEqual('hour');
    });

    it('reloads when the realm changes', async () => {
        const { realmId, requests } = mountStats(() => answer(7, 'day', 3));
        await flushPromises();

        realmId.value = OTHER_REALM_ID;
        await flushPromises();

        expect(requests).toHaveLength(2);
        expect(requests[1]).toContain(`in(realmId,'${OTHER_REALM_ID}',null)`);
    });

    it('clears the previous scope\'s answer when the reload for a new scope fails', async () => {
        let calls = 0;
        const { stats, errors } = mountStats(() => {
            calls += 1;
            if (calls > 1) {
                throw new Error('down');
            }

            return answer(7, 'day', 3);
        });
        await flushPromises();
        expect(stats.response.value?.data[0].count).toEqual(3);

        stats.window.value = '30d';
        await flushPromises();

        expect(errors).toHaveLength(1);
        expect(stats.response.value).toBeNull();
        expect(stats.busy.value).toBe(false);
    });

    it('keeps the answer when a reload of the same scope fails', async () => {
        let calls = 0;
        const { stats, errors } = mountStats(() => {
            calls += 1;
            if (calls > 1) {
                throw new Error('down');
            }

            return answer(7, 'day', 3);
        });
        await flushPromises();

        await stats.load();

        expect(errors).toHaveLength(1);
        expect(stats.response.value?.data[0].count).toEqual(3);
        expect(stats.busy.value).toBe(false);
    });

    it('drops an answer that lands after a newer request', async () => {
        const pending : Array<(response: EventStatsResponse) => void> = [];
        const { stats } = mountStats(() => new Promise<EventStatsResponse>((resolve) => {
            pending.push(resolve);
        }));
        await flushPromises();

        stats.window.value = '24h';
        await flushPromises();
        expect(pending).toHaveLength(2);

        pending[1](answer(1, 'hour', 9));
        await flushPromises();
        pending[0](answer(7, 'day', 3));
        await flushPromises();

        expect(stats.response.value?.meta.bucket).toEqual('hour');
        expect(stats.response.value?.data[0].count).toEqual(9);
        expect(stats.busy.value).toBe(false);
    });
});

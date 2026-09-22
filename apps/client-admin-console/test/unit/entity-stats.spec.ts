/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { EntityStatsQuery } from '@authup/core-http-kit';
import { flushPromises, mount } from '@vue/test-utils';
import { defineComponent, h, ref } from 'vue';
import { describe, expect, it } from 'vitest';
import type {
    EntityStats,
    EntityStatsResponseLike,
    EntityStatsWindowEntry,
} from '../../src/composables/entity-stats';
import { ENTITY_STATS_WINDOWS, useEntityStats } from '../../src/composables/entity-stats';

const REALM_ID = '4f0f6f2c-4a0b-4f4a-9a3f-4b7d4b4a1f11';
const OTHER_REALM_ID = '9a1b2c3d-4e5f-4a6b-8c7d-0e1f2a3b4c5d';

function answer(query: EntityStatsQuery, count: number, total = count): EntityStatsResponseLike {
    return {
        data: [
            {
                bucket: '2026-09-22T00:00:00.000Z',
                count,
            },
        ],
        meta: {
            from: '2026-09-15T00:00:00.000Z',
            to: '2026-09-22T10:00:00.000Z',
            granularity: query.granularity ?? 'day',
            days: query.days ?? 30,
            total,
            schema: {} as EntityStatsResponseLike['meta']['schema'],
        },
    };
}

/**
 * The shape hapic hands back for a refused read: the status rides
 * `response`, which is all `extractErrorContext` reads.
 */
function forbidden(): Error {
    const error = new Error('forbidden') as Error & { response: { status: number } };
    error.response = { status: 403 };

    return error;
}

type Handler = (query: EntityStatsQuery) => EntityStatsResponseLike | Promise<EntityStatsResponseLike>;

function mountStats(handler: Handler, window: EntityStatsWindowEntry = ENTITY_STATS_WINDOWS['7d']) {
    const queries : EntityStatsQuery[] = [];
    const errors : unknown[] = [];

    const realmId = ref<string | null>(REALM_ID);
    const windowRef = ref<EntityStatsWindowEntry>(window);
    let stats : EntityStats | undefined;

    const component = defineComponent({
        setup() {
            stats = useEntityStats({
                load: async (query) => {
                    queries.push(query);

                    return handler(query);
                },
                filters: () => ({ realmId: [realmId.value, null] }),
                window: windowRef,
                onError: (e) => {
                    errors.push(e);
                },
            });

            return () => h('div');
        },
    });

    mount(component);

    return {
        stats: stats as EntityStats,
        realmId,
        window: windowRef,
        queries,
        errors,
    };
}

describe('src/composables/entity-stats', () => {
    it('loads the window, scoped by the filters', async () => {
        const { stats, queries } = mountStats((query) => answer(query, 3, 12));
        await flushPromises();

        expect(queries).toHaveLength(1);
        expect(queries[0]).toEqual({
            filters: { realmId: [REALM_ID, null] },
            days: 7,
            granularity: 'day',
        });
        expect(stats.response.value?.meta.total).toEqual(12);
        expect(stats.response.value?.data[0].count).toEqual(3);
        expect(stats.busy.value).toBe(false);
        expect(stats.forbidden.value).toBe(false);
    });

    it('takes a caller\'s own fixed window', async () => {
        const { queries } = mountStats((query) => answer(query, 3), { days: 30, granularity: 'day' });
        await flushPromises();

        expect(queries[0].days).toEqual(30);
        expect(queries[0].granularity).toEqual('day');
    });

    it('reloads when the window changes', async () => {
        const { window, queries } = mountStats((query) => answer(query, 3));
        await flushPromises();

        window.value = ENTITY_STATS_WINDOWS['24h'];
        await flushPromises();

        expect(queries).toHaveLength(2);
        expect(queries[1].days).toEqual(ENTITY_STATS_WINDOWS['24h'].days);
        expect(queries[1].granularity).toEqual('hour');
    });

    it('reloads when the filters change', async () => {
        const { realmId, queries } = mountStats((query) => answer(query, 3));
        await flushPromises();

        realmId.value = OTHER_REALM_ID;
        await flushPromises();

        expect(queries).toHaveLength(2);
        expect(queries[1].filters).toEqual({ realmId: [OTHER_REALM_ID, null] });
    });

    it('clears the previous scope\'s answer when the reload for a new scope fails', async () => {
        let calls = 0;
        const {
            stats, 
            errors, 
            realmId, 
        } = mountStats((query) => {
            calls += 1;
            if (calls > 1) {
                throw new Error('down');
            }

            return answer(query, 3);
        });
        await flushPromises();
        expect(stats.response.value?.data[0].count).toEqual(3);

        realmId.value = OTHER_REALM_ID;
        await flushPromises();

        expect(errors).toHaveLength(1);
        expect(stats.response.value).toBeNull();
        expect(stats.busy.value).toBe(false);
    });

    it('keeps the answer when a reload of the same scope fails', async () => {
        let calls = 0;
        const { stats, errors } = mountStats((query) => {
            calls += 1;
            if (calls > 1) {
                throw new Error('down');
            }

            return answer(query, 3);
        });
        await flushPromises();

        await stats.load();

        expect(errors).toHaveLength(1);
        expect(stats.response.value?.data[0].count).toEqual(3);
        expect(stats.busy.value).toBe(false);
    });

    it('drops an answer that lands after a newer request', async () => {
        const pending : Array<(response: EntityStatsResponseLike) => void> = [];
        const { stats, window } = mountStats((query) => new Promise<EntityStatsResponseLike>((resolve) => {
            pending.push((response) => resolve({ ...response, meta: { ...response.meta, days: query.days ?? 0 } }));
        }));
        await flushPromises();

        window.value = ENTITY_STATS_WINDOWS['24h'];
        await flushPromises();
        expect(pending).toHaveLength(2);

        pending[1](answer({}, 9));
        await flushPromises();
        pending[0](answer({}, 3));
        await flushPromises();

        expect(stats.response.value?.meta.days).toEqual(1);
        expect(stats.response.value?.data[0].count).toEqual(9);
        expect(stats.busy.value).toBe(false);
    });

    it('raises forbidden on a 403 without surfacing it as an error', async () => {
        const { stats, errors } = mountStats(() => {
            throw forbidden();
        });
        await flushPromises();

        expect(stats.forbidden.value).toBe(true);
        expect(stats.response.value).toBeNull();
        expect(stats.busy.value).toBe(false);
        expect(errors).toHaveLength(0);
    });

    it('drops the answer held before a scope turned forbidden', async () => {
        let calls = 0;
        const { stats, realmId } = mountStats((query) => {
            calls += 1;
            if (calls > 1) {
                throw forbidden();
            }

            return answer(query, 3);
        });
        await flushPromises();
        expect(stats.response.value?.data[0].count).toEqual(3);

        realmId.value = OTHER_REALM_ID;
        await flushPromises();

        expect(stats.forbidden.value).toBe(true);
        expect(stats.response.value).toBeNull();
    });

    it('lowers forbidden once a later scope answers', async () => {
        let calls = 0;
        const { stats, realmId } = mountStats((query) => {
            calls += 1;
            if (calls === 1) {
                throw forbidden();
            }

            return answer(query, 5);
        });
        await flushPromises();
        expect(stats.forbidden.value).toBe(true);

        realmId.value = OTHER_REALM_ID;
        await flushPromises();

        expect(stats.forbidden.value).toBe(false);
        expect(stats.response.value?.data[0].count).toEqual(5);
    });
});

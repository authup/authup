/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { EntityStatsQuery } from '@authup/core-http-kit';
import { buildQueryString } from '@authup/core-http-kit';
import { flushPromises, mount } from '@vue/test-utils';
import { defineComponent, h, ref } from 'vue';
import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';
import type {
    EntityStats,
    EntityStatsResponseLike,
    EntityStatsWindowEntry,
} from '../../src/composables/entity-stats';
import {
    ENTITY_STATS_WINDOWS,
    buildStatsWindowStart,
    isStatsWindowCovered,
    useEntityStats,
} from '../../src/composables/entity-stats';

const REALM_ID = '4f0f6f2c-4a0b-4f4a-9a3f-4b7d4b4a1f11';
const OTHER_REALM_ID = '9a1b2c3d-4e5f-4a6b-8c7d-0e1f2a3b4c5d';

const NOW = new Date('2026-09-22T10:05:00.000Z');

function answer(_query: EntityStatsQuery, count: number, total = count, bucket: 'hour' | 'day' = 'day'): EntityStatsResponseLike {
    return {
        data: [
            {
                createdAt: '2026-09-22T00:00:00.000Z',
                count,
            },
        ],
        meta: {
            from: '2026-09-15T00:00:00.000Z',
            to: '2026-09-22T10:00:00.000Z',
            bucket,
            total,
            schema: {} as EntityStatsResponseLike['meta']['schema'],
        },
    };
}

function encode(query: EntityStatsQuery) : string {
    return decodeURIComponent(buildQueryString(query));
}

/**
 * The realm the query's filter names first.
 */
function realmOf(query: EntityStatsQuery) : string | null {
    const match = encode(query).match(/in\(realmId,'?([^',)]*)/);

    return match ? match[1] : null;
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

function mountStats(
    handler: Handler,
    window: EntityStatsWindowEntry = ENTITY_STATS_WINDOWS['7d'],
    groups?: string[],
) {
    const queries : EntityStatsQuery[] = [];
    const errors : unknown[] = [];

    const realmId = ref<string | null>(REALM_ID);
    const windowRef = ref<EntityStatsWindowEntry>(window);
    const paused = ref(false);
    const tick = ref(0);
    let stats : EntityStats | undefined;

    const component = defineComponent({
        setup() {
            stats = useEntityStats({
                load: async (query) => {
                    queries.push(query);

                    return handler(query);
                },
                // `tick` recomputes an EQUAL filter object on demand
                filters: () => ({ realmId: [realmId.value, null], ...(tick.value < 0 ? { name: 'never' } : {}) }),
                window: windowRef,
                groups,
                paused,
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
        paused,
        tick,
        queries,
        errors,
    };
}

describe('src/composables/entity-stats', () => {
    beforeEach(() => {
        vi.useFakeTimers({ toFake: ['Date'] });
        vi.setSystemTime(NOW);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe('buildStatsWindowStart', () => {
        it('snaps a day window onto the day it starts, counting today', () => {
            expect(buildStatsWindowStart({ days: 7, unit: 'day' }, NOW)).toEqual('2026-09-16T00:00:00.000Z');
            expect(buildStatsWindowStart({ days: 1, unit: 'day' }, NOW)).toEqual('2026-09-22T00:00:00.000Z');
        });

        it('snaps an hour window onto the hour 23 hours back, 24 buckets with the current one', () => {
            expect(buildStatsWindowStart({ days: 1, unit: 'hour' }, NOW)).toEqual('2026-09-21T11:00:00.000Z');
        });
    });

    describe('isStatsWindowCovered', () => {
        const covered = (key: keyof typeof ENTITY_STATS_WINDOWS, retentionDays: number, aggregateFrom: string | null) => isStatsWindowCovered(
            ENTITY_STATS_WINDOWS[key],
            { retentionDays, aggregateFrom },
            NOW,
        );

        it('disables the day windows past both the raw retention and 7 days of rollups', () => {
            expect(covered('7d', 7, '2026-09-16')).toBe(true);
            expect(covered('30d', 7, '2026-09-16')).toBe(false);
            expect(covered('90d', 7, '2026-09-16')).toBe(false);
            expect(covered('30d', 7, null)).toBe(false);
        });

        it('enables the day windows the rollups reach, whatever the raw retention', () => {
            expect(covered('30d', 7, '2026-06-14')).toBe(true);
            expect(covered('90d', 7, '2026-06-14')).toBe(true);
        });

        it('enables every window under a raw retention of forever', () => {
            expect(covered('90d', 0, null)).toBe(true);
        });

        it('caps an hour window by the raw retention alone', () => {
            expect(covered('24h', 7, null)).toBe(true);
            expect(isStatsWindowCovered({ days: 3, unit: 'hour' }, { retentionDays: 1, aggregateFrom: '2026-01-01' }, NOW)).toBe(false);
        });
    });

    it('loads the window as a grouped query, scoped by the filters', async () => {
        const { stats, queries } = mountStats((query) => answer(query, 3, 12));
        await flushPromises();

        expect(queries).toHaveLength(1);
        const encoded = encode(queries[0]);
        expect(encoded).toContain(`in(realmId,'${REALM_ID}',null)`);
        expect(encoded).toContain('gte(createdAt,\'2026-09-16T00:00:00.000Z\')');
        expect(encoded).toContain('group=bucket(createdAt,day)');
        expect(encoded).toContain('aggregate=count');
        expect(encoded).not.toContain('days=');
        expect(encoded).not.toContain('granularity=');
        expect(stats.response.value?.meta.total).toEqual(12);
        expect(stats.response.value?.data[0].count).toEqual(3);
        expect(stats.busy.value).toBe(false);
        expect(stats.forbidden.value).toBe(false);
    });

    it('loads the window alone for empty filters', async () => {
        const queries : EntityStatsQuery[] = [];
        mount(defineComponent({
            setup() {
                useEntityStats({
                    load: async (query) => {
                        queries.push(query);

                        return answer(query, 1);
                    },
                    filters: () => ({}),
                    window: ENTITY_STATS_WINDOWS['7d'],
                });

                return () => h('div');
            },
        }));
        await flushPromises();

        expect(queries).toHaveLength(1);
        expect(encode(queries[0])).toContain('gte(createdAt,\'2026-09-16T00:00:00.000Z\')');
    });

    it('takes a caller\'s own fixed window', async () => {
        const { queries } = mountStats((query) => answer(query, 3), { days: 30, unit: 'day' });
        await flushPromises();

        expect(encode(queries[0])).toContain('gte(createdAt,\'2026-08-24T00:00:00.000Z\')');
    });

    it('groups by the caller\'s keys after the bucket', async () => {
        const { queries } = mountStats((query) => answer(query, 1), ENTITY_STATS_WINDOWS['7d'], ['scope', 'name']);
        await flushPromises();

        expect(encode(queries[0])).toContain('group=bucket(createdAt,day),scope,name');
    });

    it('loads once for the same window within one hour and again in the next', async () => {
        const { tick, queries } = mountStats((query) => answer(query, 3), ENTITY_STATS_WINDOWS['24h']);
        await flushPromises();

        vi.setSystemTime(new Date('2026-09-22T10:40:00.000Z'));
        tick.value += 1;
        await flushPromises();
        expect(queries).toHaveLength(1);

        vi.setSystemTime(new Date('2026-09-22T11:01:00.000Z'));
        tick.value += 1;
        await flushPromises();
        expect(queries).toHaveLength(2);
        expect(encode(queries[1])).toContain('gte(createdAt,\'2026-09-21T12:00:00.000Z\')');
    });

    it('reloads when the window changes', async () => {
        const { window, queries } = mountStats((query) => answer(query, 3));
        await flushPromises();

        window.value = ENTITY_STATS_WINDOWS['24h'];
        await flushPromises();

        expect(queries).toHaveLength(2);
        expect(encode(queries[1])).toContain('group=bucket(createdAt,hour)');
    });

    it('reloads when the filters change', async () => {
        const { realmId, queries } = mountStats((query) => answer(query, 3));
        await flushPromises();

        realmId.value = OTHER_REALM_ID;
        await flushPromises();

        expect(queries).toHaveLength(2);
        expect(realmOf(queries[1])).toEqual(OTHER_REALM_ID);
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
            pending.push((response) => resolve({ ...response, meta: { ...response.meta, bucket: encode(query).includes('hour') ? 'hour' : 'day' } }));
        }));
        await flushPromises();

        window.value = ENTITY_STATS_WINDOWS['24h'];
        await flushPromises();
        expect(pending).toHaveLength(2);

        pending[1](answer({}, 9));
        await flushPromises();
        pending[0](answer({}, 3));
        await flushPromises();

        expect(stats.response.value?.meta.bucket).toEqual('hour');
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

    it('does not reload for an equal filter recomputed as a new object', async () => {
        const { tick, queries } = mountStats((query) => answer(query, 3));
        await flushPromises();

        tick.value += 1;
        await flushPromises();

        expect(queries).toHaveLength(1);
    });

    it('waits while paused and loads the settled scope once resumed', async () => {
        const {
            stats, 
            realmId, 
            paused, 
            queries, 
        } = mountStats((query) => answer(query, 3));
        await flushPromises();

        paused.value = true;
        realmId.value = null;
        await flushPromises();
        realmId.value = OTHER_REALM_ID;
        await flushPromises();

        expect(queries).toHaveLength(1);
        expect(stats.response.value).not.toBeNull();

        paused.value = false;
        await flushPromises();

        expect(queries).toHaveLength(2);
        expect(realmOf(queries[1])).toEqual(OTHER_REALM_ID);
    });

    it('keeps the previous answer up while a new scope loads', async () => {
        let release : (() => void) | undefined;
        const { stats, realmId } = mountStats((query) => {
            if (realmOf(query) === OTHER_REALM_ID) {
                return new Promise((resolve) => {
                    release = () => resolve(answer(query, 9));
                });
            }

            return answer(query, 3);
        });
        await flushPromises();

        realmId.value = OTHER_REALM_ID;
        await flushPromises();

        expect(stats.busy.value).toBe(true);
        expect(stats.response.value?.meta.total).toEqual(3);

        release!();
        await flushPromises();

        expect(stats.response.value?.meta.total).toEqual(9);
    });
});

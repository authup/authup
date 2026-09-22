/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { extractErrorContext } from '@authup/client-web-kit';
import type { EntityStatsMeta, EntityStatsQuery } from '@authup/core-http-kit';
import { StatsGranularity } from '@authup/core-http-kit';
import type { MaybeRefOrGetter, Ref } from 'vue';
import { ref, toValue, watch } from 'vue';

export type EntityStatsWindow = '24h' | '7d' | '30d' | '90d';

export type EntityStatsWindowEntry = {
    days: number,
    granularity: `${StatsGranularity}`,
};

/**
 * The windows the dashboard offers: hours for a day, days for the rest.
 */
export const ENTITY_STATS_WINDOWS : Record<EntityStatsWindow, EntityStatsWindowEntry> = {
    '24h': { days: 1, granularity: StatsGranularity.HOUR },
    '7d': { days: 7, granularity: StatsGranularity.DAY },
    '30d': { days: 30, granularity: StatsGranularity.DAY },
    '90d': { days: 90, granularity: StatsGranularity.DAY },
};

/**
 * What any `GET /<collection>/@stats` answers, stated structurally so the
 * event read (whose buckets carry `scope` and `name`, and whose meta carries
 * `enabled`) and the plain entity reads fit the same composable.
 */
export type EntityStatsResponseLike = {
    data: { bucket: string, count: number }[],
    meta: EntityStatsMeta,
};

/**
 * One entity's statistics read, `client.<entity>.getStats` bound to its
 * client. A parameter rather than the client itself, so the composable
 * knows no entity and a page hands it whichever facet it lists.
 */
export type EntityStatsLoadFn<R extends EntityStatsResponseLike = EntityStatsResponseLike> = (query: EntityStatsQuery) => Promise<R>;

export type EntityStatsOptions<R extends EntityStatsResponseLike = EntityStatsResponseLike> = {
    load: EntityStatsLoadFn<R>,
    /**
     * The rows to count, in the entity's own filter vocabulary: the header
     * realm switcher's scope, a list page's folder scope. The window is not
     * a filter and rides `window` instead.
     */
    filters?: MaybeRefOrGetter<EntityStatsQuery['filters']>,
    /**
     * The `{ days, granularity }` pair: one of `ENTITY_STATS_WINDOWS` for a
     * dashboard window, or a caller's own fixed one.
     */
    window: MaybeRefOrGetter<EntityStatsWindowEntry>,
    /**
     * Called for a failed read the caller should surface. A 403 is not one
     * of them: it sets `forbidden` instead, since a control the actor may
     * not see hides itself rather than complaining.
     */
    onError?: (error: unknown) => void,
};

export type EntityStats<R extends EntityStatsResponseLike = EntityStatsResponseLike> = {
    response: Ref<R | null>,
    busy: Ref<boolean>,
    /**
     * The last read answered 403: the actor may not read this entity's
     * list, so nothing derived from the read should render.
     */
    forbidden: Ref<boolean>,
    load: () => Promise<void>,
};

/**
 * One statistics read, reloaded when its filters or its window change.
 *
 * A reply that lands after a newer request is dropped, and a scope change
 * clears the previous answer before it loads, so a failure never shows one
 * scope's counts under another's label; a reload of the SAME scope that
 * fails keeps what it had. A 403 clears the answer and raises `forbidden`
 * without calling `onError`, and the next answered read lowers it again.
 */
export function useEntityStats<R extends EntityStatsResponseLike = EntityStatsResponseLike>(
    options: EntityStatsOptions<R>,
): EntityStats<R> {
    const response = ref<R | null>(null) as Ref<R | null>;
    const busy = ref(false);
    const forbidden = ref(false);
    let generation = 0;

    const load = async () => {
        generation += 1;
        const current = generation;
        busy.value = true;

        try {
            const { days, granularity } = toValue(options.window);
            const next = await options.load({
                filters: toValue(options.filters),
                days,
                granularity,
            });

            if (current === generation) {
                response.value = next;
                forbidden.value = false;
            }
        } catch (e) {
            if (current !== generation) {
                return;
            }

            if (extractErrorContext(e).status === 403) {
                response.value = null;
                forbidden.value = true;
                return;
            }

            if (options.onError) {
                options.onError(e);
            }
        } finally {
            if (current === generation) {
                busy.value = false;
            }
        }
    };

    // a changed scope drops the answer of the previous one first: a failed
    // reload must not leave the old realm's or window's numbers under the
    // new label. A manual reload of the same scope keeps its answer.
    watch([() => toValue(options.filters), () => toValue(options.window)], () => {
        response.value = null;
        return load();
    }, { immediate: true });

    return {
        response,
        busy,
        forbidden,
        load,
    };
}

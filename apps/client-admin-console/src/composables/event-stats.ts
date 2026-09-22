/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { EventStatsResponse, IClient } from '@authup/core-http-kit';
import { EventStatsGranularity } from '@authup/core-kit';
import type { Ref } from 'vue';
import { ref, watch } from 'vue';

export type EventStatsWindow = '24h' | '7d' | '30d' | '90d';

export type EventStatsWindowEntry = {
    days: number,
    granularity: `${EventStatsGranularity}`,
};

/**
 * The windows the dashboard offers: hours for a day, days for the rest.
 */
export const EVENT_STATS_WINDOWS : Record<EventStatsWindow, EventStatsWindowEntry> = {
    '24h': { days: 1, granularity: EventStatsGranularity.HOUR },
    '7d': { days: 7, granularity: EventStatsGranularity.DAY },
    '30d': { days: 30, granularity: EventStatsGranularity.DAY },
    '90d': { days: 90, granularity: EventStatsGranularity.DAY },
};

export type EventStatsOptions = {
    client: IClient,
    /**
     * The header realm switcher's realm; the read counts its rows plus the
     * global ones, the scope every list page applies.
     */
    realmId: Ref<string | null | undefined>,
    window?: EventStatsWindow,
    onError?: (error: unknown) => void,
};

export type EventStats = {
    window: Ref<EventStatsWindow>,
    response: Ref<EventStatsResponse | null>,
    busy: Ref<boolean>,
    load: () => Promise<void>,
};

/**
 * The dashboard's read: GET /events/stats for the selected window, reloaded
 * when the window or the realm changes. A reply that lands after a newer
 * request is dropped, and a scope change clears the previous answer before
 * it loads, so a failure never shows one scope's counts under another's
 * label.
 */
export function useEventStats(options: EventStatsOptions): EventStats {
    const window = ref<EventStatsWindow>(options.window ?? '7d');
    const response = ref<EventStatsResponse | null>(null);
    const busy = ref(false);
    let generation = 0;

    const load = async () => {
        generation += 1;
        const current = generation;
        busy.value = true;

        try {
            const { days, granularity } = EVENT_STATS_WINDOWS[window.value];
            const next = await options.client.event.getStats({
                filters: { realmId: [options.realmId.value ?? null, null] },
                days,
                granularity,
            });

            if (current === generation) {
                response.value = next;
            }
        } catch (e) {
            if (current === generation && options.onError) {
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
    watch([options.realmId, window], () => {
        response.value = null;
        return load();
    }, { immediate: true });

    return {
        window,
        response,
        busy,
        load,
    };
}

/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { EventStatsResponse, IClient } from '@authup/core-http-kit';
import type { Ref } from 'vue';
import { computed, ref } from 'vue';
import type { EntityStatsWindow, EntityStatsWindowEntry } from './entity-stats';
import { ENTITY_STATS_WINDOWS, useEntityStats } from './entity-stats';

export type EventStatsWindow = EntityStatsWindow;

export type EventStatsWindowEntry = EntityStatsWindowEntry;

export const EVENT_STATS_WINDOWS = ENTITY_STATS_WINDOWS;

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
    forbidden: Ref<boolean>,
    load: () => Promise<void>,
};

/**
 * The dashboard's event read: `GET /events/@stats` for the selected window,
 * scoped to the realm plus the global rows. It owns the window ref the
 * dashboard's other reads share, and is otherwise {@see useEntityStats}.
 */
export function useEventStats(options: EventStatsOptions): EventStats {
    const window = ref<EventStatsWindow>(options.window ?? '7d');

    const stats = useEntityStats<EventStatsResponse>({
        load: (query) => options.client.event.getStats(query),
        filters: computed(() => ({ realmId: [options.realmId.value ?? null, null] })),
        window: computed(() => ENTITY_STATS_WINDOWS[window.value]),
        groups: ['scope', 'name'],
        onError: options.onError,
    });

    return {
        window,
        response: stats.response,
        busy: stats.busy,
        forbidden: stats.forbidden,
        load: stats.load,
    };
}

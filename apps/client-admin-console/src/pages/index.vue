<!--
  - Copyright (c) 2026.
  - Author Peter Placzek (tada5hi)
  - For the full copyright and license information,
  - view the LICENSE file that was distributed with this source code.
  -->
<script lang="ts">
import { EventName, EventStatsGranularity } from '@authup/core-kit';
import { TranslatorTranslationAppKey, TranslatorTranslationNamespace } from '@authup/i18n';
import {
    injectHTTPClient,
    injectStore,
    injectTranslatorLocale,
    useTranslationsForNamespace,
} from '@authup/client-web-kit';
import { VCButton } from '@vuecs/button';
import { VCAlert } from '@vuecs/elements';
import { VCIcon } from '@vuecs/icon';
import { VCLink } from '@vuecs/link';
import { storeToRefs } from 'pinia';
import { computed, defineComponent } from 'vue';
import EventVolumeChart from '../components/dashboard/EventVolumeChart.vue';
import type { EventVolumeSeries } from '../components/dashboard/EventVolumeChart.vue';
import {
    alignEventStats,
    buildBucketAxis,
    rankEventStats,
    sumEventStats,
} from '../components/dashboard/stats';
import type { EventStatsWindow } from '../composables/event-stats';
import { EVENT_STATS_WINDOWS, useEventStats } from '../composables/event-stats';
import { useErrorToast } from '../composables/error';

type WindowLabelKey = TranslatorTranslationAppKey.DASHBOARD_WINDOW_24H |
    TranslatorTranslationAppKey.DASHBOARD_WINDOW_7D |
    TranslatorTranslationAppKey.DASHBOARD_WINDOW_30D |
    TranslatorTranslationAppKey.DASHBOARD_WINDOW_90D;

const WINDOW_LABELS : Record<EventStatsWindow, WindowLabelKey> = {
    '24h': TranslatorTranslationAppKey.DASHBOARD_WINDOW_24H,
    '7d': TranslatorTranslationAppKey.DASHBOARD_WINDOW_7D,
    '30d': TranslatorTranslationAppKey.DASHBOARD_WINDOW_30D,
    '90d': TranslatorTranslationAppKey.DASHBOARD_WINDOW_90D,
};

const RANK_LIMIT = 10;

// The landing page: grouped event counts over a window, scoped by the
// header realm switcher like every list page (the realm plus the global
// rows). The read is GET /events/stats; an actor without event_read is
// answered its own rows, so the page needs no permission gate of its own.
export default defineComponent({
    components: {
        EventVolumeChart,
        VCAlert,
        VCButton,
        VCIcon,
        VCLink,
    },
    setup() {
        const store = injectStore();
        const { realmManagementId } = storeToRefs(store);
        const locale = injectTranslatorLocale();
        const errorToast = useErrorToast();

        const translations = useTranslationsForNamespace(
            TranslatorTranslationNamespace.APP,
            [
                { key: TranslatorTranslationAppKey.DASHBOARD },
                { key: TranslatorTranslationAppKey.DASHBOARD_DESCRIPTION },
                { key: TranslatorTranslationAppKey.DASHBOARD_WINDOW },
                { key: TranslatorTranslationAppKey.DASHBOARD_WINDOW_24H },
                { key: TranslatorTranslationAppKey.DASHBOARD_WINDOW_7D },
                { key: TranslatorTranslationAppKey.DASHBOARD_WINDOW_30D },
                { key: TranslatorTranslationAppKey.DASHBOARD_WINDOW_90D },
                { key: TranslatorTranslationAppKey.DASHBOARD_LOGINS },
                { key: TranslatorTranslationAppKey.DASHBOARD_LOGINS_FAILED },
                { key: TranslatorTranslationAppKey.DASHBOARD_AUTHORIZATIONS },
                { key: TranslatorTranslationAppKey.DASHBOARD_EVENTS },
                { key: TranslatorTranslationAppKey.DASHBOARD_LOGIN_VOLUME },
                { key: TranslatorTranslationAppKey.DASHBOARD_EVENTS_BY_TYPE },
                { key: TranslatorTranslationAppKey.DASHBOARD_EVENTS_LINK },
                { key: TranslatorTranslationAppKey.DASHBOARD_EMPTY },
                { key: TranslatorTranslationAppKey.DASHBOARD_EVENT_LOG_DISABLED },
            ],
        );

        const {
            window, 
            response, 
            busy, 
        } = useEventStats({
            client: injectHTTPClient(),
            realmId: realmManagementId,
            onError: (e) => errorToast.show(e),
        });

        const rows = computed(() => response.value?.data ?? []);
        const enabled = computed(() => response.value?.meta.enabled !== false);
        const hourly = computed(() => response.value?.meta.granularity === EventStatsGranularity.HOUR);
        const axis = computed(() => (response.value ? buildBucketAxis(response.value.meta) : []));

        const labelFormat = computed(() => new Intl.DateTimeFormat(locale.value, hourly.value ?
            { hour: '2-digit' } :
            { month: 'short', day: 'numeric' }));
        const titleFormat = computed(() => new Intl.DateTimeFormat(locale.value, hourly.value ?
            { dateStyle: 'medium', timeStyle: 'short' } :
            { dateStyle: 'medium' }));
        const numberFormat = computed(() => new Intl.NumberFormat(locale.value));

        const labels = computed(() => axis.value.map((bucket) => labelFormat.value.format(new Date(bucket))));
        const titles = computed(() => axis.value.map((bucket) => titleFormat.value.format(new Date(bucket))));

        const series = computed<EventVolumeSeries[]>(() => [
            {
                label: translations.dashboardLogins,
                values: alignEventStats(rows.value, axis.value, EventName.LOGIN),
                token: '--vc-color-primary-600',
            },
            {
                label: translations.dashboardLoginsFailed,
                values: alignEventStats(rows.value, axis.value, EventName.LOGIN_FAILED),
                token: '--vc-color-error-600',
            },
        ]);

        const tiles = computed(() => [
            {
                label: translations.dashboardLogins,
                value: sumEventStats(rows.value, EventName.LOGIN),
                icon: 'fa6-solid:right-to-bracket',
            },
            {
                label: translations.dashboardLoginsFailed,
                value: sumEventStats(rows.value, EventName.LOGIN_FAILED),
                icon: 'fa6-solid:triangle-exclamation',
            },
            {
                label: translations.dashboardAuthorizations,
                value: sumEventStats(rows.value, EventName.AUTHORIZE),
                icon: 'fa6-solid:key',
            },
            {
                label: translations.dashboardEvents,
                value: sumEventStats(rows.value),
                icon: 'fa6-solid:clipboard-list',
            },
        ]);

        const ranked = computed(() => rankEventStats(rows.value).slice(0, RANK_LIMIT));
        const rankedMax = computed(() => ranked.value[0]?.count ?? 0);

        const share = (count: number) => (rankedMax.value > 0 ?
            `${Math.round((count / rankedMax.value) * 100)}%` :
            '0%');

        return {
            axis,
            busy,
            enabled,
            labels,
            numberFormat,
            ranked,
            series,
            share,
            tiles,
            titles,
            translations,
            window,
            windowLabels: WINDOW_LABELS,
            windows: EVENT_STATS_WINDOWS,
        };
    },
});
</script>
<template>
    <div>
        <div class="mb-3 flex flex-wrap items-start justify-between gap-3">
            <div>
                <h1 class="title no-border mb-0">
                    <VCIcon
                        name="fa6-solid:gauge-high"
                        class="me-1"
                    /> {{ translations.dashboard }}
                </h1>
                <p class="sub-title">
                    {{ translations.dashboardDescription }}
                </p>
            </div>
            <div
                class="flex flex-wrap gap-1"
                role="group"
                :aria-label="translations.dashboardWindow"
            >
                <VCButton
                    v-for="(_entry, key) in windows"
                    :key="key"
                    size="sm"
                    :color="window === key ? 'primary' : 'neutral'"
                    :variant="window === key ? 'solid' : 'outline'"
                    :aria-pressed="window === key"
                    @click="window = key"
                >
                    {{ translations[windowLabels[key]] }}
                </VCButton>
            </div>
        </div>

        <VCAlert
            v-if="!enabled"
            color="warning"
            variant="soft"
        >
            {{ translations.dashboardEventLogDisabled }}
        </VCAlert>
        <template v-else>
            <div
                class="mb-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
                :class="{ 'opacity-60': busy }"
            >
                <div
                    v-for="tile in tiles"
                    :key="tile.label"
                    class="rounded-lg border border-border bg-bg-elevated p-4"
                >
                    <div class="flex items-center gap-2 text-sm text-fg-muted">
                        <VCIcon :name="tile.icon" />
                        {{ tile.label }}
                    </div>
                    <div class="mt-1 text-3xl font-semibold">
                        {{ numberFormat.format(tile.value) }}
                    </div>
                </div>
            </div>

            <div class="mb-3 grid gap-3 xl:grid-cols-3">
                <div
                    class="rounded-lg border border-border bg-bg-elevated p-4 xl:col-span-2"
                    :class="{ 'opacity-60': busy }"
                >
                    <h2 class="mb-2 text-sm font-semibold text-fg-muted">
                        {{ translations.dashboardLoginVolume }}
                    </h2>
                    <EventVolumeChart
                        v-if="axis.length > 0"
                        :labels="labels"
                        :titles="titles"
                        :series="series"
                    />
                </div>

                <div
                    class="rounded-lg border border-border bg-bg-elevated p-4"
                    :class="{ 'opacity-60': busy }"
                >
                    <h2 class="mb-2 text-sm font-semibold text-fg-muted">
                        {{ translations.dashboardEventsByType }}
                    </h2>
                    <p
                        v-if="ranked.length === 0 && !busy"
                        class="text-sm text-fg-muted"
                    >
                        {{ translations.dashboardEmpty }}
                    </p>
                    <ul
                        v-else
                        class="m-0 flex list-none flex-col gap-2 p-0"
                    >
                        <li
                            v-for="entry in ranked"
                            :key="`${entry.scope}:${entry.name}`"
                        >
                            <div class="flex items-baseline justify-between gap-2 text-sm">
                                <span>
                                    <span class="text-fg-muted">{{ entry.scope }}.</span>{{ entry.name }}
                                </span>
                                <span class="tabular-nums">{{ numberFormat.format(entry.count) }}</span>
                            </div>
                            <div class="mt-1 h-1.5 w-full rounded-full bg-bg-muted">
                                <div
                                    class="h-full rounded-full bg-primary-600"
                                    :style="{ width: share(entry.count) }"
                                />
                            </div>
                        </li>
                    </ul>
                    <VCLink
                        to="/events"
                        class="mt-3 inline-flex items-center gap-1 text-sm"
                    >
                        {{ translations.dashboardEventsLink }}
                        <VCIcon name="fa6-solid:arrow-right" />
                    </VCLink>
                </div>
            </div>
        </template>
    </div>
</template>

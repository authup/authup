<!--
  - Copyright (c) 2026.
  - Author Peter Placzek (tada5hi)
  - For the full copyright and license information,
  - view the LICENSE file that was distributed with this source code.
  -->
<script lang="ts">
import { EventName } from '@authup/core-kit';
import type { EntityStatsQuery } from '@authup/core-http-kit';
import { StatsGranularity } from '@authup/core-http-kit';
import {
    TranslatorTranslationAppKey,
    TranslatorTranslationEntityKey,
    TranslatorTranslationNamespace,
} from '@authup/i18n';
import {
    injectHTTPClient,
    injectStore,
    injectTranslatorLocale,
    useTranslation,
    useTranslations,
    useTranslationsForNamespace,
} from '@authup/client-web-kit';
import { and, gt, inArray } from '@rapiq/core';
import { VCAlert } from '@vuecs/elements';
import { VCIcon } from '@vuecs/icon';
import { VCLink } from '@vuecs/link';
import { storeToRefs } from 'pinia';
import type { ComputedRef, MaybeRefOrGetter, Ref } from 'vue';
import { computed, defineComponent } from 'vue';
import EventVolumeChart from '../components/dashboard/EventVolumeChart.vue';
import type { EventVolumeSeries } from '../components/dashboard/EventVolumeChart.vue';
import {
    alignEventStats,
    buildBucketAxis,
    rankEventStats,
    sumEventStats,
    sumStats,
} from '../components/dashboard/stats';
import { LayoutSection, LayoutSections } from '../config/layout';
import type { EntityStats, EntityStatsLoadFn } from '../composables/entity-stats';
import { ENTITY_STATS_WINDOWS, useEntityStats } from '../composables/entity-stats';
import { useEventStats } from '../composables/event-stats';
import StatsWindowSwitch from '../components/stats/StatsWindowSwitch.vue';
import { useErrorToast } from '../composables/error';

const RANK_LIMIT = 10;

/**
 * One entity tile: its statistics read plus what the template renders.
 * `growth` is the rows the window added, worded per tile (in N days, in
 * N hours, or plainly "new" for the sessions still active).
 */
type EntityTile = {
    key: string,
    label: ComputedRef<string>,
    icon: string,
    url: string,
    stats: EntityStats,
    growth: Ref<string>,
};

type EntityTileGroup = {
    key: string,
    title: string,
    tiles: {
        key: string,
        label: string,
        icon: string,
        url: string,
        total: string,
        growth: string,
        busy: boolean,
    }[],
};

// The landing page: grouped event counts over a window, scoped by the
// header realm switcher like every list page (the realm plus the global
// rows). The read is GET /events/@stats; an actor without event_read is
// answered its own rows, so the page needs no permission gate of its own.
// The entity tiles above it read each list's own GET /<collection>/@stats
// with the same scope and window, and a tile whose read is refused hides.
export default defineComponent({
    components: {
        EventVolumeChart,
        StatsWindowSwitch,
        VCAlert,
        VCIcon,
        VCLink,
    },
    setup() {
        const store = injectStore();
        const { realmManagementId } = storeToRefs(store);
        const locale = injectTranslatorLocale();
        const errorToast = useErrorToast();
        const client = injectHTTPClient();

        const translations = useTranslationsForNamespace(
            TranslatorTranslationNamespace.APP,
            [
                { key: TranslatorTranslationAppKey.DASHBOARD },
                { key: TranslatorTranslationAppKey.DASHBOARD_DESCRIPTION },
                { key: TranslatorTranslationAppKey.DASHBOARD_IDENTITIES },
                { key: TranslatorTranslationAppKey.DASHBOARD_CONFIGURATION },
                { key: TranslatorTranslationAppKey.SESSIONS_ACTIVE },
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

        const entityTranslations = useTranslations([
            {
                namespace: TranslatorTranslationNamespace.ENTITY,
                key: TranslatorTranslationEntityKey.USER,
                count: 2,
            },
            {
                namespace: TranslatorTranslationNamespace.ENTITY,
                key: TranslatorTranslationEntityKey.CLIENT,
                count: 2,
            },
            {
                namespace: TranslatorTranslationNamespace.ENTITY,
                key: TranslatorTranslationEntityKey.ROLE,
                count: 2,
            },
            {
                namespace: TranslatorTranslationNamespace.ENTITY,
                key: TranslatorTranslationEntityKey.PERMISSION,
                count: 2,
            },
            {
                namespace: TranslatorTranslationNamespace.ENTITY,
                key: TranslatorTranslationEntityKey.IDENTITY_PROVIDER,
                count: 2,
            },
        ]);

        const {
            window,
            response,
            busy,
        } = useEventStats({
            client,
            realmId: realmManagementId,
            onError: (e) => errorToast.show(e),
        });

        const windowEntry = computed(() => ENTITY_STATS_WINDOWS[window.value]);

        // the event chart and ranking read security events, kept
        // eventLogRetentionDays: a window past it is disabled, not undercounted
        const retentionDays = computed(() => response.value?.meta.retentionDays ?? 0);
        const retentionTitle = useTranslation({
            namespace: TranslatorTranslationNamespace.APP,
            key: TranslatorTranslationAppKey.STATS_WINDOW_RETAINED,
            data: { days: retentionDays },
        });
        const numberFormat = computed(() => new Intl.NumberFormat(locale.value));

        // The realm switcher's scope, the one every list page applies: the
        // realm plus the global rows.
        const realmFilters = computed<EntityStatsQuery['filters']>(() => ({ realmId: [realmManagementId.value ?? null, null] }));

        // A getter rather than a computed, so `now` is taken at every load
        // instead of once per realm: a session that lapsed since the page
        // opened must stop counting as active on the next window switch.
        // Truncated to the minute, since the server caches a statistic by its
        // lowered query and a millisecond instant would never hit it twice.
        const activeSessionFilters = () : EntityStatsQuery['filters'] => {
            const now = new Date();
            now.setUTCSeconds(0, 0);

            return and(
                inArray('realmId', [realmManagementId.value ?? null, null]),
                gt('expiresAt', now.toISOString()),
            );
        };

        const useWindowGrowth = (count: ComputedRef<number>) : Ref<string> => {
            const formatted = computed(() => numberFormat.value.format(count.value));
            const inDays = useTranslation({
                namespace: TranslatorTranslationNamespace.APP,
                key: TranslatorTranslationAppKey.STATS_NEW_IN_DAYS,
                data: {
                    count: formatted,
                    days: computed(() => windowEntry.value.days),
                },
            });
            const inHours = useTranslation({
                namespace: TranslatorTranslationNamespace.APP,
                key: TranslatorTranslationAppKey.STATS_NEW_IN_HOURS,
                data: {
                    count: formatted,
                    hours: computed(() => windowEntry.value.days * 24),
                },
            });

            return computed(() => (windowEntry.value.granularity === StatsGranularity.HOUR ?
                inHours.value :
                inDays.value));
        };

        const useNewGrowth = (count: ComputedRef<number>) : Ref<string> => useTranslation({
            namespace: TranslatorTranslationNamespace.APP,
            key: TranslatorTranslationAppKey.STATS_NEW,
            data: { count: computed(() => numberFormat.value.format(count.value)) },
        });

        const defineTile = (
            section: `${LayoutSection}`,
            label: ComputedRef<string>,
            load: EntityStatsLoadFn,
            options: {
                filters?: MaybeRefOrGetter<EntityStatsQuery['filters']>,
                growth?: (count: ComputedRef<number>) => Ref<string>,
            } = {},
        ) : EntityTile => {
            // No `onError`: a tile whose read fails stays hidden, and the
            // event read below already toasts an unreachable API once rather
            // than seven times.
            const stats = useEntityStats({
                load,
                filters: options.filters ?? realmFilters,
                window: windowEntry,
            });
            const count = computed(() => (stats.response.value ? sumStats(stats.response.value.data) : 0));

            return {
                key: section,
                label,
                icon: LayoutSections[section].icon,
                url: LayoutSections[section].url,
                stats,
                growth: (options.growth ?? useWindowGrowth)(count),
            };
        };

        const identityTiles : EntityTile[] = [
            defineTile(
                LayoutSection.USERS,
                computed(() => entityTranslations.user),
                (query) => client.user.getStats(query),
            ),
            defineTile(
                LayoutSection.CLIENTS,
                computed(() => entityTranslations.client),
                (query) => client.client.getStats(query),
            ),
            defineTile(
                LayoutSection.SESSIONS,
                computed(() => translations.sessionsActive),
                (query) => client.session.getStats(query),
                {
                    filters: activeSessionFilters,
                    growth: useNewGrowth,
                },
            ),
        ];

        const configurationTiles : EntityTile[] = [
            defineTile(
                LayoutSection.ROLES,
                computed(() => entityTranslations.role),
                (query) => client.role.getStats(query),
            ),
            defineTile(
                LayoutSection.PERMISSIONS,
                computed(() => entityTranslations.permission),
                (query) => client.permission.getStats(query),
            ),
            defineTile(
                LayoutSection.IDENTITY_PROVIDERS,
                computed(() => entityTranslations.identityProvider),
                (query) => client.identityProvider.getStats(query),
            ),
        ];

        const renderGroup = (key: string, title: string, tiles: EntityTile[]) : EntityTileGroup => ({
            key,
            title,
            // A tile renders once it has an answer: never a fabricated 0
            // while loading or after a failure, and a refused (403) read never
            // shows at all. A reload keeps the previous answer up, dimmed.
            tiles: tiles
                .filter((tile) => !tile.stats.forbidden.value && tile.stats.response.value !== null)
                .map((tile) => ({
                    key: tile.key,
                    label: tile.label.value,
                    icon: tile.icon,
                    url: tile.url,
                    total: numberFormat.value.format(tile.stats.response.value?.meta.total ?? 0),
                    growth: tile.growth.value,
                    busy: tile.stats.busy.value,
                })),
        });

        const entityGroups = computed<EntityTileGroup[]>(() => [
            renderGroup('identities', translations.dashboardIdentities, identityTiles),
            renderGroup('configuration', translations.dashboardConfiguration, configurationTiles),
        ].filter((group) => group.tiles.length > 0));

        const rows = computed(() => response.value?.data ?? []);
        const enabled = computed(() => response.value?.meta.enabled !== false);
        const hourly = computed(() => response.value?.meta.granularity === StatsGranularity.HOUR);
        const axis = computed(() => (response.value ? buildBucketAxis(response.value.meta) : []));

        const labelFormat = computed(() => new Intl.DateTimeFormat(locale.value, hourly.value ?
            { hour: '2-digit' } :
            { month: 'short', day: 'numeric' }));
        const titleFormat = computed(() => new Intl.DateTimeFormat(locale.value, hourly.value ?
            { dateStyle: 'medium', timeStyle: 'short' } :
            { dateStyle: 'medium' }));

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
            entityGroups,
            labels,
            numberFormat,
            ranked,
            series,
            share,
            tiles,
            titles,
            translations,
            window,
            retentionDays,
            retentionTitle,
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
            <StatsWindowSwitch
                v-model="window"
                :max-days="retentionDays"
                :disabled-title="retentionTitle"
            />
        </div>

        <div
            v-for="group in entityGroups"
            :key="group.key"
            class="mb-3"
        >
            <h2 class="mb-2 text-sm font-semibold text-fg-muted">
                {{ group.title }}
            </h2>
            <div class="grid gap-3 sm:grid-cols-3">
                <VCLink
                    v-for="tile in group.tiles"
                    :key="tile.key"
                    :to="tile.url"
                    class="block rounded-lg border border-border bg-bg-elevated p-4 no-underline"
                    :class="{ 'opacity-60': tile.busy }"
                >
                    <div class="flex items-center gap-2 text-sm text-fg-muted">
                        <VCIcon :name="tile.icon" />
                        {{ tile.label }}
                    </div>
                    <div class="mt-1 text-3xl font-semibold">
                        {{ tile.total }}
                    </div>
                    <div class="mt-1 text-sm text-fg-muted tabular-nums">
                        {{ tile.growth }}
                    </div>
                </VCLink>
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
            <h2 class="mb-2 text-sm font-semibold text-fg-muted">
                {{ translations.dashboardEvents }}
            </h2>
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

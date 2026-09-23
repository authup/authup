<!--
  - Copyright (c) 2026.
  - Author Peter Placzek (tada5hi)
  - For the full copyright and license information,
  - view the LICENSE file that was distributed with this source code.
  -->
<script lang="ts">
import {
    injectHTTPClient,
    injectStore,
    injectTranslatorLocale,
    usePermissionCheck,
    useTranslation,
    useTranslations,
} from '@authup/client-web-kit';
import type { EntityStatsQuery, EventStatsResponse } from '@authup/core-http-kit';
import { EntityDefaultEventName, EventScope, PermissionName } from '@authup/core-kit';
import { TranslatorTranslationAppKey, TranslatorTranslationNamespace } from '@authup/i18n';
import { storeToRefs } from 'pinia';
import type { PropType } from 'vue';
import { computed, defineComponent, ref } from 'vue';
import type { EntityStatsLoadFn, EntityStatsWindow } from '../../composables/entity-stats';
import { ENTITY_STATS_WINDOWS, useEntityStats } from '../../composables/entity-stats';
import StatsWindowSwitch from './StatsWindowSwitch.vue';

type Box = {
    key: string,
    label: string,
    value: string,
    hint: string,
};

// The boxes above an entity list: its total, and how many of its rows the
// audit log saw created, updated and deleted over the chosen window. The
// entity-CRUD audit rows live `eventLogEntityRetentionDays` (7 by default)
// and updates and deletions exist nowhere else, so a window past that
// retention is disabled rather than undercounted. They
// follow the realm switcher, not the list's folder or search: an audit row
// carries its owner realm and nothing else of the list's scope. The three
// operation boxes need event_read and are dropped without it, since a reader
// without the permission is answered its own rows only.
export default defineComponent({
    components: { StatsWindowSwitch },
    props: {
        /**
         * The entity type, the audit rows' `refType`.
         */
        type: {
            type: String,
            required: true,
        },
        /**
         * The entity's own statistic, for the total.
         */
        load: {
            type: Function as PropType<EntityStatsLoadFn>,
            required: true,
        },
        /**
         * `false` for an entity without an owner realm column (realms).
         */
        realmScoped: {
            type: Boolean,
            default: true,
        },
    },
    setup(props) {
        const client = injectHTTPClient();
        const store = injectStore();
        const { realmManagementId } = storeToRefs(store);
        const locale = injectTranslatorLocale();

        const canReadEvents = usePermissionCheck({ name: PermissionName.EVENT_READ });

        const window = ref<EntityStatsWindow>('7d');
        const windowEntry = computed(() => ENTITY_STATS_WINDOWS[window.value]);

        const realmFilter = () : Record<string, unknown> => (props.realmScoped ?
            { realmId: [realmManagementId.value ?? null, null] } :
            {});

        const totalStats = useEntityStats({
            load: (query) => props.load(query),
            filters: () => realmFilter() as EntityStatsQuery['filters'],
            // the total ignores the window, so it never reloads on a switch
            window: ENTITY_STATS_WINDOWS['7d'],
        });

        const eventStats = useEntityStats<EventStatsResponse>({
            load: (query) => client.event.getStats(query),
            filters: () => ({
                scope: EventScope.ENTITY,
                refType: props.type,
                ...realmFilter(),
            }) as EntityStatsQuery['filters'],
            window: windowEntry,
            groups: ['name'],
            paused: () => !canReadEvents.value,
        });

        const numberFormat = computed(() => new Intl.NumberFormat(locale.value));

        const countOf = (name: `${EntityDefaultEventName}`) : number => {
            const data = eventStats.response.value?.data ?? [];

            return data
                .filter((row) => row.name === name)
                .reduce((sum, row) => sum + row.count, 0);
        };

        const translations = useTranslations([
            { namespace: TranslatorTranslationNamespace.APP, key: TranslatorTranslationAppKey.ACTIVITY_TOTAL },
            { namespace: TranslatorTranslationNamespace.APP, key: TranslatorTranslationAppKey.ACTIVITY_CREATED },
            { namespace: TranslatorTranslationNamespace.APP, key: TranslatorTranslationAppKey.ACTIVITY_UPDATED },
            { namespace: TranslatorTranslationNamespace.APP, key: TranslatorTranslationAppKey.ACTIVITY_DELETED },
        ]);

        const sourceLabel = useTranslation({
            namespace: TranslatorTranslationNamespace.APP,
            key: TranslatorTranslationAppKey.ACTIVITY_SOURCE,
        });

        // the window line under each box, as the dashboard tiles carry it
        const inDays = useTranslation({
            namespace: TranslatorTranslationNamespace.APP,
            key: TranslatorTranslationAppKey.ACTIVITY_IN_DAYS,
            data: { days: computed(() => windowEntry.value.days) },
        });
        const inHours = useTranslation({
            namespace: TranslatorTranslationNamespace.APP,
            key: TranslatorTranslationAppKey.ACTIVITY_IN_HOURS,
            data: { hours: computed(() => windowEntry.value.days * 24) },
        });
        const allTime = useTranslation({
            namespace: TranslatorTranslationNamespace.APP,
            key: TranslatorTranslationAppKey.ACTIVITY_ALL_TIME,
        });
        const windowHint = computed(() => (windowEntry.value.unit === 'hour' ?
            inHours.value :
            inDays.value));

        const retentionDays = computed(() => eventStats.response.value?.meta.entityRetentionDays ?? 0);
        const retentionTitle = useTranslation({
            namespace: TranslatorTranslationNamespace.APP,
            key: TranslatorTranslationAppKey.STATS_WINDOW_RETAINED,
            data: { days: retentionDays },
        });

        const boxes = computed<Box[]>(() => {
            const output : Box[] = [];

            if (totalStats.response.value && !totalStats.forbidden.value) {
                output.push({
                    key: 'total',
                    label: translations.activityTotal,
                    value: numberFormat.value.format(totalStats.response.value.meta.total),
                    hint: allTime.value,
                });
            }

            if (canReadEvents.value && eventStats.response.value && !eventStats.forbidden.value) {
                output.push(
                    {
                        key: EntityDefaultEventName.CREATED,
                        label: translations.activityCreated,
                        value: numberFormat.value.format(countOf(EntityDefaultEventName.CREATED)),
                        hint: windowHint.value,
                    },
                    {
                        key: EntityDefaultEventName.UPDATED,
                        label: translations.activityUpdated,
                        value: numberFormat.value.format(countOf(EntityDefaultEventName.UPDATED)),
                        hint: windowHint.value,
                    },
                    {
                        key: EntityDefaultEventName.DELETED,
                        label: translations.activityDeleted,
                        value: numberFormat.value.format(countOf(EntityDefaultEventName.DELETED)),
                        hint: windowHint.value,
                    },
                );
            }

            return output;
        });

        const busy = computed(() => totalStats.busy.value || eventStats.busy.value);
        const hasOperations = computed(() => boxes.value.length > 1);

        return {
            boxes,
            busy,
            hasOperations,
            retentionDays,
            retentionTitle,
            sourceLabel,
            window,
        };
    },
});
</script>
<template>
    <div
        v-if="boxes.length > 0"
        class="mb-3 transition-opacity"
        :class="{ 'opacity-60': busy }"
    >
        <div
            v-if="hasOperations"
            class="mb-2 flex flex-wrap items-center justify-between gap-2"
        >
            <span class="text-xs text-fg-muted">{{ sourceLabel }}</span>
            <StatsWindowSwitch
                v-model="window"
                :max-days="retentionDays"
                :disabled-title="retentionTitle"
            />
        </div>
        <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div
                v-for="box in boxes"
                :key="box.key"
                class="rounded-lg border border-border bg-bg-elevated p-4"
            >
                <div class="text-sm text-fg-muted">
                    {{ box.label }}
                </div>
                <div class="mt-1 text-3xl font-semibold tabular-nums">
                    {{ box.value }}
                </div>
                <div class="mt-1 text-sm text-fg-muted">
                    {{ box.hint }}
                </div>
            </div>
        </div>
    </div>
</template>

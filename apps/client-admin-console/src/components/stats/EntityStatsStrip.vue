<!--
  - Copyright (c) 2026.
  - Author Peter Placzek (tada5hi)
  - For the full copyright and license information,
  - view the LICENSE file that was distributed with this source code.
  -->
<script lang="ts">
import { injectTranslatorLocale, useTranslation } from '@authup/client-web-kit';
import type { EntityStatsQuery } from '@authup/core-http-kit';
import { StatsGranularity } from '@authup/core-http-kit';
import { TranslatorTranslationAppKey, TranslatorTranslationNamespace } from '@authup/i18n';
import type { PropType } from 'vue';
import { computed, defineComponent } from 'vue';
import type { EntityStatsLoadFn, EntityStatsWindowEntry } from '../../composables/entity-stats';
import { useEntityStats } from '../../composables/entity-stats';
import { alignStats, buildBucketAxis, sumStats } from '../dashboard/stats';
import { scaleBarHeights } from './bars';

/**
 * The strip's window is fixed: one bar per day of the last 30 days.
 */
const STRIP_WINDOW : EntityStatsWindowEntry = {
    days: 30,
    granularity: StatsGranularity.DAY,
};

type Bar = {
    bucket: string,
    count: number,
    height: string,
    title: string,
};

// The growth line above a list: how many rows its scope gained over the
// last 30 days, as a total plus a bar per day. It follows the list's realm
// and folder scope, never its search text, and it is decoration: a read
// that is refused (403) or has never answered renders nothing, and a
// failure never toasts.
export default defineComponent({
    props: {
        load: {
            type: Function as PropType<EntityStatsLoadFn>,
            required: true,
        },
        filters: {
            type: Object as PropType<EntityStatsQuery['filters']>,
            default: undefined,
        },
        /**
         * The list's scope is still being resolved (a folder looking up its
         * subtree): hold the current answer instead of counting the wider,
         * unresolved scope first.
         */
        paused: {
            type: Boolean,
            default: false,
        },
    },
    setup(props) {
        const locale = injectTranslatorLocale();

        const {
            response, 
            forbidden, 
            busy, 
        } = useEntityStats({
            load: (query) => props.load(query),
            filters: () => props.filters,
            paused: () => props.paused,
            window: STRIP_WINDOW,
        });

        const numberFormat = computed(() => new Intl.NumberFormat(locale.value));
        const titleFormat = computed(() => new Intl.DateTimeFormat(locale.value, { dateStyle: 'medium', timeZone: 'UTC' }));

        const axis = computed(() => (response.value ? buildBucketAxis(response.value.meta) : []));
        const values = computed(() => (response.value ? alignStats(response.value.data, axis.value) : []));
        const count = computed(() => (response.value ? sumStats(response.value.data) : 0));
        const total = computed(() => response.value?.meta.total ?? 0);

        const countFormatted = computed(() => numberFormat.value.format(count.value));
        const totalFormatted = computed(() => numberFormat.value.format(total.value));

        const bars = computed<Bar[]>(() => {
            const heights = scaleBarHeights(values.value);

            return axis.value.map((bucket, index) => ({
                bucket,
                count: values.value[index],
                height: `${heights[index]}%`,
                title: `${titleFormat.value.format(new Date(bucket))}: ${numberFormat.value.format(values.value[index])}`,
            }));
        });

        const label = useTranslation({
            namespace: TranslatorTranslationNamespace.APP,
            key: TranslatorTranslationAppKey.STATS_NEW_IN_DAYS,
            data: {
                count: countFormatted,
                days: STRIP_WINDOW.days,
            },
        });

        const summary = useTranslation({
            namespace: TranslatorTranslationNamespace.APP,
            key: TranslatorTranslationAppKey.STATS_STRIP_SUMMARY,
            data: {
                count: countFormatted,
                total: totalFormatted,
                days: STRIP_WINDOW.days,
            },
        });

        const visible = computed(() => response.value !== null && !forbidden.value);

        return {
            busy,
            bars,
            label,
            summary,
            visible,
        };
    },
});
</script>
<template>
    <div
        v-if="visible"
        role="img"
        :aria-label="summary"
        class="mb-3 flex items-center gap-4 rounded-lg border border-border bg-bg-elevated px-4 py-3 transition-opacity"
        :class="{ 'opacity-60': busy }"
    >
        <span
            class="shrink-0 text-base font-medium text-fg-muted tabular-nums"
            aria-hidden="true"
        >
            {{ label }}
        </span>
        <div
            class="flex h-12 min-w-0 grow items-end gap-0.5"
            aria-hidden="true"
        >
            <div
                v-for="bar in bars"
                :key="bar.bucket"
                class="min-w-0.5 grow rounded-sm"
                :class="bar.count > 0 ? 'bg-primary-600' : 'bg-bg-muted'"
                :style="{ height: bar.height }"
                :title="bar.title"
            />
        </div>
    </div>
</template>

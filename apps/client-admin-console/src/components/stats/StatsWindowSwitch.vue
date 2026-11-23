<!--
  - Copyright (c) 2026.
  - Author Peter Placzek (tada5hi)
  - For the full copyright and license information,
  - view the LICENSE file that was distributed with this source code.
  -->
<script lang="ts">
import { useTranslationsForNamespace } from '@authup/client-web-kit';
import { TranslatorTranslationAppKey, TranslatorTranslationNamespace } from '@authup/i18n';
import { VCFormRadio, VCFormRadioGroup } from '@vuecs/forms';
import type { PropType } from 'vue';
import { computed, defineComponent } from 'vue';
import type { EntityStatsWindow, StatsWindowCoverage } from '../../composables/entity-stats.ts';
import { ENTITY_STATS_WINDOWS, isStatsWindowCovered } from '../../composables/entity-stats.ts';

const WINDOW_LABELS = {
    '24h': TranslatorTranslationAppKey.DASHBOARD_WINDOW_24H,
    '7d': TranslatorTranslationAppKey.DASHBOARD_WINDOW_7D,
    '30d': TranslatorTranslationAppKey.DASHBOARD_WINDOW_30D,
    '90d': TranslatorTranslationAppKey.DASHBOARD_WINDOW_90D,
} as const satisfies Record<EntityStatsWindow, TranslatorTranslationAppKey>;

// The 24h / 7d / 30d / 90d switch the dashboard and the entity activity boxes
// share. A window the server's coverage does not reach (the raw retention, or
// for a day window the rollups) is offered but disabled, with the reason as its title, rather than silently
// counting fewer rows than happened.
export default defineComponent({
    components: { VCFormRadio, VCFormRadioGroup },
    props: {
        modelValue: {
            type: String as PropType<EntityStatsWindow>,
            required: true,
        },
        /**
         * How far back the data behind the switch reaches; absent means no
         * limit.
         */
        coverage: {
            type: Object as PropType<StatsWindowCoverage>,
            default: () => ({ retentionDays: 0 }),
        },
        /**
         * Why a window past the coverage is disabled.
         */
        disabledTitle: {
            type: String,
            default: undefined,
        },
    },
    emits: ['update:modelValue'],
    setup(props, { emit }) {
        const translations = useTranslationsForNamespace(
            TranslatorTranslationNamespace.APP,
            [
                { key: TranslatorTranslationAppKey.DASHBOARD_WINDOW },
                { key: TranslatorTranslationAppKey.DASHBOARD_WINDOW_24H },
                { key: TranslatorTranslationAppKey.DASHBOARD_WINDOW_7D },
                { key: TranslatorTranslationAppKey.DASHBOARD_WINDOW_30D },
                { key: TranslatorTranslationAppKey.DASHBOARD_WINDOW_90D },
            ],
        );

        const entries = computed(() => (Object.keys(ENTITY_STATS_WINDOWS) as EntityStatsWindow[])
            .map((key) => {
                const disabled = !isStatsWindowCovered(ENTITY_STATS_WINDOWS[key], props.coverage, new Date());

                return {
                    key,
                    label: translations[WINDOW_LABELS[key]],
                    disabled,
                    title: disabled ? props.disabledTitle : undefined,
                };
            }));

        const select = (value: unknown) => {
            const entry = entries.value.find((candidate) => candidate.key === value);

            if (entry && !entry.disabled) {
                emit('update:modelValue', entry.key);
            }
        };

        return {
            entries,
            select,
            translations,
        };
    },
});
</script>
<template>
    <VCFormRadioGroup
        segmented
        :theme-variant="{ size: 'sm' }"
        :model-value="modelValue"
        :aria-label="translations.dashboardWindow"
        @update:model-value="select"
    >
        <VCFormRadio
            v-for="entry in entries"
            :key="entry.key"
            :value="entry.key"
            :label-content="entry.label"
            :disabled="entry.disabled"
            :title="entry.title"
        />
    </VCFormRadioGroup>
</template>

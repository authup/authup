<!--
  - Copyright (c) 2026.
  - Author Peter Placzek (tada5hi)
  - For the full copyright and license information,
  - view the LICENSE file that was distributed with this source code.
  -->
<script lang="ts">
import { useTranslationsForNamespace } from '@authup/client-web-kit';
import { TranslatorTranslationAppKey, TranslatorTranslationNamespace } from '@authup/i18n';
import { VCButton } from '@vuecs/button';
import type { PropType } from 'vue';
import { computed, defineComponent } from 'vue';
import type { EntityStatsWindow } from '../../composables/entity-stats';
import { ENTITY_STATS_WINDOWS } from '../../composables/entity-stats';

const WINDOW_LABELS = {
    '24h': TranslatorTranslationAppKey.DASHBOARD_WINDOW_24H,
    '7d': TranslatorTranslationAppKey.DASHBOARD_WINDOW_7D,
    '30d': TranslatorTranslationAppKey.DASHBOARD_WINDOW_30D,
    '90d': TranslatorTranslationAppKey.DASHBOARD_WINDOW_90D,
} as const satisfies Record<EntityStatsWindow, TranslatorTranslationAppKey>;

// The 24h / 7d / 30d / 90d switch the dashboard and the entity activity boxes
// share. A window reaching past `maxDays` (a retention the server reports) is
// offered but disabled, with the reason as its title, rather than silently
// counting fewer rows than happened.
export default defineComponent({
    components: { VCButton },
    props: {
        modelValue: {
            type: String as PropType<EntityStatsWindow>,
            required: true,
        },
        /**
         * The longest window the data behind the switch can answer, in days;
         * 0 or absent means no limit.
         */
        maxDays: {
            type: Number,
            default: 0,
        },
        /**
         * Why a window past `maxDays` is disabled.
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
                const disabled = props.maxDays > 0 && ENTITY_STATS_WINDOWS[key].days > props.maxDays;

                return {
                    key,
                    label: translations[WINDOW_LABELS[key]],
                    active: props.modelValue === key,
                    disabled,
                    title: disabled ? props.disabledTitle : undefined,
                };
            }));

        const select = (key: EntityStatsWindow) => {
            emit('update:modelValue', key);
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
    <div
        class="flex flex-wrap gap-1"
        role="group"
        :aria-label="translations.dashboardWindow"
    >
        <VCButton
            v-for="entry in entries"
            :key="entry.key"
            size="sm"
            :color="entry.active ? 'primary' : 'neutral'"
            :variant="entry.active ? 'solid' : 'outline'"
            :aria-pressed="entry.active"
            :disabled="entry.disabled"
            :title="entry.title"
            @click="select(entry.key)"
        >
            {{ entry.label }}
        </VCButton>
    </div>
</template>

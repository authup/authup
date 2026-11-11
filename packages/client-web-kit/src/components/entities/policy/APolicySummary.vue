<!--
  Copyright (c) 2026.
  Author Peter Placzek (tada5hi)
  For the full copyright and license information,
  view the LICENSE file that was distributed with this source code.
-->

<script lang="ts">
import type { Policy } from '@authup/core-kit';
import { EntityType } from '@authup/core-kit';
import type { PropType } from 'vue';
import { computed, defineComponent } from 'vue';
import { VCBadge } from '@vuecs/elements';
import {
    TranslatorTranslationCommonKey,
    TranslatorTranslationFieldKey,
    TranslatorTranslationNamespace,
} from '@authup/i18n';
import { useEntityNameTranslator, useTranslations } from '../../../core';
import APolicyTypeBadge from './APolicyTypeBadge.vue';

export default defineComponent({
    components: { APolicyTypeBadge, VCBadge },
    props: {
        entity: {
            type: Object as PropType<Policy>,
            required: true,
        },
    },
    setup(props) {
        const translateEntityName = useEntityNameTranslator();
        const label = computed(() => translateEntityName(EntityType.POLICY, props.entity));

        const translations = useTranslations([
            {
                namespace: TranslatorTranslationNamespace.FIELD,
                key: TranslatorTranslationFieldKey.NAME,
            },
            {
                namespace: TranslatorTranslationNamespace.FIELD,
                key: TranslatorTranslationFieldKey.TYPE,
            },
            {
                namespace: TranslatorTranslationNamespace.FIELD,
                key: TranslatorTranslationFieldKey.DISPLAY_NAME,
            },
            {
                namespace: TranslatorTranslationNamespace.FIELD,
                key: TranslatorTranslationFieldKey.DESCRIPTION,
            },
            {
                namespace: TranslatorTranslationNamespace.FIELD,
                key: TranslatorTranslationFieldKey.INVERT,
            },
            {
                namespace: TranslatorTranslationNamespace.COMMON,
                key: TranslatorTranslationCommonKey.BUILT_IN,
            },
            {
                namespace: TranslatorTranslationNamespace.COMMON,
                key: TranslatorTranslationCommonKey.YES,
            },
        ]);

        return { label, translations };
    },
});
</script>
<template>
    <div>
        <div class="flex flex-row gap-2 mb-2">
            <strong style="min-width: 120px">{{ translations.name }}</strong>
            <div>{{ entity.name }}</div>
        </div>
        <div class="flex flex-row gap-2 mb-2">
            <strong style="min-width: 120px">{{ translations.type }}</strong>
            <div>
                <APolicyTypeBadge :type="entity.type" />
            </div>
        </div>
        <div
            v-if="label !== entity.name"
            class="flex flex-row gap-2 mb-2"
        >
            <strong style="min-width: 120px">{{ translations.displayName }}</strong>
            <div>{{ label }}</div>
        </div>
        <div
            v-if="entity.description"
            class="flex flex-row gap-2 mb-2"
        >
            <strong style="min-width: 120px">{{ translations.description }}</strong>
            <div>{{ entity.description }}</div>
        </div>
        <div
            v-if="entity.invert"
            class="flex flex-row gap-2 mb-2"
        >
            <strong style="min-width: 120px">{{ translations.invert }}</strong>
            <div>
                <VCBadge
                    color="warning"
                    variant="solid"
                >
                    {{ translations.yes }}
                </VCBadge>
            </div>
        </div>
        <div
            v-if="entity.builtIn"
            class="flex flex-row gap-2 mb-2"
        >
            <strong style="min-width: 120px">{{ translations.builtIn }}</strong>
            <div>
                <VCBadge
                    color="neutral"
                    variant="soft"
                >
                    {{ translations.yes }}
                </VCBadge>
            </div>
        </div>
    </div>
</template>

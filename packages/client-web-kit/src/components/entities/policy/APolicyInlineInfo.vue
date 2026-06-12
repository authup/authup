<!--
  Copyright (c) 2026.
  Author Peter Placzek (tada5hi)
  For the full copyright and license information,
  view the LICENSE file that was distributed with this source code.
-->

<script lang="ts">
import type { Policy } from '@authup/core-kit';
import type { PropType } from 'vue';
import { defineComponent } from 'vue';
import {
    TranslatorTranslationCommonKey,
    TranslatorTranslationNamespace,
} from '@authup/i18n';
import { useTranslationsForNamespace } from '../../../core';
import APolicyTypeBadge from './APolicyTypeBadge.vue';
import APolicyDetailNav from './APolicyDetailNav.vue';

export default defineComponent({
    components: { APolicyTypeBadge, APolicyDetailNav },
    props: {
        entity: {
            type: Object as PropType<Policy>,
            required: true,
        },
    },
    emits: ['detail'],
    setup(props, { emit }) {
        const handleDetail = () => {
            emit('detail', props.entity);
        };

        const translations = useTranslationsForNamespace(
            TranslatorTranslationNamespace.COMMON,
            [
                { key: TranslatorTranslationCommonKey.INVERTED },
            ],
        );

        return { handleDetail, translations };
    },
});
</script>
<template>
    <APolicyTypeBadge :type="entity.type" />
    <span
        v-if="entity.invert"
        class="badge bg-warning-500"
    >{{ translations.inverted }}</span>
    <APolicyDetailNav
        :policy-id="entity.id"
        @click="handleDetail"
    />
</template>

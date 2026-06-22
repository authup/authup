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
import { VCBadge } from '@vuecs/elements';
import {
    TranslatorTranslationCommonKey,
    TranslatorTranslationNamespace,
} from '@authup/i18n';
import { useTranslationsForNamespace } from '../../../core';
import APolicyTypeBadge from './APolicyTypeBadge.vue';
import APolicyDetailNav from './APolicyDetailNav.vue';

export default defineComponent({
    components: {
        APolicyTypeBadge, 
        APolicyDetailNav, 
        VCBadge, 
    },
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
    <VCBadge
        v-if="entity.invert"
        color="warning"
        variant="solid"
    >
        {{ translations.inverted }}
    </VCBadge>
    <APolicyDetailNav
        :policy-id="entity.id"
        @click="handleDetail"
    />
</template>

<!--
  Copyright (c) 2026.
  Author Peter Placzek (tada5hi)
  For the full copyright and license information,
  view the LICENSE file that was distributed with this source code.
-->

<script lang="ts">
import { defineComponent } from 'vue';
import { VCButton } from '@vuecs/button';
import { TranslatorTranslationClientKey, TranslatorTranslationNamespace } from '@authup/i18n';
import { useTranslation } from '../../../core';

export default defineComponent({
    components: { VCButton },
    props: {
        policyId: {
            type: String,
            required: true,
        },
    },
    emits: ['click'],
    setup(props, { emit }) {
        const viewPolicyDetails = useTranslation({
            namespace: TranslatorTranslationNamespace.CLIENT,
            key: TranslatorTranslationClientKey.VIEW_POLICY_DETAILS,
        });

        const handleClick = (e: Event) => {
            e.preventDefault();
            emit('click', props.policyId);
        };

        return { handleClick, viewPolicyDetails };
    },
});
</script>
<template>
    <VCButton
        type="button"
        size="sm"
        color="info"
        variant="outline"
        :title="viewPolicyDetails"
        :aria-label="viewPolicyDetails"
        @click="handleClick"
    >
        <VCIcon name="fa6-solid:eye" />
    </VCButton>
</template>

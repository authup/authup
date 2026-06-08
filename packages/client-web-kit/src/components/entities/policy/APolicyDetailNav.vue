<!--
  Copyright (c) 2026.
  Author Peter Placzek (tada5hi)
  For the full copyright and license information,
  view the LICENSE file that was distributed with this source code.
-->

<script lang="ts">
import { defineComponent } from 'vue';
import {
    TranslatorTranslationClientKey,
    TranslatorTranslationNamespace,
    useTranslation,
} from '../../../core';

export default defineComponent({
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
    <button
        type="button"
        class="btn btn-xs btn-outline-info"
        :title="viewPolicyDetails"
        :aria-label="viewPolicyDetails"
        @click="handleClick"
    >
        <VCIcon name="fa6-solid:eye" />
    </button>
</template>

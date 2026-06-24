<!--
  Copyright (c) 2026.
  Author Peter Placzek (tada5hi)
  For the full copyright and license information,
  view the LICENSE file that was distributed with this source code.
-->

<script lang="ts">
import type { PropType } from 'vue';
import { defineComponent } from 'vue';
import type { ButtonSize } from '@vuecs/button';
import { VCButton } from '@vuecs/button';
import { TranslatorTranslationClientKey, TranslatorTranslationNamespace } from '@authup/i18n';
import { DEFAULT_BUTTON_SIZE, useTranslation } from '../../../core';

export default defineComponent({
    components: { VCButton },
    props: {
        policyId: {
            type: String,
            required: true,
        },
        size: {
            type: String as PropType<ButtonSize>,
            default: DEFAULT_BUTTON_SIZE,
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
        :size="size"
        color="info"
        variant="outline"
        :title="viewPolicyDetails"
        :aria-label="viewPolicyDetails"
        icon-left="fa6-solid:eye"
        @click="handleClick"
    />
</template>

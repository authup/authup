<!--
  Copyright (c) 2022.
  Author Peter Placzek (tada5hi)
  For the full copyright and license information,
  view the LICENSE file that was distributed with this source code.
-->

<script lang="ts">
import type { PropType } from 'vue';
import { defineComponent } from 'vue';
import type { ButtonSize } from '@vuecs/button';
import { VCButton } from '@vuecs/button';
import { VCIcon } from '@vuecs/icon';
import {
    TranslatorTranslationActionKey,
    TranslatorTranslationCommonKey,
    TranslatorTranslationNamespace,
} from '@authup/i18n';
import { DEFAULT_BUTTON_SIZE, useTranslations } from '../../../core';

export default defineComponent({
    components: { VCButton, VCIcon },
    props: {
        value: {
            type: Boolean,
            required: true,
        },
        isBusy: {
            type: Boolean,
            required: true,
        },
        size: {
            type: String as PropType<ButtonSize>,
            default: DEFAULT_BUTTON_SIZE,
        },
    },
    emits: ['changed'],
    setup(props, { emit }) {
        const translations = useTranslations([
            {
                namespace: TranslatorTranslationNamespace.COMMON,
                key: TranslatorTranslationCommonKey.PROCESSING,
            },
            {
                namespace: TranslatorTranslationNamespace.ACTION,
                key: TranslatorTranslationActionKey.REMOVE,
            },
            {
                namespace: TranslatorTranslationNamespace.ACTION,
                key: TranslatorTranslationActionKey.ADD,
            },
        ]);

        const handleClick = (e: Event) => {
            e.preventDefault();
            emit('changed', !props.value);
        };

        return { handleClick, translations };
    },
});
</script>
<template>
    <VCButton
        type="button"
        :aria-label="isBusy ? translations.processing : (value ? translations.remove : translations.add)"
        :size="size"
        :color="isBusy ? 'neutral' : (value ? 'error' : 'success')"
        :disabled="isBusy"
        @click="handleClick"
    >
        <template #leading>
            <VCIcon :name="isBusy ? 'fa6-solid:question' : (value ? 'fa6-solid:minus' : 'fa6-solid:plus')" />
        </template>
    </VCButton>
</template>

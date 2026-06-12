<!--
  Copyright (c) 2022.
  Author Peter Placzek (tada5hi)
  For the full copyright and license information,
  view the LICENSE file that was distributed with this source code.
-->

<script lang="ts">
import { defineComponent } from 'vue';
import {
    TranslatorTranslationActionKey,
    TranslatorTranslationCommonKey,
    TranslatorTranslationNamespace,
} from '@authup/i18n';
import { useTranslations } from '../../../core';

export default defineComponent({
    props: {
        value: {
            type: Boolean,
            required: true,
        },
        isBusy: {
            type: Boolean,
            required: true,
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
    <button
        type="button"
        :aria-label="isBusy ? translations.processing : (value ? translations.remove : translations.add)"
        :class="['btn btn-xs', {
            'btn-dark': isBusy,
            'btn-success': !isBusy && !value,
            'btn-danger': !isBusy && value,
        }]"
        :disabled="isBusy"
        @click="handleClick"
    >
        <VCIcon
            aria-hidden="true"
            :name="isBusy ? 'fa6-solid:question' : (value ? 'fa6-solid:minus' : 'fa6-solid:plus')"
        />
    </button>
</template>

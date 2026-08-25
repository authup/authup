<script lang="ts">

import { TranslatorTranslationCommonKey, TranslatorTranslationNamespace } from '@authup/i18n';
import { AKeyForm, useTranslations } from '@authup/client-web-kit';
import type { Key } from '@authup/core-kit';
import type { PropType } from 'vue';
import { defineComponent } from 'vue';

export default defineComponent({
    components: { AKeyForm },
    props: {
        entity: {
            type: Object as PropType<Key>,
            required: true,
        },
    },
    emits: ['updated', 'failed'],
    setup(props, { emit }) {
        const translationsDefault = useTranslations([
            {
                namespace: TranslatorTranslationNamespace.COMMON,
                key: TranslatorTranslationCommonKey.GENERAL,
            },
        ]);

        const handleUpdated = (e: Key) => {
            emit('updated', e);
        };

        const handleFailed = (e: Error) => {
            emit('failed', e);
        };

        return {
            handleUpdated,
            handleFailed,
            translationsDefault,
        };
    },
});
</script>
<template>
    <div>
        <h6 class="title">
            {{ translationsDefault.general }}
        </h6>
        <AKeyForm
            :entity="entity"
            @updated="handleUpdated"
            @failed="handleFailed"
        />
    </div>
</template>

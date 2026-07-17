<script lang="ts">

import { TranslatorTranslationCommonKey, TranslatorTranslationNamespace } from '@authup/i18n';
import { ARobotForm, useTranslations } from '@authup/client-web-kit';
import type { Robot } from '@authup/core-kit';
import type { PropType } from 'vue';
import { defineNuxtComponent, definePageMeta } from '#imports';
import { LayoutKey } from '../../../config/layout';

export default defineNuxtComponent({
    components: { ARobotForm },
    props: {
        entity: {
            type: Object as PropType<Robot>,
            required: true,
        },
    },
    emits: ['updated', 'failed'],
    setup(props, { emit }) {
        definePageMeta({ [LayoutKey.REQUIRED_LOGGED_IN]: true });

        const translationsDefault = useTranslations(
            [
                {
                    namespace: TranslatorTranslationNamespace.COMMON, 
                    key: TranslatorTranslationCommonKey.GENERAL, 
                },
            ],
        );

        const handleUpdated = (e: Robot) => {
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
        <ARobotForm
            :entity="entity"
            :realm-id="entity.realmId"
            @updated="handleUpdated"
            @failed="handleFailed"
        />
    </div>
</template>

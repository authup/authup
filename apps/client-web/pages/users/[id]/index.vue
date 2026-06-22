<script lang="ts">

import { TranslatorTranslationCommonKey, TranslatorTranslationFieldKey, TranslatorTranslationNamespace } from '@authup/i18n';
import { AUserForm, AUserPasswordForm, useTranslations } from '@authup/client-web-kit';
import type { User } from '@authup/core-kit';
import type { PropType } from 'vue';
import { defineNuxtComponent, definePageMeta } from '#imports';
import { LayoutKey } from '../../../config/layout';

export default defineNuxtComponent({
    components: {
        AUserForm,
        AUserPasswordForm,
    },
    props: {
        entity: {
            type: Object as PropType<User>,
            required: true,
        },
    },
    emits: ['updated', 'failed'],
    async setup(props, { emit }) {
        definePageMeta({ [LayoutKey.REQUIRED_LOGGED_IN]: true });

        const translationsDefault = useTranslations([
            {
                namespace: TranslatorTranslationNamespace.COMMON, 
                key: TranslatorTranslationCommonKey.GENERAL, 
            },
            {
                namespace: TranslatorTranslationNamespace.FIELD, 
                key: TranslatorTranslationFieldKey.PASSWORD, 
            },
        ]);

        const handleUpdated = (e: User) => {
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
    <div class="flex flex-wrap -mx-2">
        <div class="w-7/12 px-2">
            <h6 class="title">
                {{ translationsDefault.general }}
            </h6>

            <AUserForm
                :entity="entity"
                :realm-id="entity.realm_id"
                @updated="handleUpdated"
                @failed="handleFailed"
            />
        </div>
        <div class="w-5/12 px-2">
            <h6 class="title">
                {{ translationsDefault.password }}
            </h6>

            <AUserPasswordForm
                :id="entity.id"
                @updated="handleUpdated"
                @failed="handleFailed"
            />
        </div>
    </div>
</template>

<script lang="ts">

import {
    AUserForm,
    TranslatorTranslationAppKey,
    TranslatorTranslationCommonKey,
    TranslatorTranslationNamespace,
    injectStore,
    useTranslations,
    useTranslator,
} from '@authup/client-web-kit';
import type { User } from '@authup/core-kit';
import { storeToRefs } from 'pinia';
import { definePageMeta, useToast } from '#imports';
import { defineComponent } from 'vue';
import { LayoutKey } from '../../../config/layout';

export default defineComponent({
    components: { UserForm: AUserForm },
    setup() {
        definePageMeta({ [LayoutKey.REQUIRED_LOGGED_IN]: true });

        const toast = useToast();

        const store = injectStore();

        const {
            user,
            userId,
        } = storeToRefs(store);

        const translationsDefault = useTranslations([
            {
                namespace: TranslatorTranslationNamespace.COMMON, 
                key: TranslatorTranslationCommonKey.GENERAL, 
            },
        ]);

        const translate = useTranslator();

        const handleUpdated = async (entity: User) => {
            toast.show({
                variant: 'success',
                body: await translate({
                    namespace: TranslatorTranslationNamespace.APP,
                    key: TranslatorTranslationAppKey.ACCOUNT_UPDATED,
                }),
            });

            store.setUser(entity);
        };

        const handleFailed = (e: Error) => {
            toast.show({
                variant: 'warning',
                body: e.message,
            });
        };

        return {
            user,
            userId,
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
        <UserForm
            :can-manage="false"
            :realm-id="userId"
            :entity="user"
            @updated="handleUpdated"
            @failed="handleFailed"
        />
    </div>
</template>

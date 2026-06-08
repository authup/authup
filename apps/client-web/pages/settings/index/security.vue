<script lang="ts">
import { storeToRefs } from 'pinia';
import {
    AUserPasswordForm,
    TranslatorTranslationAppKey,
    TranslatorTranslationFieldKey,
    TranslatorTranslationNamespace,
    injectStore,
    useTranslations,
    useTranslator,
} from '@authup/client-web-kit';
import { definePageMeta, useToast } from '#imports';
import { defineComponent } from 'vue';
import { LayoutKey } from '~/config/layout';

export default defineComponent({
    components: { AUserPasswordForm },
    setup() {
        definePageMeta({ [LayoutKey.REQUIRED_LOGGED_IN]: true });

        const toast = useToast();

        const store = injectStore();
        const { userId } = storeToRefs(store);

        const translationsDefault = useTranslations([
            {
                namespace: TranslatorTranslationNamespace.FIELD, 
                key: TranslatorTranslationFieldKey.PASSWORD, 
                as: 'password', 
            },
        ]);

        const translate = useTranslator();

        const handleUpdated = async () => {
            if (toast) {
                toast.show({
                    variant: 'success',
                    body: await translate({
                        namespace: TranslatorTranslationNamespace.APP,
                        key: TranslatorTranslationAppKey.ACCOUNT_UPDATED,
                    }),
                });
            }
        };

        const handleFailed = (e: Error) => {
            if (toast) {
                toast.show({
                    variant: 'warning',
                    body: e.message,
                });
            }
        };

        return {
            id: userId,
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
            {{ translationsDefault.password }}
        </h6>
        <AUserPasswordForm
            :id="id"
            @updated="handleUpdated"
            @failed="handleFailed"
        />
    </div>
</template>

<!--
  - Copyright (c) 2026.
  - Author Peter Placzek (tada5hi)
  - For the full copyright and license information,
  - view the LICENSE file that was distributed with this source code.
  -->
<script lang="ts">
import {
    AUserPasswordForm,
    injectStore,
    useTranslations,
    useTranslator,
} from '@authup/client-web-kit';
import {
    TranslatorTranslationAppKey,
    TranslatorTranslationFieldKey,
    TranslatorTranslationNamespace,
} from '@authup/i18n';
import { storeToRefs } from 'pinia';
import { defineComponent } from 'vue';
import { useAccountToasts } from './utils';

export default defineComponent({
    components: { AUserPasswordForm },
    setup() {
        const store = injectStore();
        const { userId } = storeToRefs(store);

        const toasts = useAccountToasts();
        const translate = useTranslator();

        const translations = useTranslations([
            {
                namespace: TranslatorTranslationNamespace.FIELD,
                key: TranslatorTranslationFieldKey.PASSWORD,
            },
        ]);

        const handleUpdated = async () => {
            toasts.success(await translate({
                namespace: TranslatorTranslationNamespace.APP,
                key: TranslatorTranslationAppKey.ACCOUNT_UPDATED,
            }));
        };

        const handleFailed = (e: Error) => toasts.error(e);

        return {
            userId,
            translations,
            handleUpdated,
            handleFailed,
        };
    },
});
</script>
<template>
    <div>
        <h2 class="text-lg font-semibold mb-2">
            {{ translations.password }}
        </h2>
        <AUserPasswordForm
            v-if="userId"
            :id="userId"
            @updated="handleUpdated"
            @failed="handleFailed"
        />
    </div>
</template>

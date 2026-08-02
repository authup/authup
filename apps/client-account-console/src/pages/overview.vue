<!--
  - Copyright (c) 2026.
  - Author Peter Placzek (tada5hi)
  - For the full copyright and license information,
  - view the LICENSE file that was distributed with this source code.
  -->
<script lang="ts">
import {
    AUserForm,
    injectStore,
    useTranslations,
    useTranslator,
} from '@authup/client-web-kit';
import type { User } from '@authup/core-kit';
import {
    TranslatorTranslationAppKey,
    TranslatorTranslationCommonKey,
    TranslatorTranslationNamespace,
} from '@authup/i18n';
import { storeToRefs } from 'pinia';
import { defineComponent } from 'vue';
import { useAccountToasts } from './utils';

export default defineComponent({
    components: { AUserForm },
    setup() {
        const store = injectStore();
        const { user, realmId } = storeToRefs(store);

        const toasts = useAccountToasts();
        const translate = useTranslator();

        const translations = useTranslations([
            {
                namespace: TranslatorTranslationNamespace.COMMON,
                key: TranslatorTranslationCommonKey.GENERAL,
            },
        ]);

        const handleUpdated = async (entity: User) => {
            store.setUser(entity);

            toasts.success(await translate({
                namespace: TranslatorTranslationNamespace.APP,
                key: TranslatorTranslationAppKey.ACCOUNT_UPDATED,
            }));
        };

        const handleFailed = (e: Error) => toasts.error(e);

        return {
            user,
            realmId,
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
            {{ translations.general }}
        </h2>
        <AUserForm
            v-if="user"
            :can-manage="false"
            :realm-id="realmId"
            :entity="user"
            @updated="handleUpdated"
            @failed="handleFailed"
        />
    </div>
</template>

<!--
  - Copyright (c) 2026.
  - Author Peter Placzek (tada5hi)
  - For the full copyright and license information,
  - view the LICENSE file that was distributed with this source code.
  -->
<script lang="ts">
import {
    AUserForm,
    injectHTTPClient,
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
import { defineComponent, onMounted, ref } from 'vue';
import { useAccountToasts } from './utils';

export default defineComponent({
    components: { AUserForm },
    setup() {
        const store = injectStore();
        const httpClient = injectHTTPClient();
        const { realmId } = storeToRefs(store);

        // The store carries only the identity the token asserts (id, name,
        // display name), so the page loads the record whose every column this
        // form writes. It is the one surface that needs the whole user, and it
        // reads `/userinfo` rather than `/users/@me`: `email` is `select:false`,
        // so it is absent from the entity endpoint's default projection, and
        // the form would render an empty email box and submit a null over the
        // user's address.
        const entity = ref<User | null>(null);

        const toasts = useAccountToasts();
        const translate = useTranslator();

        const translations = useTranslations([
            {
                namespace: TranslatorTranslationNamespace.COMMON,
                key: TranslatorTranslationCommonKey.GENERAL,
            },
        ]);

        const handleUpdated = async (updated: User) => {
            entity.value = updated;
            store.setUser(updated);

            toasts.success(await translate({
                namespace: TranslatorTranslationNamespace.APP,
                key: TranslatorTranslationAppKey.ACCOUNT_UPDATED,
            }));
        };

        const handleFailed = (e: Error) => toasts.error(e);

        onMounted(async () => {
            try {
                entity.value = await httpClient.userInfo.get<User>();
            } catch (e) {
                handleFailed(e as Error);
            }
        });

        return {
            entity,
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
            v-if="entity"
            :can-manage="false"
            :realm-id="realmId"
            :entity="entity"
            @updated="handleUpdated"
            @failed="handleFailed"
        />
    </div>
</template>

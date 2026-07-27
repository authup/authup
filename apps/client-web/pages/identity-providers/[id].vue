<script lang="ts">

import { 
    TranslatorTranslationAppKey, 
    TranslatorTranslationCommonKey, 
    TranslatorTranslationEntityKey, 
    TranslatorTranslationNamespace, 
} from '@authup/i18n';
import { 
    injectHTTPClient, 
    useTranslations, 
    useTranslationsForNamespace, 
    useTranslator, 
} from '@authup/client-web-kit';
import type { IdentityProvider } from '@authup/core-kit';
import { PermissionName } from '@authup/core-kit';
import { extendObject } from '@authup/kit';
import { VCIcon } from '@vuecs/icon';
import { computed, defineComponent, ref } from 'vue';
import { 
    createError, 
    definePageMeta, 
    navigateTo, 
    useErrorToast, 
    useRoute, 
    useToast, 
} from '#imports';
import { LayoutKey } from '../../config/layout';

export default defineComponent({
    components: { VCIcon },
    async setup() {
        definePageMeta({
            [LayoutKey.REQUIRED_LOGGED_IN]: true,
            [LayoutKey.REQUIRED_PERMISSIONS]: [
                PermissionName.IDENTITY_PROVIDER_UPDATE,
            ],
        });

        const toast = useToast();
        const errorToast = useErrorToast();
        const handleFailed = (e: Error) => errorToast.show(e);
        const route = useRoute();

        const entity = ref<IdentityProvider>(null!);

        const translationsDefault = useTranslations(
            [
                {
                    namespace: TranslatorTranslationNamespace.COMMON, 
                    key: TranslatorTranslationCommonKey.GENERAL, 
                },
                {
                    namespace: TranslatorTranslationNamespace.ENTITY, 
                    key: TranslatorTranslationEntityKey.ROLE, 
                    count: 2, 
                },
                {
                    namespace: TranslatorTranslationNamespace.ENTITY, 
                    key: TranslatorTranslationEntityKey.IDENTITY_PROVIDER, 
                    count: 1, 
                },
            ],
        );

        const translationsApp = useTranslationsForNamespace(
            TranslatorTranslationNamespace.APP,
            [
                { key: TranslatorTranslationAppKey.DETAILS },
            ],
        );

        const translate = useTranslator();

        try {
            entity.value = (await injectHTTPClient()
                .identityProvider
                .getOne(route.params.id as string)).data;
        } catch {
            await navigateTo({ path: '/identity-providers' });
            throw createError({});
        }

        const items = computed(() => [
            {
                name: '',
                icon: 'fa6-solid:arrow-left',
                url: '/identity-providers',
            },
            {
                name: translationsDefault.general,
                icon: 'fa6-solid:bars',
                url: `/identity-providers/${entity.value.id}`,
            },
            {
                name: translationsDefault.role,
                icon: 'fa6-solid:masks-theater',
                url: `/identity-providers/${entity.value.id}/roles`,
            },
        ]);

        const handleUpdated = async (e: IdentityProvider) => {
            toast.show({
                variant: 'success',
                body: await translate({
                    namespace: TranslatorTranslationNamespace.APP,
                    key: TranslatorTranslationAppKey.ENTITY_UPDATED,
                    data: { entity: translationsDefault.identityProvider },
                }),
            });

            extendObject(entity.value, e);
        };


        return {
            entity,
            items,
            handleUpdated,
            handleFailed,
            translationsApp,
        };
    },
});
</script>
<template>
    <div>
        <h1 class="title no-border mb-3">
            <VCIcon
                name="fa6-solid:atom"
                class="me-1"
            /> {{ entity.name }}
            <span class="sub-title ms-1">{{ translationsApp.details }}</span>
        </h1>
        <div class="mb-2">
            <VCNavItems
                :data="items"
                variant="pills"
            />
        </div>
        <div>
            <NuxtPage
                :entity="entity"
                @updated="handleUpdated"
                @failed="handleFailed"
            />
        </div>
    </div>
</template>

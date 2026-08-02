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
import type { Scope } from '@authup/core-kit';
import { PermissionName } from '@authup/core-kit';
import { extendObject } from '@authup/kit';
import { VCIcon } from '@vuecs/icon';
import type { Ref } from 'vue';
import { computed, defineComponent } from 'vue';
import { definePageMeta, useErrorToast, useToast } from '#imports';
import { 
    createError, 
    navigateTo, 
    useAsyncData, 
    useRoute, 
} from '#app';
import { LayoutKey } from '../../config/layout';

export default defineComponent({
    components: { VCIcon },
    async setup() {
        definePageMeta({
            [LayoutKey.REQUIRED_LOGGED_IN]: true,
            [LayoutKey.REQUIRED_PERMISSIONS]: [
                PermissionName.SCOPE_UPDATE,
            ],
        });

        const toast = useToast();
        const errorToast = useErrorToast();
        const handleFailed = (e: Error) => errorToast.show(e);
        const route = useRoute();

        const translationsDefault = useTranslations([
            {
                namespace: TranslatorTranslationNamespace.COMMON, 
                key: TranslatorTranslationCommonKey.GENERAL, 
            },
            {
                namespace: TranslatorTranslationNamespace.ENTITY, 
                key: TranslatorTranslationEntityKey.CLIENT, 
                count: 2, 
            },
            {
                namespace: TranslatorTranslationNamespace.ENTITY, 
                key: TranslatorTranslationEntityKey.SCOPE, 
                count: 1, 
            },
        ]);

        const translationsApp = useTranslationsForNamespace(
            TranslatorTranslationNamespace.APP,
            [
                { key: TranslatorTranslationAppKey.DETAILS },
            ],
        );

        const translate = useTranslator();

        const httpClient = injectHTTPClient();

        const { data, error } = await useAsyncData(
            `scope:${route.params.id}`,
            () => httpClient
                .scope
                .getOne(route.params.id as string)
                .then((response) => response.data),
            // deep, so the in-place `extendObject` update below stays reactive
            // (useAsyncData hands back a shallowRef by default)
            { deep: true },
        );

        if (error.value || !data.value) {
            await navigateTo({ path: '/scopes' });
            throw createError({});
        }

        const entity = data as Ref<Scope>;

        const items = computed(() => [
            {
                name: '',
                icon: 'fa6-solid:arrow-left',
                url: '/scopes',
            },
            {
                name: translationsDefault.general,
                icon: 'fa6-solid:bars',
                url: `/scopes/${entity.value.id}`,
            },
            {
                name: translationsDefault.client,
                icon: 'fa6-solid:ghost',
                url: `/scopes/${entity.value.id}/clients`,
            },
        ]);

        const handleUpdated = async (e: Scope) => {
            if (toast) {
                toast.show({
                    variant: 'success',
                    body: await translate({
                        namespace: TranslatorTranslationNamespace.APP,
                        key: TranslatorTranslationAppKey.ENTITY_UPDATED,
                        data: { entity: translationsDefault.scope },
                    }),
                });
            }

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
                name="fa6-solid:meteor"
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

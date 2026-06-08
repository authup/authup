<script lang="ts">
import {
    TranslatorTranslationAppKey,
    TranslatorTranslationDefaultKey,
    TranslatorTranslationNamespace,
    injectHTTPClient,
    useTranslationsForNamespace,
    useTranslator,
} from '@authup/client-web-kit';
import type { Client } from '@authup/core-kit';
import { PermissionName } from '@authup/core-kit';
import { extendObject } from '@authup/kit';
import { computed, defineComponent, ref } from 'vue';
import {
    createError,
    definePageMeta,
    navigateTo,
    useRoute,
    useToast,
} from '#imports';
import { LayoutKey } from '../../config/layout';

export default defineComponent({
    async setup() {
        definePageMeta({
            [LayoutKey.REQUIRED_LOGGED_IN]: true,
            [LayoutKey.REQUIRED_PERMISSIONS]: [
                PermissionName.CLIENT_UPDATE,
            ],
        });

        const toast = useToast();
        const route = useRoute();

        const entity = ref<Client>(null!);

        const translationsDefault = useTranslationsForNamespace(
            TranslatorTranslationNamespace.DEFAULT,
            [
                { key: TranslatorTranslationDefaultKey.GENERAL },
                { key: TranslatorTranslationDefaultKey.SCOPES },
                { key: TranslatorTranslationDefaultKey.URL },
                { key: TranslatorTranslationDefaultKey.PERMISSIONS },
                { key: TranslatorTranslationDefaultKey.ROLES },
                { key: TranslatorTranslationDefaultKey.CLIENT },
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
            entity.value = await injectHTTPClient()
                .client
                .getOne(route.params.id as string, { fields: ['+secret'] });
        } catch {
            await navigateTo({ path: '/clients' });
            throw createError({});
        }

        const items = computed(() => [
            {
                name: '',
                icon: 'fa6-solid:arrow-left',
                url: '/clients',
            },
            {
                name: translationsDefault.general,
                icon: 'fa6-solid:bars',
                url: `/clients/${entity.value.id}`,
            },
            {
                name: translationsDefault.scopes,
                icon: 'fa6-solid:meteor',
                url: `/clients/${entity.value.id}/scopes`,
            },
            {
                name: translationsDefault.url,
                icon: 'fa6-solid:link',
                url: `/clients/${entity.value.id}/url`,
            },
            {
                name: translationsDefault.permissions,
                icon: 'fa6-solid:user-secret',
                url: `/clients/${entity.value.id}/permissions`,
            },
            {
                name: translationsDefault.roles,
                icon: 'fa6-solid:user-group',
                url: `/clients/${entity.value.id}/roles`,
            },
        ]);

        const handleUpdated = async (e: Client) => {
            if (toast) {
                toast.show({
                    variant: 'success',
                    body: await translate({
                        namespace: TranslatorTranslationNamespace.APP,
                        key: TranslatorTranslationAppKey.ENTITY_UPDATED,
                        data: { entity: translationsDefault.client },
                    }),
                });
            }

            extendObject(entity.value, e);
        };

        const handleFailed = (e: Error) => {
            if (toast) {
                toast.show({
                    variant: 'success',
                    body: e.message,
                });
            }
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
                name="fa6-solid:cube"
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

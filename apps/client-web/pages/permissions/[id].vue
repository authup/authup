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
import type { Permission } from '@authup/core-kit';
import { PermissionName } from '@authup/core-kit';
import { extendObject } from '@authup/kit';
import { computed, defineComponent, ref } from 'vue';
import {
    definePageMeta,
    useToast,
} from '#imports';
import { createError, navigateTo, useRoute } from '#app';
import { LayoutKey } from '../../config/layout';

export default defineComponent({
    async setup() {
        definePageMeta({
            [LayoutKey.REQUIRED_LOGGED_IN]: true,
            [LayoutKey.REQUIRED_PERMISSIONS]: [
                PermissionName.PERMISSION_UPDATE,
            ],
        });

        const toast = useToast();
        const route = useRoute();

        const entity = ref<Permission>(null!);

        const translationsDefault = useTranslations(
            [
                {
                    namespace: TranslatorTranslationNamespace.COMMON, 
                    key: TranslatorTranslationCommonKey.GENERAL, 
                },
                {
                    namespace: TranslatorTranslationNamespace.ENTITY, 
                    key: TranslatorTranslationEntityKey.POLICY, 
                    count: 2, 
                },
                {
                    namespace: TranslatorTranslationNamespace.ENTITY, 
                    key: TranslatorTranslationEntityKey.USER, 
                    count: 2, 
                },
                {
                    namespace: TranslatorTranslationNamespace.ENTITY, 
                    key: TranslatorTranslationEntityKey.CLIENT, 
                    count: 2, 
                },
                {
                    namespace: TranslatorTranslationNamespace.ENTITY, 
                    key: TranslatorTranslationEntityKey.ROBOT, 
                    count: 2, 
                },
                {
                    namespace: TranslatorTranslationNamespace.ENTITY, 
                    key: TranslatorTranslationEntityKey.ROLE, 
                    count: 2, 
                },
                {
                    namespace: TranslatorTranslationNamespace.ENTITY, 
                    key: TranslatorTranslationEntityKey.PERMISSION, 
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
            entity.value = await injectHTTPClient()
                .permission
                .getOne(route.params.id as string);
        } catch {
            await navigateTo({ path: '/permissions' });
            throw createError({});
        }

        const items = computed(() => [
            {
                name: '',
                icon: 'fa6-solid:arrow-left',
                url: '/permissions',
            },
            {
                name: translationsDefault.general,
                icon: 'fa6-solid:bars',
                url: `/permissions/${entity.value.id}`,
            },
            {
                name: translationsDefault.policy,
                icon: 'fa6-solid:shield-halved',
                url: `/permissions/${entity.value.id}/policies`,
            },
            {
                name: translationsDefault.user,
                icon: 'fa6-solid:user',
                url: `/permissions/${entity.value.id}/users`,
            },
            {
                name: translationsDefault.client,
                icon: 'fa6-solid:ghost',
                url: `/permissions/${entity.value.id}/clients`,
            },
            {
                name: translationsDefault.robot,
                icon: 'fa6-solid:robot',
                url: `/permissions/${entity.value.id}/robots`,
            },
            {
                name: translationsDefault.role,
                icon: 'fa6-solid:user-group',
                url: `/permissions/${entity.value.id}/roles`,
            },
        ]);

        const handleUpdated = async (e: Permission) => {
            if (toast) {
                toast.show({
                    variant: 'success',
                    body: await translate({
                        namespace: TranslatorTranslationNamespace.APP,
                        key: TranslatorTranslationAppKey.ENTITY_UPDATED,
                        data: { entity: translationsDefault.permission },
                    }),
                });
            }

            extendObject(entity.value, e);
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
            items,
            entity,
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
                name="fa6-solid:user"
                class="me-1"
            />
            {{ entity.name }}
            <span class="sub-title ms-1">
                {{ translationsApp.details }}
            </span>
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

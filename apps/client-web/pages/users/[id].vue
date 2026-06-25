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
import type { User } from '@authup/core-kit';
import { PermissionName } from '@authup/core-kit';
import { extendObject } from '@authup/kit';
import { VCIcon } from '@vuecs/icon';
import { computed, defineComponent, ref } from 'vue';
import { definePageMeta, useErrorToast, useToast } from '#imports';
import { createError, navigateTo, useRoute } from '#app';
import { LayoutKey } from '../../config/layout';

export default defineComponent({
    components: { VCIcon },
    async setup() {
        definePageMeta({
            [LayoutKey.REQUIRED_LOGGED_IN]: true,
            [LayoutKey.REQUIRED_PERMISSIONS]: [
                PermissionName.USER_UPDATE,
                PermissionName.USER_ROLE_CREATE,
                PermissionName.USER_ROLE_UPDATE,
                PermissionName.USER_ROLE_DELETE,
            ],
        });

        const toast = useToast();
        const errorToast = useErrorToast();
        const handleFailed = (e: Error) => errorToast.show(e);
        const route = useRoute();

        const entity = ref<User>(null!);

        const translationsDefault = useTranslations([
            {
                namespace: TranslatorTranslationNamespace.COMMON, 
                key: TranslatorTranslationCommonKey.GENERAL, 
            },
            {
                namespace: TranslatorTranslationNamespace.ENTITY, 
                key: TranslatorTranslationEntityKey.PERMISSION, 
                count: 2, 
            },
            {
                namespace: TranslatorTranslationNamespace.ENTITY, 
                key: TranslatorTranslationEntityKey.ROLE, 
                count: 2, 
            },
            {
                namespace: TranslatorTranslationNamespace.ENTITY, 
                key: TranslatorTranslationEntityKey.USER, 
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

        try {
            entity.value = await injectHTTPClient()
                .user
                .getOne(route.params.id as string, { fields: ['+email'] });
        } catch {
            await navigateTo({ path: '/users' });
            throw createError({});
        }

        const items = computed(() => [
            {
                name: '',
                icon: 'fa6-solid:arrow-left',
                url: '/users',
            },
            {
                name: translationsDefault.general,
                icon: 'fa6-solid:bars',
                url: `/users/${entity.value.id}`,
            },
            {
                name: translationsDefault.permission,
                icon: 'fa6-solid:user-secret',
                url: `/users/${entity.value.id}/permissions`,
            },
            {
                name: translationsDefault.role,
                icon: 'fa6-solid:user-group',
                url: `/users/${entity.value.id}/roles`,
            },
        ]);

        const handleUpdated = async (e: User) => {
            if (toast) {
                toast.show({
                    variant: 'success',
                    body: await translate({
                        namespace: TranslatorTranslationNamespace.APP,
                        key: TranslatorTranslationAppKey.ENTITY_UPDATED,
                        data: { entity: translationsDefault.user },
                    }),
                });
            }

            extendObject(entity.value, e);
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

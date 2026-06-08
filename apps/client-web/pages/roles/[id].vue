<script lang="ts">
import {
    TranslatorTranslationAppKey,
    TranslatorTranslationDefaultKey,
    TranslatorTranslationNamespace,
    injectHTTPClient,
    useTranslationsForNamespace,
    useTranslator,
} from '@authup/client-web-kit';
import type { Role } from '@authup/core-kit';
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
                PermissionName.ROLE_UPDATE,
                PermissionName.USER_ROLE_CREATE,
                PermissionName.USER_ROLE_UPDATE,
                PermissionName.USER_ROLE_DELETE,
            ],
        });

        const toast = useToast();
        const route = useRoute();

        const entity = ref<Role>(null!);

        try {
            entity.value = await injectHTTPClient()
                .role
                .getOne(route.params.id as string);
        } catch {
            await navigateTo({ path: '/roles' });
            throw createError({});
        }

        const translationsDefault = useTranslationsForNamespace(
            TranslatorTranslationNamespace.DEFAULT,
            [
                { key: TranslatorTranslationDefaultKey.GENERAL },
                { key: TranslatorTranslationDefaultKey.CLIENTS },
                { key: TranslatorTranslationDefaultKey.PERMISSIONS },
                { key: TranslatorTranslationDefaultKey.USERS },
                { key: TranslatorTranslationDefaultKey.ROLE },
            ],
        );

        const translationsApp = useTranslationsForNamespace(
            TranslatorTranslationNamespace.APP,
            [
                { key: TranslatorTranslationAppKey.DETAILS },
            ],
        );

        const translate = useTranslator();

        const items = computed(() => [
            {
                name: '',
                icon: 'fa6-solid:arrow-left',
                url: '/roles',
            },
            {
                name: translationsDefault.general,
                icon: 'fa6-solid:bars',
                url: `/roles/${entity.value.id}`,
            },
            {
                name: translationsDefault.clients,
                icon: 'fa6-solid:ghost',
                url: `/roles/${entity.value.id}/clients`,
            },
            {
                name: translationsDefault.permissions,
                icon: 'fa6-solid:user-secret',
                url: `/roles/${entity.value.id}/permissions`,
            },
            {
                name: translationsDefault.users,
                icon: 'fa6-solid:user',
                url: `/roles/${entity.value.id}/users`,
            },
        ]);

        const handleUpdated = async (e: Role) => {
            if (toast) {
                toast.show({
                    variant: 'success',
                    body: await translate({
                        namespace: TranslatorTranslationNamespace.APP,
                        key: TranslatorTranslationAppKey.ENTITY_UPDATED,
                        data: { entity: translationsDefault.role },
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
                name="fa6-solid:masks-theater"
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

<script lang="ts">
import { 
    TranslatorTranslationAppKey, 
    TranslatorTranslationCommonKey, 
    TranslatorTranslationEntityKey, 
    TranslatorTranslationNamespace, 
} from '@authup/i18n';
import {
    injectHTTPClient,
    usePermissionCheck,
    useTranslations,
    useTranslationsForNamespace,
    useTranslator,
} from '@authup/client-web-kit';
import type { User } from '@authup/core-kit';
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
            {
                namespace: TranslatorTranslationNamespace.ENTITY,
                key: TranslatorTranslationEntityKey.SESSION,
                count: 2,
            },
        ]);

        const translationsApp = useTranslationsForNamespace(
            TranslatorTranslationNamespace.APP,
            [
                { key: TranslatorTranslationAppKey.DETAILS },
                { key: TranslatorTranslationAppKey.AUTHENTICATOR },
            ],
        );

        const translate = useTranslator();

        // The sessions tab surfaces the user's login sessions — only an actor
        // holding SESSION_READ may list another identity's sessions (the server
        // force-scopes everyone else to their own), so gate the tab on it. The
        // route itself is protected in the child page's definePageMeta.
        const hasSessionReadPermission = usePermissionCheck({ name: PermissionName.SESSION_READ });

        // The authenticators tab manages a user's second-factor devices —
        // gated on USER_AUTHENTICATOR_READ (own-device management is
        // self-service on the settings page, not here). The child route is
        // protected in its own definePageMeta.
        const hasAuthenticatorReadPermission = usePermissionCheck({ name: PermissionName.USER_AUTHENTICATOR_READ });

        const httpClient = injectHTTPClient();

        const { data, error } = await useAsyncData(
            `user:${route.params.id}`,
            () => httpClient
                .user
                .getOne(route.params.id as string, { fields: ['+email'] })
                .then((response) => response.data),
            // deep, so the in-place `extendObject` update below stays reactive
            // (useAsyncData hands back a shallowRef by default)
            { deep: true },
        );

        if (error.value || !data.value) {
            await navigateTo({ path: '/users' });
            throw createError({});
        }

        const entity = data as Ref<User>;

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
            ...(hasSessionReadPermission.value ? [{
                name: translationsDefault.session,
                icon: 'fa6-solid:desktop',
                url: `/users/${entity.value.id}/sessions`,
            }] : []),
            ...(hasAuthenticatorReadPermission.value ? [{
                name: translationsApp.authenticator,
                icon: 'fa6-solid:shield-halved',
                url: `/users/${entity.value.id}/authenticators`,
            }] : []),
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

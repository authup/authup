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
import { VCBreadcrumb } from '@vuecs/navigation';
import type { Ref } from 'vue';
import { computed, defineComponent, ref } from 'vue';
import { buildRecordHeading } from '../../composables/record';
import { LayoutSection } from '../../config/layout';
import { useRoute, useRouter } from 'vue-router';
import { buildEntityBreadcrumb, useSectionBreadcrumb } from '../../composables/breadcrumb';
import { useErrorToast } from '../../composables/error';
import { useToast } from '../../composables/toast';

export default defineComponent({
    components: { VCBreadcrumb, VCIcon },
    async setup() {
        const toast = useToast();
        const errorToast = useErrorToast();
        const handleFailed = (e: Error) => errorToast.show(e);
        const route = useRoute();
        const router = useRouter();

        // Resolves through inject(), so it has to run before the record fetch
        // below is awaited.
        const breadcrumbBase = useSectionBreadcrumb(LayoutSection.USERS);

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
            {
                namespace: TranslatorTranslationNamespace.ENTITY,
                key: TranslatorTranslationEntityKey.IDENTITY_PROVIDER_ACCOUNT,
                count: 2,
            },
        ]);

        const translationsApp = useTranslationsForNamespace(
            TranslatorTranslationNamespace.APP,
            [
                { key: TranslatorTranslationAppKey.AUTHENTICATOR },
            ],
        );

        const translate = useTranslator();

        // The sessions tab surfaces the user's login sessions — only an actor
        // holding SESSION_READ may list another identity's sessions (the server
        // force-scopes everyone else to their own), so gate the tab on it. The
        // route itself is protected by its route meta (src/router.ts).
        const hasSessionReadPermission = usePermissionCheck({ name: PermissionName.SESSION_READ });

        // The authenticators tab manages a user's second-factor devices —
        // gated on USER_AUTHENTICATOR_READ (own-device management is
        // self-service on the settings page, not here). The child route is
        // protected by its own route meta.
        const hasAuthenticatorReadPermission = usePermissionCheck({ name: PermissionName.USER_AUTHENTICATOR_READ });

        // The connected-accounts tab lists the user's linked external
        // identity-provider accounts — only an actor holding
        // IDENTITY_PROVIDER_ACCOUNT_READ may list another user's rows (the
        // server force-scopes everyone else to their own). The child route
        // is protected by its own route meta.
        const hasIdentityProviderAccountReadPermission = usePermissionCheck({ name: PermissionName.IDENTITY_PROVIDER_ACCOUNT_READ });

        const httpClient = injectHTTPClient();

        // A record that cannot be loaded sends the visitor back to the
        // collection; the template renders nothing until then (`v-if`).
        let entity : Ref<User | null> = ref(null);
        try {
            entity = ref(await httpClient
                .user
                .getOne(route.params.id as string, { fields: ['+email'] })
                .then((response) => response.data));
        } catch {
            await router.replace({ path: '/users' });
        }

        const items = computed(() => (entity.value ? [
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
            ...(hasIdentityProviderAccountReadPermission.value ? [{
                name: translationsDefault.identityProviderAccount,
                icon: 'fa6-solid:link',
                url: `/users/${entity.value.id}/identity-provider-accounts`,
            }] : []),
        ] : []));

        const heading = computed(() => buildRecordHeading(entity.value ?? {}));

        const breadcrumbItems = computed(() => buildEntityBreadcrumb({
            base: breadcrumbBase.value,
            entity: {
                label: heading.value.label,
                url: `/users/${entity.value?.id}`,
            },
            path: route.path,
            tabs: items.value,
        }));

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

            if (entity.value) {
                extendObject(entity.value, e);
            }
        };

        return {
            heading,
            breadcrumbItems,
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
    <div v-if="entity">
        <VCBreadcrumb
            :items="breadcrumbItems"
            class="mb-2"
        />
        <div class="mb-3">
            <h1 class="title no-border mb-0">
                <VCIcon
                    name="fa6-solid:user"
                    class="me-1"
                />
                {{ heading.label }}
            </h1>
            <p
                v-if="heading.subTitle"
                class="sub-title"
            >
                {{ heading.subTitle }}
            </p>
        </div>
        <div class="mb-2">
            <VCNavItems
                :data="items"
                variant="pills"
            />
        </div>

        <div>
            <RouterView
                :entity="entity"
                @updated="handleUpdated"
                @failed="handleFailed"
            />
        </div>
    </div>
</template>

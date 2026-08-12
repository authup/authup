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
    useTranslator,
} from '@authup/client-web-kit';
import type { IdentityProvider } from '@authup/core-kit';
import { PermissionName } from '@authup/core-kit';
import { extendObject } from '@authup/kit';
import { VCIcon } from '@vuecs/icon';
import { VCBreadcrumb } from '@vuecs/navigation';
import type { Ref } from 'vue';
import { computed, defineComponent } from 'vue';
import {
    buildEntityBreadcrumb,
    createError,
    definePageMeta,
    navigateTo,
    useAsyncData,
    useErrorToast,
    useRoute,
    useSectionBreadcrumb,
    useToast,
} from '#imports';
import { buildRecordHeading } from '../../composables/record';
import { LayoutKey, LayoutSection } from '../../config/layout';

export default defineComponent({
    components: { VCBreadcrumb, VCIcon },
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

        // Resolves through inject(), so it has to run before the record fetch
        // below is awaited.
        const breadcrumbBase = useSectionBreadcrumb(LayoutSection.IDENTITY_PROVIDERS);

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


        const translate = useTranslator();

        const httpClient = injectHTTPClient();

        const { data, error } = await useAsyncData(
            `identity-provider:${route.params.id}`,
            () => httpClient
                .identityProvider
                .getOne(route.params.id as string)
                .then((response) => response.data),
            // deep, so the in-place `extendObject` update below stays reactive
            // (useAsyncData hands back a shallowRef by default)
            { deep: true },
        );

        if (error.value || !data.value) {
            await navigateTo({ path: '/identity-providers' });
            throw createError({});
        }

        const entity = data as Ref<IdentityProvider>;

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

        const heading = computed(() => buildRecordHeading(entity.value));

        const breadcrumbItems = computed(() => buildEntityBreadcrumb({
            base: breadcrumbBase.value,
            entity: {
                label: heading.value.label,
                url: `/identity-providers/${entity.value.id}`,
            },
            path: route.path,
            tabs: items.value,
        }));

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
            heading,
            breadcrumbItems,
            entity,
            items,
            handleUpdated,
            handleFailed,
        };
    },
});
</script>
<template>
    <div>
        <VCBreadcrumb
            :items="breadcrumbItems"
            class="mb-2"
        />
        <div class="mb-3">
            <h1 class="title no-border mb-0">
                <VCIcon
                    name="fa6-solid:atom"
                    class="me-1"
                /> {{ heading.label }}
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
            <NuxtPage
                :entity="entity"
                @updated="handleUpdated"
                @failed="handleFailed"
            />
        </div>
    </div>
</template>

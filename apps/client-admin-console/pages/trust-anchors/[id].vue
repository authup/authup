<script lang="ts">
import {
    ATrustAnchorForm,
    injectHTTPClient,
    useTranslations,
    useTranslator,
} from '@authup/client-web-kit';
import type { TrustAnchor } from '@authup/core-kit';
import { PermissionName } from '@authup/core-kit';
import { TranslatorTranslationAppKey, TranslatorTranslationEntityKey, TranslatorTranslationNamespace } from '@authup/i18n';
import { extendObject } from '@authup/kit';
import { VCIcon } from '@vuecs/icon';
import { VCBreadcrumb } from '@vuecs/navigation';
import type { Ref } from 'vue';
import { computed, defineComponent } from 'vue';
import {
    createError,
    navigateTo,
    useAsyncData,
    useRoute,
} from '#app';
import {
    buildEntityBreadcrumb,
    definePageMeta,
    useErrorToast,
    useSectionBreadcrumb,
    useToast,
} from '#imports';
import { buildRecordHeading } from '../../composables/record';
import { LayoutKey, LayoutSection } from '../../config/layout';

export default defineComponent({
    components: {
        ATrustAnchorForm,
        VCBreadcrumb,
        VCIcon,
    },
    async setup() {
        definePageMeta({
            [LayoutKey.REQUIRED_LOGGED_IN]: true,
            [LayoutKey.REQUIRED_PERMISSIONS]: [PermissionName.KEY_UPDATE],
        });

        const route = useRoute();

        // Resolves through inject(), so it has to run before the record fetch
        // below is awaited.
        const breadcrumbBase = useSectionBreadcrumb(LayoutSection.TRUST_ANCHORS);

        // Same rule, and the reason this page used to answer 500 on a server
        // render: these sat below the await, where `inject()` no longer
        // resolves, so `useToast()` threw "No ToastManager available". Every
        // sibling detail page already resolves them here.
        const toast = useToast();
        const errorToast = useErrorToast();

        const translate = useTranslator();
        const translations = useTranslations([
            {
                namespace: TranslatorTranslationNamespace.ENTITY,
                key: TranslatorTranslationEntityKey.TRUST_ANCHOR,
                count: 1,
            },
        ]);


        const httpClient = injectHTTPClient();

        const { data, error } = await useAsyncData(
            `trust-anchor:${route.params.id}`,
            () => httpClient
                .trustAnchor
                .getOne(route.params.id as string)
                .then((response) => response.data),
            // deep, so the in-place `extendObject` update below stays reactive
            // (useAsyncData hands back a shallowRef by default)
            { deep: true },
        );

        if (error.value || !data.value) {
            await navigateTo({ path: '/trust-anchors' });
            throw createError({});
        }

        const entity = data as Ref<TrustAnchor>;

        const handleUpdated = async (updated: TrustAnchor) => {
            extendObject(entity.value, updated);

            if (toast) {
                toast.show({
                    variant: 'success',
                    body: await translate({
                        namespace: TranslatorTranslationNamespace.APP,
                        key: TranslatorTranslationAppKey.ENTITY_UPDATED,
                        data: { entity: translations.trustAnchor },
                    }),
                });
            }
        };

        const items = computed(() => [{
            name: '',
            icon: 'fa6-solid:arrow-left',
            url: '/trust-anchors',
        }]);

        const heading = computed(() => buildRecordHeading(entity.value));

        const breadcrumbItems = computed(() => buildEntityBreadcrumb({
            base: breadcrumbBase.value,
            entity: {
                label: heading.value.label,
                url: `/trust-anchors/${entity.value.id}`,
            },
            path: route.path,
            tabs: items.value,
        }));

        return {
            heading,
            breadcrumbItems,
            entity,
            handleFailed: (e: Error) => errorToast.show(e),
            handleUpdated,
            items,
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
                    name="fa6-solid:certificate"
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
        <ATrustAnchorForm
            :entity="entity"
            @updated="handleUpdated"
            @failed="handleFailed"
        />
    </div>
</template>

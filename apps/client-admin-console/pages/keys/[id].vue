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
import type { Key } from '@authup/core-kit';
import { PermissionName } from '@authup/core-kit';
import { extendObject } from '@authup/kit';
import { VCIcon } from '@vuecs/icon';
import { VCBreadcrumb } from '@vuecs/navigation';
import type { Ref } from 'vue';
import { computed, defineComponent } from 'vue';
import {
    buildEntityBreadcrumb,
    definePageMeta,
    useErrorToast,
    useSectionBreadcrumb,
    useToast,
} from '#imports';
import {
    createError,
    navigateTo,
    useAsyncData,
    useRoute,
} from '#app';
import { buildRecordHeading } from '../../composables/record';
import { LayoutKey, LayoutSection } from '../../config/layout';

export default defineComponent({
    components: { VCBreadcrumb, VCIcon },
    async setup() {
        definePageMeta({
            [LayoutKey.REQUIRED_LOGGED_IN]: true,
            [LayoutKey.REQUIRED_PERMISSIONS]: [
                PermissionName.KEY_UPDATE,
            ],
        });

        const toast = useToast();
        const errorToast = useErrorToast();
        const handleFailed = (e: Error) => errorToast.show(e);
        const route = useRoute();

        // Resolves through inject(), so it has to run before the record fetch
        // below is awaited.
        const breadcrumbBase = useSectionBreadcrumb(LayoutSection.KEYS);

        const translationsDefault = useTranslations([
            {
                namespace: TranslatorTranslationNamespace.COMMON,
                key: TranslatorTranslationCommonKey.GENERAL,
            },
            {
                namespace: TranslatorTranslationNamespace.ENTITY,
                key: TranslatorTranslationEntityKey.KEY,
                count: 1,
            },
        ]);


        const translate = useTranslator();

        const httpClient = injectHTTPClient();

        const { data, error } = await useAsyncData(
            `key:${route.params.id}`,
            () => httpClient
                .key
                .getOne(route.params.id as string)
                .then((response) => response.data),
            // deep, so the in-place `extendObject` update below stays reactive
            // (useAsyncData hands back a shallowRef by default)
            { deep: true },
        );

        if (error.value || !data.value) {
            await navigateTo({ path: '/keys' });
            throw createError({});
        }

        const entity = data as Ref<Key>;

        const items = computed(() => [
            {
                name: '',
                icon: 'fa6-solid:arrow-left',
                url: '/keys',
            },
            {
                name: translationsDefault.general,
                icon: 'fa6-solid:bars',
                url: `/keys/${entity.value.id}`,
            },
        ]);

        const heading = computed(() => buildRecordHeading(entity.value));

        const breadcrumbItems = computed(() => buildEntityBreadcrumb({
            base: breadcrumbBase.value,
            entity: {
                label: heading.value.label,
                url: `/keys/${entity.value.id}`,
            },
            path: route.path,
            tabs: items.value,
        }));

        const handleUpdated = async (e: Key) => {
            if (toast) {
                toast.show({
                    variant: 'success',
                    body: await translate({
                        namespace: TranslatorTranslationNamespace.APP,
                        key: TranslatorTranslationAppKey.ENTITY_UPDATED,
                        data: { entity: translationsDefault.key },
                    }),
                });
            }

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
                    name="fa6-solid:key"
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

<script lang="ts">
import {
    TranslatorTranslationAppKey,
    TranslatorTranslationCommonKey,
    TranslatorTranslationEntityKey,
    TranslatorTranslationFieldKey,
    TranslatorTranslationNamespace,
} from '@authup/i18n';
import {
    injectHTTPClient,
    useTranslations,
    useTranslator,
} from '@authup/client-web-kit';
import type { Client } from '@authup/core-kit';
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
        const breadcrumbBase = useSectionBreadcrumb(LayoutSection.CLIENTS);

        const translationsDefault = useTranslations(
            [
                {
                    namespace: TranslatorTranslationNamespace.COMMON, 
                    key: TranslatorTranslationCommonKey.GENERAL, 
                },
                {
                    namespace: TranslatorTranslationNamespace.ENTITY, 
                    key: TranslatorTranslationEntityKey.SCOPE, 
                    count: 2, 
                },
                {
                    namespace: TranslatorTranslationNamespace.FIELD, 
                    key: TranslatorTranslationFieldKey.URL, 
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
                    key: TranslatorTranslationEntityKey.CLIENT, 
                    count: 1, 
                },
            ],
        );


        const translate = useTranslator();

        const httpClient = injectHTTPClient();

        // A record that cannot be loaded sends the visitor back to the
        // collection; the template renders nothing until then (`v-if`).
        let entity : Ref<Client | null> = ref(null);
        try {
            entity = ref(await httpClient
                .client
                .getOne(route.params.id as string, { fields: ['+secret'] })
                .then((response) => response.data));
        } catch {
            await router.replace({ path: '/clients' });
        }

        const items = computed(() => (entity.value ? [
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
                name: translationsDefault.scope,
                icon: 'fa6-solid:meteor',
                url: `/clients/${entity.value.id}/scopes`,
            },
            {
                name: translationsDefault.url,
                icon: 'fa6-solid:link',
                url: `/clients/${entity.value.id}/url`,
            },
            {
                name: translationsDefault.permission,
                icon: 'fa6-solid:user-secret',
                url: `/clients/${entity.value.id}/permissions`,
            },
            {
                name: translationsDefault.role,
                icon: 'fa6-solid:user-group',
                url: `/clients/${entity.value.id}/roles`,
            },
        ] : []));

        const heading = computed(() => buildRecordHeading(entity.value ?? {}));

        const breadcrumbItems = computed(() => buildEntityBreadcrumb({
            base: breadcrumbBase.value,
            entity: {
                label: heading.value.label,
                url: `/clients/${entity.value?.id}`,
            },
            path: route.path,
            tabs: items.value,
        }));

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

            if (entity.value) {
                extendObject(entity.value, e);
            }
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
    <div v-if="entity">
        <VCBreadcrumb
            :items="breadcrumbItems"
            class="mb-2"
        />
        <div class="mb-3">
            <h1 class="title no-border mb-0">
                <VCIcon
                    name="fa6-solid:cube"
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
            <RouterView
                :entity="entity"
                @updated="handleUpdated"
                @failed="handleFailed"
            />
        </div>
    </div>
</template>

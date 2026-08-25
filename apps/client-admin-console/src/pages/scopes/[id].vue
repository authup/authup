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
import type { Scope } from '@authup/core-kit';
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
        const breadcrumbBase = useSectionBreadcrumb(LayoutSection.SCOPES);

        const translationsDefault = useTranslations([
            {
                namespace: TranslatorTranslationNamespace.COMMON, 
                key: TranslatorTranslationCommonKey.GENERAL, 
            },
            {
                namespace: TranslatorTranslationNamespace.ENTITY, 
                key: TranslatorTranslationEntityKey.CLIENT, 
                count: 2, 
            },
            {
                namespace: TranslatorTranslationNamespace.ENTITY, 
                key: TranslatorTranslationEntityKey.SCOPE, 
                count: 1, 
            },
        ]);


        const translate = useTranslator();

        const httpClient = injectHTTPClient();

        // A record that cannot be loaded sends the visitor back to the
        // collection; the template renders nothing until then (`v-if`).
        let entity : Ref<Scope | null> = ref(null);
        try {
            entity = ref(await httpClient
                .scope
                .getOne(route.params.id as string)
                .then((response) => response.data));
        } catch {
            await router.replace({ path: '/scopes' });
        }

        const items = computed(() => (entity.value ? [
            {
                name: '',
                icon: 'fa6-solid:arrow-left',
                url: '/scopes',
            },
            {
                name: translationsDefault.general,
                icon: 'fa6-solid:bars',
                url: `/scopes/${entity.value.id}`,
            },
            {
                name: translationsDefault.client,
                icon: 'fa6-solid:ghost',
                url: `/scopes/${entity.value.id}/clients`,
            },
        ] : []));

        const heading = computed(() => buildRecordHeading(entity.value ?? {}));

        const breadcrumbItems = computed(() => buildEntityBreadcrumb({
            base: breadcrumbBase.value,
            entity: {
                label: heading.value.label,
                url: `/scopes/${entity.value?.id}`,
            },
            path: route.path,
            tabs: items.value,
        }));

        const handleUpdated = async (e: Scope) => {
            if (toast) {
                toast.show({
                    variant: 'success',
                    body: await translate({
                        namespace: TranslatorTranslationNamespace.APP,
                        key: TranslatorTranslationAppKey.ENTITY_UPDATED,
                        data: { entity: translationsDefault.scope },
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
                    name="fa6-solid:meteor"
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

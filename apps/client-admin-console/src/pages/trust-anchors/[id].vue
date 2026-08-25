<script lang="ts">
import {
    ATrustAnchorForm,
    injectHTTPClient,
    useTranslations,
    useTranslator,
} from '@authup/client-web-kit';
import type { TrustAnchor } from '@authup/core-kit';
import { TranslatorTranslationAppKey, TranslatorTranslationEntityKey, TranslatorTranslationNamespace } from '@authup/i18n';
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
    components: {
        ATrustAnchorForm,
        VCBreadcrumb,
        VCIcon,
    },
    async setup() {
        const route = useRoute();
        const router = useRouter();

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

        // A record that cannot be loaded sends the visitor back to the
        // collection; the template renders nothing until then (`v-if`).
        let entity : Ref<TrustAnchor | null> = ref(null);
        try {
            entity = ref(await httpClient
                .trustAnchor
                .getOne(route.params.id as string)
                .then((response) => response.data));
        } catch {
            await router.replace({ path: '/trust-anchors' });
        }

        const handleUpdated = async (updated: TrustAnchor) => {
            if (entity.value) {
                extendObject(entity.value, updated);
            }

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

        const heading = computed(() => buildRecordHeading(entity.value ?? {}));

        const breadcrumbItems = computed(() => buildEntityBreadcrumb({
            base: breadcrumbBase.value,
            entity: {
                label: heading.value.label,
                url: `/trust-anchors/${entity.value?.id}`,
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
    <div v-if="entity">
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

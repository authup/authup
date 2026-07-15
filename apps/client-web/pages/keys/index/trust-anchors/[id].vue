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
import { computed, defineComponent, ref } from 'vue';
import {
    createError,
    navigateTo,
    useRoute,
} from '#app';
import {
    definePageMeta,
    useErrorToast,
    useToast,
} from '#imports';
import { LayoutKey } from '../../../../config/layout';

export default defineComponent({
    components: { ATrustAnchorForm },
    async setup() {
        definePageMeta({
            [LayoutKey.REQUIRED_LOGGED_IN]: true,
            [LayoutKey.REQUIRED_PERMISSIONS]: [PermissionName.KEY_UPDATE],
        });

        const route = useRoute();
        const entity = ref<TrustAnchor>(null!);
        try {
            entity.value = await injectHTTPClient().trustAnchor.getOne(route.params.id as string);
        } catch {
            await navigateTo({ path: '/keys/trust-anchors' });
            throw createError({});
        }

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

        return {
            entity,
            handleFailed: (e: Error) => errorToast.show(e),
            handleUpdated,
            items: computed(() => [{
                name: '',
                icon: 'fa6-solid:arrow-left',
                url: '/keys/trust-anchors',
            }]),
        };
    },
});
</script>

<template>
    <div>
        <div class="mb-2">
            <VCNavItems
                :data="items"
                variant="pills"
            />
        </div>
        <h6 class="title">
            {{ entity.name }}
        </h6>
        <ATrustAnchorForm
            :entity="entity"
            @updated="handleUpdated"
            @failed="handleFailed"
        />
    </div>
</template>

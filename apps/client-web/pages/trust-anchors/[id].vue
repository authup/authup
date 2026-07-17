<script lang="ts">
import {
    ATrustAnchorForm,
    injectHTTPClient,
    useTranslations,
    useTranslationsForNamespace,
    useTranslator,
} from '@authup/client-web-kit';
import type { TrustAnchor } from '@authup/core-kit';
import { PermissionName } from '@authup/core-kit';
import { TranslatorTranslationAppKey, TranslatorTranslationEntityKey, TranslatorTranslationNamespace } from '@authup/i18n';
import { extendObject } from '@authup/kit';
import { VCIcon } from '@vuecs/icon';
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
import { LayoutKey } from '../../config/layout';

export default defineComponent({
    components: { ATrustAnchorForm, VCIcon },
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
            await navigateTo({ path: '/trust-anchors' });
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

        const translationsApp = useTranslationsForNamespace(
            TranslatorTranslationNamespace.APP,
            [
                { key: TranslatorTranslationAppKey.DETAILS },
            ],
        );

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
            translationsApp,
            items: computed(() => [{
                name: '',
                icon: 'fa6-solid:arrow-left',
                url: '/trust-anchors',
            }]),
        };
    },
});
</script>

<template>
    <div>
        <h1 class="title no-border mb-3">
            <VCIcon
                name="fa6-solid:certificate"
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
        <ATrustAnchorForm
            :entity="entity"
            @updated="handleUpdated"
            @failed="handleFailed"
        />
    </div>
</template>

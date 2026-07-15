<script lang="ts">

import type { Key } from '@authup/core-kit';
import { PermissionName } from '@authup/core-kit';
import {
    TranslatorTranslationActionKey,
    TranslatorTranslationAppKey,
    TranslatorTranslationCommonKey,
    TranslatorTranslationEntityKey,
    TranslatorTranslationNamespace,
} from '@authup/i18n';
import {
    useTranslation,
    useTranslations,
    useTranslationsForNamespace,
    useTranslator,
} from '@authup/client-web-kit';
import { VCIcon } from '@vuecs/icon';
import { defineNuxtComponent } from '#app';
import {
    computed,
    definePageMeta,
    useErrorToast,
    useToast,
} from '#imports';
import { LayoutKey } from '../../config/layout';

export default defineNuxtComponent({
    components: { VCIcon },
    setup() {
        definePageMeta({
            [LayoutKey.REQUIRED_LOGGED_IN]: true,
            [LayoutKey.REQUIRED_PERMISSIONS]: [
                PermissionName.KEY_READ,
                PermissionName.KEY_UPDATE,
                PermissionName.KEY_DELETE,
                PermissionName.KEY_CREATE,
            ],
        });

        const toast = useToast();
        const errorToast = useErrorToast();
        const handleFailed = (e: Error) => errorToast.show(e);

        const translationsDefault = useTranslations([
            {
                namespace: TranslatorTranslationNamespace.COMMON,
                key: TranslatorTranslationCommonKey.OVERVIEW,
            },
            {
                namespace: TranslatorTranslationNamespace.ACTION,
                key: TranslatorTranslationActionKey.ADD,
            },
            {
                namespace: TranslatorTranslationNamespace.ENTITY,
                key: TranslatorTranslationEntityKey.KEY,
                count: 2,
            },
            {
                namespace: TranslatorTranslationNamespace.ENTITY,
                key: TranslatorTranslationEntityKey.TRUST_ANCHOR,
                count: 2,
            },
        ]);

        const keySingular = useTranslation({
            namespace: TranslatorTranslationNamespace.ENTITY,
            key: TranslatorTranslationEntityKey.KEY,
            count: 1,
        });
        const trustAnchorSingular = useTranslation({
            namespace: TranslatorTranslationNamespace.ENTITY,
            key: TranslatorTranslationEntityKey.TRUST_ANCHOR,
            count: 1,
        });

        const translationsApp = useTranslationsForNamespace(
            TranslatorTranslationNamespace.APP,
            [
                { key: TranslatorTranslationAppKey.MANAGEMENT },
            ],
        );

        const translate = useTranslator();

        const items = computed(() => [
            {
                name: translationsDefault.overview,
                icon: 'fa6-solid:bars',
                url: '/keys',
            },
            {
                name: `${translationsDefault.add} ${keySingular.value}`,
                icon: 'fa6-solid:plus',
                url: '/keys/add',
            },
            {
                name: translationsDefault.trustAnchor,
                icon: 'fa6-solid:certificate',
                url: '/keys/trust-anchors',
            },
            {
                name: `${translationsDefault.add} ${trustAnchorSingular.value}`,
                icon: 'fa6-solid:plus',
                url: '/keys/trust-anchors/add',
            },
        ]);

        const handleDeleted = async (e: Key) => {
            if (toast) {
                toast.show({
                    variant: 'success',
                    body: await translate({
                        namespace: TranslatorTranslationNamespace.APP,
                        key: TranslatorTranslationAppKey.ENTITY_DELETED,
                        data: {
                            entity: await translate({
                                namespace: TranslatorTranslationNamespace.ENTITY,
                                key: TranslatorTranslationEntityKey.KEY,
                                count: 1,
                            }),
                            name: e.name,
                        },
                    }),
                });
            }
        };


        return {
            handleDeleted,
            handleFailed,
            items,
            translationsDefault,
            translationsApp,
        };
    },
});
</script>
<template>
    <div>
        <h1 class="title no-border mb-3">
            <VCIcon
                name="fa6-solid:key"
                class="me-1"
            /> {{ translationsDefault.key }}
            <span class="sub-title ms-1">{{ translationsApp.management }}</span>
        </h1>
        <div class="content-wrapper">
            <div class="content-sidebar flex-col">
                <VCNavItems
                    :data="items"
                    variant="pills"
                    orientation="vertical"
                />
            </div>
            <div class="content-container">
                <NuxtPage
                    @deleted="handleDeleted"
                    @failed="handleFailed"
                />
            </div>
        </div>
    </div>
</template>

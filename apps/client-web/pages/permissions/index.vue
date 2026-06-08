<script lang="ts">

import type { Permission } from '@authup/core-kit';
import { PermissionName } from '@authup/core-kit';
import {
    TranslatorTranslationActionKey,
    TranslatorTranslationAppKey,
    TranslatorTranslationCommonKey,
    TranslatorTranslationEntityKey,
    TranslatorTranslationNamespace,
    useTranslations,
    useTranslationsForNamespace,
    useTranslator,
} from '@authup/client-web-kit';
import { defineNuxtComponent } from '#app';
import { computed, definePageMeta, useToast } from '#imports';
import { LayoutKey } from '../../config/layout';

export default defineNuxtComponent({
    setup() {
        definePageMeta({
            [LayoutKey.REQUIRED_LOGGED_IN]: true,
            [LayoutKey.REQUIRED_PERMISSIONS]: [
                PermissionName.PERMISSION_READ,
                PermissionName.PERMISSION_UPDATE,
                PermissionName.PERMISSION_DELETE,
                PermissionName.PERMISSION_CREATE,
            ],
        });

        const toast = useToast();

        const translationsDefault = useTranslations([
            {
                namespace: TranslatorTranslationNamespace.COMMON, 
                key: TranslatorTranslationCommonKey.OVERVIEW, 
                as: 'overview', 
            },
            {
                namespace: TranslatorTranslationNamespace.ACTION, 
                key: TranslatorTranslationActionKey.ADD, 
                as: 'add', 
            },
            {
                namespace: TranslatorTranslationNamespace.ENTITY, 
                key: TranslatorTranslationEntityKey.PERMISSION, 
                count: 1, 
                as: 'permission', 
            },
        ]);

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
                url: '/permissions',
            },
            {
                name: translationsDefault.add,
                icon: 'fa6-solid:plus',
                url: '/permissions/add',
            },
        ]);

        const handleDeleted = async (e: Permission) => {
            if (toast) {
                toast.show({
                    variant: 'success',
                    body: await translate({
                        namespace: TranslatorTranslationNamespace.APP,
                        key: TranslatorTranslationAppKey.ENTITY_DELETED,
                        data: { entity: translationsDefault.permission, name: e.name },
                    }),
                });
            }
        };

        const handleFailed = (e: Error) => {
            if (toast) {
                toast.show({
                    variant: 'warning',
                    body: e.message,
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
            /> {{ translationsDefault.permission }}
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

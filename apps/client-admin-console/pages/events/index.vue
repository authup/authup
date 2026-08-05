<script lang="ts">

import { PermissionName } from '@authup/core-kit';
import {
    TranslatorTranslationAppKey,
    TranslatorTranslationCommonKey,
    TranslatorTranslationEntityKey,
    TranslatorTranslationNamespace,
} from '@authup/i18n';
import { useTranslations, useTranslationsForNamespace } from '@authup/client-web-kit';
import { VCIcon } from '@vuecs/icon';
import { defineNuxtComponent } from '#app';
import {
    computed,
    definePageMeta,
    useErrorToast,
} from '#imports';
import { LayoutKey } from '../../config/layout';

export default defineNuxtComponent({
    components: { VCIcon },
    setup() {
        definePageMeta({
            [LayoutKey.REQUIRED_LOGGED_IN]: true,
            [LayoutKey.REQUIRED_PERMISSIONS]: [
                PermissionName.EVENT_READ,
            ],
        });

        const errorToast = useErrorToast();
        const handleFailed = (e: Error) => errorToast.show(e);

        const translationsDefault = useTranslations([
            {
                namespace: TranslatorTranslationNamespace.COMMON,
                key: TranslatorTranslationCommonKey.OVERVIEW,
            },
            {
                namespace: TranslatorTranslationNamespace.ENTITY,
                key: TranslatorTranslationEntityKey.EVENT,
                count: 2,
            },
        ]);

        const translationsApp = useTranslationsForNamespace(
            TranslatorTranslationNamespace.APP,
            [
                { key: TranslatorTranslationAppKey.MANAGEMENT },
            ],
        );

        const items = computed(() => [
            {
                name: translationsDefault.overview,
                icon: 'fa6-solid:bars',
                url: '/events',
            },
        ]);

        return {
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
                name="fa6-solid:clipboard-list"
                class="me-1"
            /> {{ translationsDefault.event }}
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
                    @failed="handleFailed"
                />
            </div>
        </div>
    </div>
</template>

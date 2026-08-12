<script lang="ts">
import { PermissionName } from '@authup/core-kit';
import {
    TranslatorTranslationAppKey,
    TranslatorTranslationEntityKey,
    TranslatorTranslationNamespace,
} from '@authup/i18n';
import { useTranslations, useTranslationsForNamespace } from '@authup/client-web-kit';
import { VCIcon } from '@vuecs/icon';
import { VCBreadcrumb } from '@vuecs/navigation';
import { defineNuxtComponent } from '#app';
import {
    definePageMeta,
    useErrorToast,
    useSectionBreadcrumb,
} from '#imports';
import { LayoutKey, LayoutSection } from '../../config/layout';

export default defineNuxtComponent({
    components: { VCBreadcrumb, VCIcon },
    setup() {
        definePageMeta({
            [LayoutKey.REQUIRED_LOGGED_IN]: true,
            [LayoutKey.REQUIRED_PERMISSIONS]: [
                PermissionName.EVENT_READ,
            ],
        });

        const breadcrumbItems = useSectionBreadcrumb(LayoutSection.EVENTS);

        const errorToast = useErrorToast();
        const handleFailed = (e: Error) => errorToast.show(e);

        const translationsDefault = useTranslations([
            {
                namespace: TranslatorTranslationNamespace.ENTITY,
                key: TranslatorTranslationEntityKey.EVENT,
                count: 2,
            },
        ]);

        const translationsApp = useTranslationsForNamespace(
            TranslatorTranslationNamespace.APP,
            [
                { key: TranslatorTranslationAppKey.EVENT_DESCRIPTION },
            ],
        );

        return {
            breadcrumbItems,
            handleFailed,
            translationsDefault,
            translationsApp,
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
                    name="fa6-solid:clipboard-list"
                    class="me-1"
                /> {{ translationsDefault.event }}
            </h1>
            <p class="sub-title">
                {{ translationsApp.eventDescription }}
            </p>
        </div>
        <NuxtPage
            @failed="handleFailed"
        />
    </div>
</template>

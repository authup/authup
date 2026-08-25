<script lang="ts">
import {
    TranslatorTranslationAppKey,
    TranslatorTranslationEntityKey,
    TranslatorTranslationNamespace,
} from '@authup/i18n';
import { useTranslations, useTranslationsForNamespace } from '@authup/client-web-kit';
import { VCIcon } from '@vuecs/icon';
import { VCBreadcrumb } from '@vuecs/navigation';
import { LayoutSection } from '../../config/layout';
import { defineComponent } from 'vue';
import { useSectionBreadcrumb } from '../../composables/breadcrumb';
import { useErrorToast } from '../../composables/error';

export default defineComponent({
    components: { VCBreadcrumb, VCIcon },
    setup() {
        const breadcrumbItems = useSectionBreadcrumb(LayoutSection.SESSIONS);

        const errorToast = useErrorToast();
        const handleFailed = (e: Error) => errorToast.show(e);

        const translationsDefault = useTranslations([
            {
                namespace: TranslatorTranslationNamespace.ENTITY,
                key: TranslatorTranslationEntityKey.SESSION,
                count: 2,
            },
        ]);

        const translationsApp = useTranslationsForNamespace(
            TranslatorTranslationNamespace.APP,
            [
                { key: TranslatorTranslationAppKey.SESSION_DESCRIPTION },
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
                    name="fa6-solid:desktop"
                    class="me-1"
                /> {{ translationsDefault.session }}
            </h1>
            <p class="sub-title">
                {{ translationsApp.sessionDescription }}
            </p>
        </div>
        <RouterView
            @failed="handleFailed"
        />
    </div>
</template>

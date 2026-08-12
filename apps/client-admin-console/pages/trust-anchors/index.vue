<script lang="ts">
import type { TrustAnchor } from '@authup/core-kit';
import { PermissionName } from '@authup/core-kit';
import {
    TranslatorTranslationAppKey,
    TranslatorTranslationEntityKey,
    TranslatorTranslationNamespace,
} from '@authup/i18n';
import {
    AContentAction,
    usePermissionCheck,
    useTranslations,
    useTranslationsForNamespace,
    useTranslator,
} from '@authup/client-web-kit';
import { VCIcon } from '@vuecs/icon';
import { VCBreadcrumb } from '@vuecs/navigation';
import { defineNuxtComponent } from '#app';
import {
    definePageMeta,
    useErrorToast,
    useSectionBreadcrumb,
    useToast,
} from '#imports';
import { LayoutKey, LayoutSection, buildSectionURLs } from '../../config/layout';

export default defineNuxtComponent({
    components: {
        AContentAction,
        VCBreadcrumb,
        VCIcon,
    },
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

        const breadcrumbItems = useSectionBreadcrumb(LayoutSection.TRUST_ANCHORS, { add: true });
        const sectionUrls = buildSectionURLs(LayoutSection.TRUST_ANCHORS);

        const toast = useToast();
        const errorToast = useErrorToast();
        const handleFailed = (e: Error) => errorToast.show(e);

        // Trust anchors are administered under the KEY_* family (see
        // architecture.md → Realm Key Store, plan 071 Stage C).
        const hasAddPermission = usePermissionCheck({ name: PermissionName.KEY_CREATE });

        const translationsDefault = useTranslations([
            {
                namespace: TranslatorTranslationNamespace.ENTITY,
                key: TranslatorTranslationEntityKey.TRUST_ANCHOR,
                count: 2,
            },
        ]);

        const translationsApp = useTranslationsForNamespace(
            TranslatorTranslationNamespace.APP,
            [
                { key: TranslatorTranslationAppKey.TRUST_ANCHOR_DESCRIPTION },
            ],
        );

        const translate = useTranslator();

        const handleDeleted = async (e: TrustAnchor) => {
            if (toast) {
                toast.show({
                    variant: 'success',
                    body: await translate({
                        namespace: TranslatorTranslationNamespace.APP,
                        key: TranslatorTranslationAppKey.ENTITY_DELETED,
                        data: {
                            entity: await translate({
                                namespace: TranslatorTranslationNamespace.ENTITY,
                                key: TranslatorTranslationEntityKey.TRUST_ANCHOR,
                                count: 1,
                            }),
                            name: e.name,
                        },
                    }),
                });
            }
        };

        return {
            sectionUrls,
            breadcrumbItems,
            handleDeleted,
            handleFailed,
            hasAddPermission,
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
        <div class="mb-3 flex flex-wrap items-start justify-between gap-3">
            <div>
                <h1 class="title no-border mb-0">
                    <VCIcon
                        name="fa6-solid:certificate"
                        class="me-1"
                    /> {{ translationsDefault.trustAnchor }}
                </h1>
                <p class="sub-title">
                    {{ translationsApp.trustAnchorDescription }}
                </p>
            </div>
            <AContentAction
                :overview-url="sectionUrls.overviewUrl"
                :add-url="sectionUrls.addUrl"
                :add-disabled="!hasAddPermission"
            />
        </div>
        <NuxtPage
            @deleted="handleDeleted"
            @failed="handleFailed"
        />
    </div>
</template>

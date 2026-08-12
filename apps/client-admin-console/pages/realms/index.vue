<script lang="ts">
import type { Realm } from '@authup/core-kit';
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
                PermissionName.REALM_READ,
                PermissionName.REALM_UPDATE,
                PermissionName.REALM_DELETE,
                PermissionName.REALM_CREATE,
            ],
        });

        const breadcrumbItems = useSectionBreadcrumb(LayoutSection.REALMS, { add: true });
        const sectionUrls = buildSectionURLs(LayoutSection.REALMS);

        const toast = useToast();
        const errorToast = useErrorToast();
        const handleFailed = (e: Error) => errorToast.show(e);

        const hasAddPermission = usePermissionCheck({ name: PermissionName.REALM_CREATE });

        const translationsDefault = useTranslations(
            [
                {
                    namespace: TranslatorTranslationNamespace.ENTITY,
                    key: TranslatorTranslationEntityKey.REALM,
                    count: 2,
                },
            ],
        );

        const translationsApp = useTranslationsForNamespace(
            TranslatorTranslationNamespace.APP,
            [
                { key: TranslatorTranslationAppKey.REALM_DESCRIPTION },
            ],
        );

        const translate = useTranslator();

        const handleDeleted = async (e: Realm) => {
            toast.show({
                variant: 'success',
                body: await translate({
                    namespace: TranslatorTranslationNamespace.APP,
                    key: TranslatorTranslationAppKey.ENTITY_DELETED,
                    data: {
                        entity: await translate({
                            namespace: TranslatorTranslationNamespace.ENTITY,
                            key: TranslatorTranslationEntityKey.REALM,
                            count: 1,
                        }),
                        name: e.name,
                    },
                }),
            });
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
                        name="fa6-solid:building"
                        class="me-1"
                    /> {{ translationsDefault.realm }}
                </h1>
                <p class="sub-title">
                    {{ translationsApp.realmDescription }}
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

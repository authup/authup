<script lang="ts">
import type { Policy } from '@authup/core-kit';
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
import { LayoutSection, buildSectionURLs } from '../../config/layout';
import { defineComponent } from 'vue';
import { useSectionBreadcrumb } from '../../composables/breadcrumb';
import { useErrorToast } from '../../composables/error';
import { useToast } from '../../composables/toast';

export default defineComponent({
    components: {
        AContentAction,
        VCBreadcrumb,
        VCIcon,
    },
    setup() {
        const breadcrumbItems = useSectionBreadcrumb(LayoutSection.POLICIES, { add: true });
        const sectionUrls = buildSectionURLs(LayoutSection.POLICIES);

        const toast = useToast();
        const errorToast = useErrorToast();
        const handleFailed = (e: Error) => errorToast.show(e);

        // Policies are administered under the permission domain, so their
        // create gate is PERMISSION_CREATE (see PolicyService.save).
        const hasAddPermission = usePermissionCheck({ name: PermissionName.PERMISSION_CREATE });

        const translationsDefault = useTranslations([
            {
                namespace: TranslatorTranslationNamespace.ENTITY,
                key: TranslatorTranslationEntityKey.POLICY,
                count: 2,
            },
        ]);

        const translationsApp = useTranslationsForNamespace(
            TranslatorTranslationNamespace.APP,
            [
                { key: TranslatorTranslationAppKey.POLICY_DESCRIPTION },
            ],
        );

        const translate = useTranslator();

        const handleDeleted = async (e: Policy) => {
            if (toast) {
                toast.show({
                    variant: 'success',
                    body: await translate({
                        namespace: TranslatorTranslationNamespace.APP,
                        key: TranslatorTranslationAppKey.ENTITY_DELETED,
                        data: {
                            entity: await translate({
                                namespace: TranslatorTranslationNamespace.ENTITY,
                                key: TranslatorTranslationEntityKey.POLICY,
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
                        name="fa6-solid:scale-balanced"
                        class="me-1"
                    /> {{ translationsDefault.policy }}
                </h1>
                <p class="sub-title">
                    {{ translationsApp.policyDescription }}
                </p>
            </div>
            <AContentAction
                :overview-url="sectionUrls.overviewUrl"
                :add-url="sectionUrls.addUrl"
                :add-disabled="!hasAddPermission"
            />
        </div>
        <RouterView
            @deleted="handleDeleted"
            @failed="handleFailed"
        />
    </div>
</template>

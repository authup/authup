<script lang="ts">
import {
    AEntityDelete,
    APagination,
    ASearch,
    ATitle,
    ATrustAnchors,
    injectStore,
    usePermissionCheck,
    useTranslations,
} from '@authup/client-web-kit';
import { defineQuery } from '@rapiq/core';
import type { TrustAnchor } from '@authup/core-kit';
import { PermissionName } from '@authup/core-kit';
import {
    TranslatorTranslationAppKey,
    TranslatorTranslationCommonKey,
    TranslatorTranslationFieldKey,
    TranslatorTranslationNamespace,
} from '@authup/i18n';
import { VCButton } from '@vuecs/button';
import { VCIcon } from '@vuecs/icon';
import { VCLink } from '@vuecs/link';
import type { TableColumn } from '@vuecs/table';
import { VCTimeago } from '@vuecs/timeago';
import { storeToRefs } from 'pinia';
import { computed, defineComponent } from 'vue';

// VCTable deliberately stays globally registered; see structure.md → Table usage.
export default defineComponent({
    components: {
        AEntityDelete,
        APagination,
        ASearch,
        ATitle,
        ATrustAnchors,
        VCButton,
        VCIcon,
        VCTimeago,
    },
    emits: ['deleted', 'failed'],
    setup(_props, { emit }) {
        const store = injectStore();
        const { realmManagementId } = storeToRefs(store);
        const query = defineQuery<TrustAnchor>({ filters: { realmId: [realmManagementId.value ?? null, null] } });

        const hasEditPermission = usePermissionCheck({ name: PermissionName.KEY_UPDATE });
        const hasDropPermission = usePermissionCheck({ name: PermissionName.KEY_DELETE });
        const translations = useTranslations([
            {
                namespace: TranslatorTranslationNamespace.FIELD,
                key: TranslatorTranslationFieldKey.NAME,
            },
            {
                namespace: TranslatorTranslationNamespace.FIELD,
                key: TranslatorTranslationFieldKey.ENABLED,
            },
            {
                namespace: TranslatorTranslationNamespace.FIELD,
                key: TranslatorTranslationFieldKey.CREATED_AT,
            },
            {
                namespace: TranslatorTranslationNamespace.APP,
                key: TranslatorTranslationAppKey.DETAILS,
            },
            {
                namespace: TranslatorTranslationNamespace.COMMON,
                key: TranslatorTranslationCommonKey.ACTIVE,
            },
            {
                namespace: TranslatorTranslationNamespace.COMMON,
                key: TranslatorTranslationCommonKey.INACTIVE,
            },
        ]);

        const columns = computed<TableColumn<TrustAnchor>[]>(() => [
            {
                key: 'name',
                label: translations.name,
                headerClass: 'text-left',
                cellClass: 'text-left',
            },
            {
                key: 'enabled',
                label: translations.enabled,
                headerClass: 'text-center',
                cellClass: 'text-center',
            },
            {
                key: 'createdAt',
                label: translations.createdAt,
                headerClass: 'text-center',
                cellClass: 'text-center',
            },
            {
                key: 'options',
                label: '',
                cellClass: 'text-center',
            },
        ]);

        return {
            columns,
            handleDeleted: (entity: TrustAnchor) => emit('deleted', entity),
            handleFailed: (e: Error) => emit('failed', e),
            hasDropPermission,
            hasEditPermission,
            query,
            translations,
            VCLink,
        };
    },
});
</script>

<template>
    <ATrustAnchors
        :query="query"
        @deleted="handleDeleted"
    >
        <template #header="props">
            <ATitle />
            <ASearch
                :load="props.load"
                :busy="props.busy"
            />
        </template>
        <template #footer="props">
            <APagination
                :busy="props.busy"
                :meta="props.meta"
                :load="props.load"
            />
        </template>
        <template #body="props">
            <VCTable
                :data="props.data"
                :columns="columns"
                :busy="props.busy"
            >
                <template #cell-enabled="{ row }">
                    <span :class="row.enabled ? 'text-success' : 'text-muted'">
                        {{ row.enabled ? translations.active : translations.inactive }}
                    </span>
                </template>
                <template #cell-createdAt="{ row }">
                    <VCTimeago :datetime="row.createdAt" />
                </template>
                <template #cell-options="{ row }">
                    <VCButton
                        :as="VCLink"
                        :to="hasEditPermission ? `/trust-anchors/${row.id}` : undefined"
                        :aria-label="translations.details"
                        :title="translations.details"
                        size="sm"
                        color="primary"
                        variant="outline"
                        class="me-1"
                        :disabled="!hasEditPermission"
                    >
                        <template #leading>
                            <VCIcon name="fa6-solid:bars" />
                        </template>
                    </VCButton>
                    <AEntityDelete
                        :entity-id="row.id"
                        entity-type="trustAnchor"
                        :with-text="false"
                        :disabled="!hasDropPermission"
                        @deleted="props.deleted"
                        @failed="handleFailed"
                    />
                </template>
            </VCTable>
        </template>
    </ATrustAnchors>
</template>

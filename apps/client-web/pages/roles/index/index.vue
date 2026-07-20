<script lang="ts">

import { defineQuery } from '@rapiq/core';
import type { Role } from '@authup/core-kit';
import { PermissionName } from '@authup/core-kit';
import {
    TranslatorTranslationAppKey,
    TranslatorTranslationCommonKey,
    TranslatorTranslationFieldKey,
    TranslatorTranslationNamespace,
} from '@authup/i18n';
import {
    AEntityDelete,
    APagination,
    ARoles,
    ASearch,
    ATitle,
    injectStore,
    usePermissionCheck,
    useTranslations,
} from '@authup/client-web-kit';
import { storeToRefs } from 'pinia';
import { VCButton } from '@vuecs/button';
import { VCIcon } from '@vuecs/icon';
import type { TableColumn } from '@vuecs/table';
import { computed, defineComponent, resolveComponent } from 'vue';

export default defineComponent({
    components: {
        ATitle,
        APagination,
        ASearch,
        ARoles,
        AEntityDelete,
        VCButton,
        VCIcon,
    },
    emits: ['deleted'],
    setup(_props, { emit }) {
        const handleDeleted = (e: Role) => {
            emit('deleted', e);
        };

        const store = injectStore();
        const { realmManagementId } = storeToRefs(store);

        const query = defineQuery<Role>({ filters: { realmId: [realmManagementId.value ?? null, null] } });

        const hasEditPermission = usePermissionCheck({ name: PermissionName.ROLE_UPDATE });
        const hasDropPermission = usePermissionCheck({ name: PermissionName.ROLE_DELETE });

        const translations = useTranslations([
            {
                namespace: TranslatorTranslationNamespace.FIELD,
                key: TranslatorTranslationFieldKey.NAME,
            },
            {
                namespace: TranslatorTranslationNamespace.COMMON,
                key: TranslatorTranslationCommonKey.BUILT_IN,
            },
            {
                namespace: TranslatorTranslationNamespace.COMMON,
                key: TranslatorTranslationCommonKey.GLOBAL,
            },
            {
                namespace: TranslatorTranslationNamespace.FIELD,
                key: TranslatorTranslationFieldKey.CREATED_AT,
            },
            {
                namespace: TranslatorTranslationNamespace.FIELD,
                key: TranslatorTranslationFieldKey.UPDATED_AT,
            },
            {
                namespace: TranslatorTranslationNamespace.APP,
                key: TranslatorTranslationAppKey.DETAILS,
            },
        ]);

        const columns = computed<TableColumn<Role>[]>(() => [
            {
                key: 'name',
                label: translations.name,
                headerClass: 'text-left',
                cellClass: 'text-left',
            },
            {
                key: 'builtIn',
                label: translations.builtIn,
                headerClass: 'text-center',
                cellClass: 'text-center',
            },
            {
                key: 'global',
                label: translations.global,
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
                key: 'updatedAt',
                label: translations.updatedAt,
                headerClass: 'text-center',
                cellClass: 'text-center',
            },
            {
                key: 'options',
                label: '',
                cellClass: 'text-center',
            },
        ]);

        const NuxtLink = resolveComponent('NuxtLink');

        return {
            columns,
            hasEditPermission,
            hasDropPermission,
            handleDeleted,
            query,
            translations,
            NuxtLink,
        };
    },
});
</script>
<template>
    <ARoles
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
                <template #cell-builtIn="{ row }">
                    <VCIcon
                        :name="row.builtIn ? 'fa6-solid:check' : 'fa6-solid:xmark'"
                        :class="row.builtIn ? 'text-success-600' : 'text-error-600'"
                    />
                </template>
                <template #cell-global="{ row }">
                    <VCIcon
                        :name="!row.realmId ? 'fa6-solid:check' : 'fa6-solid:xmark'"
                        :class="!row.realmId ? 'text-success-600' : 'text-error-600'"
                    />
                </template>
                <template #cell-createdAt="{ row }">
                    <VCTimeago :datetime="row.createdAt" />
                </template>
                <template #cell-updatedAt="{ row }">
                    <VCTimeago :datetime="row.updatedAt" />
                </template>
                <template #cell-options="{ row }">
                    <VCButton
                        :as="NuxtLink"
                        :to="'/roles/'+ row.id"
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
                        entity-type="role"
                        :with-text="false"
                        :disabled="!hasDropPermission"
                        @deleted="props.deleted"
                    />
                </template>
            </VCTable>
        </template>
    </ARoles>
</template>

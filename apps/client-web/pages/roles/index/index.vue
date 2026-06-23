<script lang="ts">

import type { Role } from '@authup/core-kit';
import { PermissionName } from '@authup/core-kit';
import { TranslatorTranslationCommonKey, TranslatorTranslationFieldKey, TranslatorTranslationNamespace } from '@authup/i18n';
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
import type { BuildInput } from 'rapiq';
import type { TableColumn } from '@vuecs/table';
import { computed, defineComponent, resolveComponent } from 'vue';

export default defineComponent({
    components: {
        ATitle,
        APagination,
        ASearch,
        ARoles,
        AEntityDelete,
    },
    emits: ['deleted'],
    setup(_props, { emit }) {
        const handleDeleted = (e: Role) => {
            emit('deleted', e);
        };

        const store = injectStore();
        const { realmManagementId } = storeToRefs(store);

        const query : BuildInput<Role> = { filter: { realm_id: [realmManagementId.value ?? null, null] } };

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
        ]);

        const columns = computed<TableColumn[]>(() => [
            {
                key: 'name',
                label: translations.name,
                headerClass: 'text-left',
                cellClass: 'text-left',
            },
            {
                key: 'built_in',
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
                key: 'created_at',
                label: translations.createdAt,
                headerClass: 'text-center',
                cellClass: 'text-center',
            },
            {
                key: 'updated_at',
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

        // Workaround for tada5hi/vuecs#1649: @vuecs/button 1.1.0 narrows VCButton's
        // `$props.as` to `string` (its `Defaults` param), so vue-tsc rejects a
        // component here though NuxtLink renders fine. Drop the cast when fixed.
        const NuxtLink = resolveComponent('NuxtLink') as string;

        return {
            columns,
            hasEditPermission,
            hasDropPermission,
            handleDeleted,
            query,
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
                <template #cell-built_in="{ row }: { row: any }">
                    <VCIcon
                        :name="row.built_in ? 'fa6-solid:check' : 'fa6-solid:xmark'"
                        :class="row.built_in ? 'text-success-600' : 'text-error-600'"
                    />
                </template>
                <template #cell-global="{ row }: { row: any }">
                    <VCIcon
                        :name="!row.realm_id ? 'fa6-solid:check' : 'fa6-solid:xmark'"
                        :class="!row.realm_id ? 'text-success-600' : 'text-error-600'"
                    />
                </template>
                <template #cell-created_at="{ row }: { row: any }">
                    <VCTimeago :datetime="row.created_at" />
                </template>
                <template #cell-updated_at="{ row }: { row: any }">
                    <VCTimeago :datetime="row.updated_at" />
                </template>
                <template #cell-options="{ row }: { row: any }">
                    <VCButton
                        :as="NuxtLink"
                        :to="'/roles/'+ row.id"
                        size="sm"
                        color="primary"
                        variant="outline"
                        class="me-1"
                        :disabled="!hasEditPermission"
                    >
                        <VCIcon name="fa6-solid:bars" />
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

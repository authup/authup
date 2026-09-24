<script lang="ts">
import { defineQuery } from '@rapiq/core';
import { VCButton } from '@vuecs/button';
import { VCIcon } from '@vuecs/icon';
import { VCLink } from '@vuecs/link';
import { VCTimeago } from '@vuecs/timeago';
import {
    AEntityDelete,
    APagination,
    APermissions,
    ASearch,
    ATitle,
    injectHTTPClient,
    injectStore,
    useEntityNameTranslator,
    usePermissionCheck,
    useTranslations,
} from '@authup/client-web-kit';
import type { Permission } from '@authup/core-kit';
import { EntityType, PermissionName } from '@authup/core-kit';
import { TranslatorTranslationAppKey, TranslatorTranslationNamespace } from '@authup/i18n';
import { storeToRefs } from 'pinia';
import type { TableColumn } from '@vuecs/table';
import { defineComponent } from 'vue';
import EntityActivity from '../../../components/stats/EntityActivity.vue';
import type { EntityStatsLoadFn } from '../../../composables/entity-stats';

export default defineComponent({
    components: {
        EntityActivity,
        ATitle,
        APagination,
        ASearch,
        AEntityDelete,
        APermissions,
        VCTimeago,
        VCButton,
        VCIcon,
    },
    emits: ['deleted'],
    setup(_props, { emit }) {
        const handleDeleted = (e: Permission) => {
            emit('deleted', e);
        };

        const store = injectStore();
        const { realmManagementId } = storeToRefs(store);

        const query = defineQuery<Permission>({ filters: { realmId: [realmManagementId.value ?? null, null] } });

        const httpClient = injectHTTPClient();
        const loadStats : EntityStatsLoadFn = (input) => httpClient.permission.getStats(input);

        const hasEditPermission = usePermissionCheck({ name: PermissionName.PERMISSION_UPDATE });
        const hasDropPermission = usePermissionCheck({ name: PermissionName.PERMISSION_DELETE });

        const translateEntityName = useEntityNameTranslator();
        const displayName = (row: Permission) => translateEntityName(EntityType.PERMISSION, row.name);

        const translations = useTranslations([
            {
                namespace: TranslatorTranslationNamespace.APP,
                key: TranslatorTranslationAppKey.DETAILS,
            },
        ]);

        const columns: TableColumn<Permission>[] = [
            {
                key: 'name',
                label: 'Name',
                headerClass: 'text-left',
                cellClass: 'text-left',
            },
            {
                key: 'builtIn',
                label: 'Built in?',
                headerClass: 'text-center',
                cellClass: 'text-center',
            },
            {
                key: 'global',
                label: 'Global?',
                headerClass: 'text-center',
                cellClass: 'text-center',
            },
            {
                key: 'createdAt',
                label: 'Created at',
                headerClass: 'text-center',
                cellClass: 'text-center',
            },
            {
                key: 'updatedAt',
                label: 'Updated at',
                headerClass: 'text-center',
                cellClass: 'text-center',
            },
            {
                key: 'options',
                label: '',
                cellClass: 'text-center',
            },
        ];

        return {
            columns,
            displayName,
            hasEditPermission,
            hasDropPermission,
            handleDeleted,
            loadStats,
            query,
            translations,
            VCLink,
        };
    },
});
</script>
<template>
    <APermissions
        :query="query"
        @deleted="handleDeleted"
    >
        <template #header="props">
            <EntityActivity
                type="permission"
                :load="loadStats"
            />
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
                <template #cell-name="{ row }">
                    {{ displayName(row) }}
                    <small
                        v-if="displayName(row) !== row.name"
                        class="block text-fg-muted"
                    >{{ row.name }}</small>
                </template>
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
                        :as="VCLink"
                        :to="hasEditPermission ? `/permissions/${row.id}` : undefined"
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
                        entity-type="permission"
                        :with-text="false"
                        :disabled="row.builtIn || !hasDropPermission"
                        @deleted="props.deleted"
                    />
                </template>
            </VCTable>
        </template>
    </APermissions>
</template>

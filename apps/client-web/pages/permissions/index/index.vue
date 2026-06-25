<script lang="ts">
import { VCButton } from '@vuecs/button';
import { VCIcon } from '@vuecs/icon';
import { VCTimeago } from '@vuecs/timeago';
import {
    AEntityDelete,
    APagination,
    APermissions,
    ASearch,
    ATitle,
    injectStore,
    usePermissionCheck,
} from '@authup/client-web-kit';
import type { Permission } from '@authup/core-kit';
import { PermissionName } from '@authup/core-kit';
import { storeToRefs } from 'pinia';
import type { BuildInput } from 'rapiq';
import type { TableColumn } from '@vuecs/table';
import { defineComponent, resolveComponent } from 'vue';

export default defineComponent({
    components: {
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

        const query : BuildInput<Permission> = { filters: { realm_id: [realmManagementId.value ?? null, null] } };

        const hasEditPermission = usePermissionCheck({ name: PermissionName.PERMISSION_UPDATE });
        const hasDropPermission = usePermissionCheck({ name: PermissionName.PERMISSION_DELETE });

        const columns: TableColumn<Permission>[] = [
            {
                key: 'name',
                label: 'Name',
                headerClass: 'text-left',
                cellClass: 'text-left',
            },
            {
                key: 'built_in',
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
                key: 'created_at',
                label: 'Created at',
                headerClass: 'text-center',
                cellClass: 'text-center',
            },
            {
                key: 'updated_at',
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

        const NuxtLink = resolveComponent('NuxtLink');

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
    <APermissions
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
                <template #cell-built_in="{ row }">
                    <VCIcon
                        :name="row.built_in ? 'fa6-solid:check' : 'fa6-solid:xmark'"
                        :class="row.built_in ? 'text-success-600' : 'text-error-600'"
                    />
                </template>
                <template #cell-global="{ row }">
                    <VCIcon
                        :name="!row.realm_id ? 'fa6-solid:check' : 'fa6-solid:xmark'"
                        :class="!row.realm_id ? 'text-success-600' : 'text-error-600'"
                    />
                </template>
                <template #cell-created_at="{ row }">
                    <VCTimeago :datetime="row.created_at" />
                </template>
                <template #cell-updated_at="{ row }">
                    <VCTimeago :datetime="row.updated_at" />
                </template>
                <template #cell-options="{ row }">
                    <VCButton
                        :as="NuxtLink"
                        :to="'/permissions/'+ row.id"
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
                        :disabled="row.built_in || !hasDropPermission"
                        @deleted="props.deleted"
                    />
                </template>
            </VCTable>
        </template>
    </APermissions>
</template>

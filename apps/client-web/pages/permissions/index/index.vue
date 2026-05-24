<script lang="ts">
import { VCTimeago } from '@vuecs/timeago';
import {
    AEntityDelete,
    APagination,
    APermissions,
    ASearch,
    ATable,
    ATitle,
    injectStore,
    usePermissionCheck,
} from '@authup/client-web-kit';
import type { Permission } from '@authup/core-kit';
import { PermissionName } from '@authup/core-kit';
import { storeToRefs } from 'pinia';
import type { BuildInput } from 'rapiq';
import type { TableColumn } from '@vuecs/table';
import { defineComponent } from 'vue';

export default defineComponent({
    components: {
        ATable,
        ATitle,
        APagination,
        ASearch,
        AEntityDelete,
        APermissions,
        VCTimeago,
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

        const fields: TableColumn<Permission>[] = [
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

        return {
            fields,
            hasEditPermission,
            hasDropPermission,
            handleDeleted,
            query,
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
            <ATable
                :items="props.data"
                :fields="fields"
                :busy="props.busy"
                bordered
            >
                <template #cell-built_in="{ row }">
                    <i
                        class="fas"
                        :class="{
                            'fa-check text-success-600': row.built_in,
                            'fa-times text-error-600': !row.built_in,
                        }"
                    />
                </template>
                <template #cell-global="{ row }">
                    <i
                        class="fas"
                        :class="{
                            'fa-check text-success-600': !row.realm_id,
                            'fa-times text-error-600': row.realm_id,
                        }"
                    />
                </template>
                <template #cell-created_at="{ row }">
                    <VCTimeago :datetime="row.created_at" />
                </template>
                <template #cell-updated_at="{ row }">
                    <VCTimeago :datetime="row.updated_at" />
                </template>
                <template #cell-options="{ row }">
                    <NuxtLink
                        :to="'/permissions/'+ row.id"
                        class="btn btn-xs btn-outline-primary me-1"
                        :disabled="!hasEditPermission"
                    >
                        <i class="fa-solid fa-bars" />
                    </NuxtLink>
                    <AEntityDelete
                        class="btn btn-xs btn-outline-danger"
                        :entity-id="row.id"
                        entity-type="permission"
                        :with-text="false"
                        :disabled="row.built_in || !hasDropPermission"
                        @deleted="props.deleted"
                    />
                </template>
            </ATable>
        </template>
    </APermissions>
</template>

<script lang="ts">

import { storeToRefs } from 'pinia';
import type { Client } from '@authup/core-kit';
import { PermissionName } from '@authup/core-kit';
import {
    AClients,
    AEntityDelete,
    APagination,
    ASearch,
    ATable,
    ATitle,
    injectStore,
    usePermissionCheck,
} from '@authup/client-web-kit';
import type { BuildInput } from 'rapiq';
import type { TableColumn } from '@vuecs/table';
import { defineComponent } from 'vue';

export default defineComponent({
    components: {
        ATable,
        APagination,
        ASearch,
        ATitle,
        AEntityDelete,
        AClients,
    },
    emits: ['deleted'],
    setup(_props, { emit }) {
        const handleDeleted = (e: Client) => {
            emit('deleted', e);
        };

        const store = injectStore();
        const { realmManagementId } = storeToRefs(store);

        const query : BuildInput<Client> = { filters: { realm_id: [realmManagementId.value ?? null, null] } };

        const hasEditPermission = usePermissionCheck({ name: PermissionName.CLIENT_UPDATE });
        const hasDropPermission = usePermissionCheck({ name: PermissionName.CLIENT_DELETE });

        const fields: TableColumn<Client>[] = [
            {
                key: 'name',
                label: 'Name',
                headerClass: 'text-left',
                cellClass: 'text-left',
            },
            {
                key: 'active',
                label: 'Active?',
                headerClass: 'text-center',
                cellClass: 'text-center',
            },
            {
                key: 'is_confidential',
                label: 'Confidential?',
                headerClass: 'text-center',
                cellClass: 'text-center',
            },
            {
                key: 'built_in',
                label: 'Built in?',
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
    <AClients
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
                <template #cell-active="{ row }">
                    <i
                        :class="{
                            'fa fa-times text-danger': !row.active,
                            'fa fa-check text-success': row.active,
                        }"
                    />
                </template>
                <template #cell-is_confidential="{ row }">
                    <i
                        :class="{
                            'fa fa-times text-danger': !row.is_confidential,
                            'fa fa-check text-success': row.is_confidential,
                        }"
                    />
                </template>
                <template #cell-built_in="{ row }">
                    <i
                        :class="{
                            'fa fa-times text-danger': !row.built_in,
                            'fa fa-check text-success': row.built_in,
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
                        :to="'/clients/'+ row.id"
                        class="btn btn-xs btn-outline-primary me-1"
                        :disabled="!hasEditPermission"
                    >
                        <i class="fa-solid fa-bars" />
                    </NuxtLink>
                    <AEntityDelete
                        class="btn btn-xs btn-outline-danger"
                        :entity-id="row.id"
                        entity-type="client"
                        :with-text="false"
                        :disabled="!hasDropPermission"
                        @deleted="props.deleted"
                    />
                </template>
            </ATable>
        </template>
    </AClients>
</template>

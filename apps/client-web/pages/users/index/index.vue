<script lang="ts">
import type { User } from '@authup/core-kit';
import { PermissionName } from '@authup/core-kit';
import {
    AEntityDelete,
    APagination,
    ASearch,
    ATable,
    ATitle,
    AUsers,
    injectStore,
    usePermissionCheck,
} from '@authup/client-web-kit';
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
        AUsers,
        AEntityDelete,
    },
    emits: ['deleted'],
    setup(_props, { emit }) {
        const handleDeleted = (e: User) => {
            emit('deleted', e);
        };

        const store = injectStore();
        const { realmManagementId } = storeToRefs(store);

        const query : BuildInput<User> = { filter: { realm_id: [realmManagementId.value ?? null, null] } };

        const hasEditPermission = usePermissionCheck({ name: PermissionName.USER_UPDATE });
        const hasDropPermission = usePermissionCheck({ name: PermissionName.USER_DELETE });

        const fields: TableColumn<User>[] = [
            {
                key: 'name',
                label: 'Name',
                headerClass: 'text-left',
                cellClass: 'text-left',
            },
            {
                key: 'created_at',
                label: 'Created At',
                headerClass: 'text-center',
                cellClass: 'text-center',
            },
            {
                key: 'updated_at',
                label: 'Updated At',
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
    <AUsers
        :query="query"
        :body="{tag: 'div'}"
        :footer="true"
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
                <template #cell-created_at="{ row }">
                    <VCTimeago :datetime="row.created_at" />
                </template>
                <template #cell-updated_at="{ row }">
                    <VCTimeago :datetime="row.updated_at" />
                </template>
                <template #cell-options="{ row }">
                    <NuxtLink
                        :to="'/users/'+ row.id"
                        class="btn btn-xs btn-outline-primary me-1"
                        :disabled="!hasEditPermission"
                    >
                        <i class="fa-solid fa-bars" />
                    </NuxtLink>
                    <AEntityDelete
                        class="btn btn-xs btn-outline-danger"
                        :entity-id="row.id"
                        entity-type="user"
                        :with-text="false"
                        :disabled="!hasDropPermission"
                        @deleted="props.deleted"
                    />
                </template>
            </ATable>
        </template>
    </AUsers>
</template>
